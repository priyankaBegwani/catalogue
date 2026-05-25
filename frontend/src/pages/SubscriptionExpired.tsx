import { useState } from 'react';
import { AlertTriangle, Download, RefreshCw, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBranding } from '../hooks/useBranding';
import { useTenant } from '../contexts/TenantContext';
import { API_URL } from '../config/backend';

type ExportKey = 'designs' | 'parties' | 'transport';

const EXPORTS: { key: ExportKey; label: string; description: string }[] = [
  { key: 'designs', label: 'Catalog / Designs', description: 'All products with colors, pricing and images' },
  { key: 'parties', label: 'Parties', description: 'All customer and party records' },
  { key: 'transport', label: 'Transport', description: 'All transport/courier entries' },
];

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SubscriptionExpired() {
  const branding = useBranding();
  const { subscriptionStatus, daysRemaining, inGracePeriod } = useTenant();
  const [downloading, setDownloading] = useState<ExportKey | null>(null);
  const [errors, setErrors] = useState<Partial<Record<ExportKey, string>>>({});

  const handleExport = async (key: ExportKey) => {
    setDownloading(key);
    setErrors(prev => ({ ...prev, [key]: undefined }));
    try {
      const token = localStorage.getItem('access_token') ?? '';
      const tenantId = sessionStorage.getItem('tenant_id') ?? '';
      const res = await fetch(`${API_URL}/api/export/${key}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
        },
      });
      if (!res.ok) throw new Error('Export failed');
      const json = await res.json();
      downloadJson(json.data, `${key}_export_${new Date().toISOString().slice(0, 10)}.json`);
    } catch {
      setErrors(prev => ({ ...prev, [key]: 'Download failed. Please try again.' }));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={branding.logoUrl} alt={branding.brandName} className="h-16 w-auto" />
        </div>

        {/* Status card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {inGracePeriod ? 'Grace Period Active' : 'Account Frozen'}
              </h1>
              <p className="text-sm text-gray-500 capitalize">{subscriptionStatus?.replace(/_/g, ' ')}</p>
            </div>
          </div>

          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            {inGracePeriod
              ? `Your subscription has ended but your account is in the grace period. Renew now to avoid losing access.`
              : `Your ${subscriptionStatus === 'trial_expired' ? 'trial' : 'subscription'} has expired. Your data is safe — you can export it at any time. Renew to restore full access.`}
          </p>

          <Link
            to="/subscription"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-opacity mb-3"
          >
            <CreditCard className="w-4 h-4" />
            View Subscription Plans
          </Link>

          {branding.whatsappNumber && (
            <a
              href={`https://wa.me/${branding.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi, I'd like to renew my subscription for ${branding.brandName}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors mb-3"
            >
              <RefreshCw className="w-4 h-4" />
              Contact via WhatsApp
            </a>
          )}

          <button
            onClick={() => window.location.reload()}
            className="w-full py-2 px-4 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            I've renewed — refresh status
          </button>
        </div>

        {/* Export section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <h2 className="text-base font-bold text-gray-900 mb-1">Export Your Data</h2>
          <p className="text-sm text-gray-500 mb-5">
            Your data is safe. Download it anytime as JSON.
          </p>

          <div className="space-y-3">
            {EXPORTS.map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{description}</p>
                  {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
                </div>
                <button
                  onClick={() => handleExport(key)}
                  disabled={downloading === key}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  <Download className="w-4 h-4" />
                  {downloading === key ? 'Downloading…' : 'Download'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
