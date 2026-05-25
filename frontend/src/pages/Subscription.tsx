import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, CreditCard, Clock, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useTenant } from '../contexts/TenantContext';
import { API_URL } from '../config/backend';

const PLANS = [
  {
    name: 'Starter',
    description: 'Perfect for small businesses',
    monthly: 999,
    yearly: 9990,
    features: ['Up to 500 products', 'Up to 5 users', 'WhatsApp sharing', 'Basic analytics', 'PDF catalog'],
  },
  {
    name: 'Growth',
    description: 'For growing businesses',
    monthly: 2499,
    yearly: 24990,
    features: ['Up to 2000 products', 'Up to 20 users', 'WhatsApp sharing', 'Advanced analytics', 'PDF catalog', 'AI descriptions', 'Bulk import'],
    highlighted: true,
  },
  {
    name: 'Enterprise',
    description: 'For large operations',
    monthly: 4999,
    yearly: 49990,
    features: ['Unlimited products', 'Unlimited users', 'WhatsApp sharing', 'Advanced analytics', 'PDF catalog', 'AI descriptions', 'Bulk import', 'Custom domain'],
  },
] as const;

type Period = 'monthly' | 'yearly';

type BillingRecord = {
  id: string;
  plan_name: string;
  period: string;
  amount_paise: number;
  status: string;
  created_at: string;
  period_start: string | null;
  period_end: string | null;
};

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function formatAmount(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    trial: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    subscription_grace: 'bg-amber-100 text-amber-700',
    trial_grace: 'bg-amber-100 text-amber-700',
    expired: 'bg-red-100 text-red-700',
    trial_expired: 'bg-red-100 text-red-700',
  };
  const label = status?.replace(/_/g, ' ') ?? '';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {label}
    </span>
  );
}

export function Subscription() {
  const { subscriptionStatus, daysRemaining, inGracePeriod, tenantId } = useTenant();
  const [period, setPeriod] = useState<Period>('monthly');
  const [paying, setPaying] = useState<string | null>(null); // plan name being paid
  const [billingHistory, setBillingHistory] = useState<BillingRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('access_token') ?? '';
    const tid = tenantId ?? sessionStorage.getItem('tenant_id') ?? '';
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(tid ? { 'X-Tenant-ID': tid } : {}),
    };
  }, [tenantId]);

  useEffect(() => {
    fetch(`${API_URL}/api/subscription/billing-history`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(({ data }) => setBillingHistory(data ?? []))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [getAuthHeaders]);

  const handleSubscribe = useCallback(async (planName: string) => {
    setPaying(planName);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        alert('Failed to load payment gateway. Please check your internet connection and try again.');
        return;
      }

      const res = await fetch(`${API_URL}/api/subscription/create-order`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ plan_name: planName, period }),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.message ?? 'Failed to create order');
        return;
      }

      const { order_id, amount, currency, key_id } = json.data;

      const rzp = new window.Razorpay({
        key: key_id,
        amount,
        currency,
        order_id,
        name: 'Subscription',
        description: `${planName} Plan — ${period}`,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch(`${API_URL}/api/subscription/verify`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan_name: planName,
              period,
            }),
          });
          const verifyJson = await verifyRes.json();
          if (verifyJson.success) {
            setSuccessMsg(`${planName} plan activated until ${formatDate(verifyJson.data?.valid_until ?? null)}`);
            // Refresh billing history
            fetch(`${API_URL}/api/subscription/billing-history`, { headers: getAuthHeaders() })
              .then(r => r.json())
              .then(({ data }) => setBillingHistory(data ?? []));
            // Reload page after short delay so TenantContext refreshes subscription state
            setTimeout(() => window.location.reload(), 2500);
          } else {
            alert('Payment verification failed: ' + (verifyJson.message ?? 'Unknown error'));
          }
        },
        modal: { ondismiss: () => setPaying(null) },
        theme: { color: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#1e3473' },
      });

      rzp.open();
    } catch (err) {
      console.error('Payment error:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setPaying(null);
    }
  }, [period, getAuthHeaders]);

  const isActive = subscriptionStatus === 'active';
  const isTrial = subscriptionStatus === 'trial' || subscriptionStatus === 'trial_grace';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your plan and billing</p>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Current status card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              {isActive ? (
                <CheckCircle className="w-5 h-5 text-primary" />
              ) : inGracePeriod ? (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              ) : (
                <Clock className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {isTrial ? 'Free Trial' : isActive ? 'Active Subscription' : 'Account Status'}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={subscriptionStatus ?? 'unknown'} />
                {daysRemaining !== null && daysRemaining > 0 && (
                  <span className="text-xs text-gray-500">{daysRemaining} days remaining</span>
                )}
              </div>
            </div>
          </div>
          {(inGracePeriod || isTrial) && (
            <div className="text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
              {inGracePeriod ? 'Renew now to avoid data loss' : `Trial ends in ${daysRemaining ?? 0} days`}
            </div>
          )}
        </div>
      </div>

      {/* Billing period toggle */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setPeriod('monthly')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${period === 'monthly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setPeriod('yearly')}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${period === 'yearly' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Yearly
            <span className="text-xs font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">Save 17%</span>
          </button>
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map(plan => (
          <div
            key={plan.name}
            className={`relative bg-white rounded-2xl border shadow-sm p-6 flex flex-col ${
              plan.highlighted ? 'border-primary shadow-md ring-1 ring-primary/20' : 'border-gray-100'
            }`}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-white text-xs font-semibold px-3 py-1 rounded-full">Most Popular</span>
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              <p className="text-sm text-gray-500">{plan.description}</p>
            </div>

            <div className="mb-6">
              <span className="text-3xl font-bold text-gray-900">
                ₹{period === 'monthly' ? plan.monthly.toLocaleString('en-IN') : plan.yearly.toLocaleString('en-IN')}
              </span>
              <span className="text-sm text-gray-500 ml-1">/{period === 'monthly' ? 'mo' : 'yr'}</span>
              {period === 'yearly' && (
                <p className="text-xs text-green-600 mt-0.5">₹{plan.monthly.toLocaleString('en-IN')}/mo equivalent</p>
              )}
            </div>

            <ul className="space-y-2 flex-1 mb-6">
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(plan.name)}
              disabled={paying === plan.name}
              className={`w-full py-2.5 px-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${
                plan.highlighted
                  ? 'bg-primary text-white hover:opacity-90'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {paying === plan.name ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  Subscribe
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Billing history */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setHistoryOpen(o => !o)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
        >
          <div>
            <h2 className="text-base font-bold text-gray-900">Billing History</h2>
            <p className="text-sm text-gray-500">Last 12 payments</p>
          </div>
          {historyOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {historyOpen && (
          <div className="border-t border-gray-100">
            {historyLoading ? (
              <div className="p-6 text-center text-sm text-gray-500">Loading…</div>
            ) : billingHistory.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">No billing records yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-6 py-3 text-left">Date</th>
                      <th className="px-6 py-3 text-left">Plan</th>
                      <th className="px-6 py-3 text-left">Period</th>
                      <th className="px-6 py-3 text-left">Amount</th>
                      <th className="px-6 py-3 text-left">Valid Until</th>
                      <th className="px-6 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {billingHistory.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-600">{formatDate(r.created_at)}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{r.plan_name}</td>
                        <td className="px-6 py-4 capitalize text-gray-600">{r.period}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{formatAmount(r.amount_paise)}</td>
                        <td className="px-6 py-4 text-gray-600">{formatDate(r.period_end)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                            r.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Subscription;
