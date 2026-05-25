import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Minus, ChevronRight, Package, Sparkles, Share2, PartyPopper } from 'lucide-react';
import { OnboardingLayout } from '../OnboardingLayout';
import { useOnboarding } from '../OnboardingContext';
import { useBranding } from '../../hooks/useBranding';
import { API_URL } from '../../config/backend';

type Design = { id: string; design_no: string; name: string; price: number };
type Party  = { id: string; name: string };

function authHeaders() {
  const token = localStorage.getItem('access_token') ?? '';
  const tid   = sessionStorage.getItem('tenant_id') ?? '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(tid ? { 'X-Tenant-ID': tid } : {}),
  };
}

type OrderItem = { design: Design; qty: number };

export function Step8FirstOrder() {
  const { completeOnboarding } = useOnboarding();
  const branding = useBranding();

  const [designs,       setDesigns]       = useState<Design[]>([]);
  const [parties,       setParties]       = useState<Party[]>([]);
  const [query,         setQuery]         = useState('');
  const [items,         setItems]         = useState<OrderItem[]>([]);
  const [partyId,       setPartyId]       = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [orderCreated,  setOrderCreated]  = useState(false);
  const [orderId,       setOrderId]       = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/designs?limit=50`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setDesigns(d.designs ?? d.data ?? []))
      .catch(() => {});
    fetch(`${API_URL}/api/parties`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setParties(d.parties ?? d.data ?? []))
      .catch(() => {});
  }, []);

  const filtered = designs.filter(d =>
    !query || d.name.toLowerCase().includes(query.toLowerCase()) || d.design_no.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 12);

  const addItem = (d: Design) => {
    setItems(prev => {
      const existing = prev.find(i => i.design.id === d.id);
      if (existing) return prev.map(i => i.design.id === d.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { design: d, qty: 1 }];
    });
  };

  const changeQty = (id: string, delta: number) => {
    setItems(prev =>
      prev.map(i => i.design.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
        .filter(i => i.qty > 0)
    );
  };

  const total = items.reduce((s, i) => s + i.design.price * i.qty, 0);

  const handleCreate = useCallback(async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      const res  = await fetch(`${API_URL}/api/orders`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify({
          party_id: partyId || null,
          items: items.map(i => ({ design_id: i.design.id, quantity: i.qty, price: i.design.price })),
          notes: 'Created during onboarding',
        }),
      });
      const json = await res.json();
      if (json.success || json.order || json.id) {
        setOrderId(json.order?.id ?? json.id ?? null);
        setOrderCreated(true);
      }
    } catch {
      // fall through — mark as done anyway so onboarding can complete
      setOrderCreated(true);
    } finally {
      setSubmitting(false);
    }
  }, [items, partyId]);

  if (orderCreated) {
    const shareMsg = `Hi! 👋\n\nHere's your order from *${branding.brandName}*:\n\n${items.map(i => `• ${i.design.name} × ${i.qty} — ₹${(i.design.price * i.qty).toLocaleString('en-IN')}`).join('\n')}\n\n*Total: ₹${total.toLocaleString('en-IN')}*\n\nPlease confirm your delivery address. Thank you! 🙏`;

    return (
      <OnboardingLayout title="🎉 First order created!" subtitle="Your business is live.">
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl border border-primary/20 p-8 text-center">
            <PartyPopper className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">You're all set! 🚀</h2>
            <p className="text-sm text-gray-600">
              Onboarding complete. Share your first order via WhatsApp to kick things off.
            </p>
          </div>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareMsg)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-green-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all"
          >
            <Share2 className="w-4 h-4" />
            Share order via WhatsApp
          </a>

          <button
            onClick={completeOnboarding}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Go to Dashboard
          </button>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      title="Create Your First Order"
      subtitle="See how the ordering workflow works. You can skip this and create orders from the main app."
    >
      <div className="space-y-5">
        {/* Product selector */}
        {designs.length > 0 ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search products…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-56 overflow-y-auto">
              {filtered.map(d => {
                const inCart = items.find(i => i.design.id === d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => addItem(d)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      inCart ? 'border-primary bg-primary/5' : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                    }`}
                  >
                    <p className="text-xs font-mono text-gray-400">{d.design_no}</p>
                    <p className="text-sm font-medium text-gray-900 truncate mt-0.5">{d.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">₹{d.price.toLocaleString('en-IN')}</p>
                    {inCart && (
                      <span className="inline-block mt-1 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-full">
                        ×{inCart.qty} added
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-800 flex items-center gap-2">
            <Package className="w-4 h-4 flex-shrink-0" />
            No products yet. Add products first or skip this step.
          </div>
        )}

        {/* Order items */}
        {items.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 text-xs font-semibold text-gray-500 uppercase">
              Order Items
            </div>
            <div className="divide-y divide-gray-50">
              {items.map(item => (
                <div key={item.design.id} className="flex items-center justify-between px-4 py-3 gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.design.name}</p>
                    <p className="text-xs text-gray-400">₹{item.design.price.toLocaleString('en-IN')} each</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => changeQty(item.design.id, -1)}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-semibold w-5 text-center">{item.qty}</span>
                    <button
                      onClick={() => changeQty(item.design.id, 1)}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium text-gray-700 w-20 text-right">
                      ₹{(item.design.price * item.qty).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <span className="text-base font-bold text-primary">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Customer selector */}
        {parties.length > 0 && items.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Customer (optional)
            </label>
            <select
              value={partyId}
              onChange={e => setPartyId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">— Select customer —</option>
              {parties.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={completeOnboarding}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Skip & finish setup
          </button>
          <button
            onClick={items.length > 0 ? handleCreate : completeOnboarding}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : items.length > 0 ? 'Create Order' : 'Finish Setup'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
