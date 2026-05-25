/**
 * Public Catalogue Preview Page
 *
 * Opened by the client from a WhatsApp link: /preview/:token
 * No login required.
 *
 * Flow:
 * 1. Validate token → fetch designs
 * 2. Show read-only catalogue grid
 * 3. "Approve & Publish" → Razorpay payment if fee > 0 → publishes designs
 * 4. After publish: show success + export download option
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Download, Eye, ThumbsUp, AlertCircle, RefreshCw, ImageIcon } from 'lucide-react';
import { API_URL } from '../config/backend';

declare global {
  interface Window {
    Razorpay: new (opts: RazorpayOptions) => { open: () => void };
  }
}

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  prefill?: Record<string, string>;
  theme?: { color: string };
};

type Design = {
  id: string;
  design_no: string;
  name: string;
  description: string | null;
  department: string | null;
  price: number | null;
  category: { name: string } | null;
  design_colors: { color_name: string; image_urls: string[]; in_stock: boolean }[];
};

type PreviewData = {
  request_id: string;
  status: string;
  tenant: { name: string; slug: string } | null;
  designs: Design[];
  payment_required: boolean;
  amount_paise: number;
};

async function loadRazorpayScript(): Promise<boolean> {
  if (window.Razorpay) return true;
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function DesignCard({ design }: { design: Design }) {
  const firstImage = design.design_colors?.[0]?.image_urls?.[0];
  const colors = design.design_colors?.length ?? 0;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      <div className="aspect-[3/4] bg-gray-100 relative overflow-hidden">
        {firstImage
          ? <img src={firstImage} alt={design.name} className="w-full h-full object-cover" loading="lazy" />
          : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-300" />
            </div>
          )
        }
        {colors > 1 && (
          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
            +{colors - 1} color{colors > 2 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs font-bold text-gray-800 truncate">{design.design_no}</p>
        <p className="text-xs text-gray-500 truncate">{design.name}</p>
        {design.price != null && design.price > 0 && (
          <p className="text-xs font-semibold text-gray-900 mt-1">₹{design.price}</p>
        )}
        {design.category && (
          <p className="text-[10px] text-gray-400 mt-0.5">{design.category.name}</p>
        )}
      </div>
    </div>
  );
}

export function PreviewCatalogue() {
  const { token } = useParams<{ token: string }>();
  const [data,       setData]       = useState<PreviewData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [phase,      setPhase]      = useState<'viewing' | 'paying' | 'published' | 'exporting' | 'exported'>('viewing');
  const [payLoading, setPayLoading] = useState(false);
  const [exportData, setExportData] = useState<{ designs: unknown[]; colors: unknown[]; photos: unknown[] } | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/onboarding/preview/${token}`)
      .then(r => r.json())
      .then(j => {
        if (!j.success) throw new Error(j.message ?? 'Invalid preview link');
        setData(j.data);
        if (j.data.status === 'complete') setPhase('published');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleApprove = async () => {
    if (!token || !data) return;
    setPayLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/onboarding/preview/${token}/approve`, { method: 'POST' });
      const j = await r.json();
      if (!j.success) throw new Error(j.message ?? 'Approval failed');

      if (!j.data.payment_required) {
        setPhase('published');
        return;
      }

      // Load Razorpay and open checkout
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Failed to load payment gateway. Please try again.');

      const rzp = new window.Razorpay({
        key:         j.data.razorpay_key_id,
        amount:      j.data.amount_paise,
        currency:    j.data.currency,
        order_id:    j.data.order_id,
        name:        'Catalogue Setup',
        description: `Professional catalog setup — ${data.tenant?.name ?? ''}`,
        theme:       { color: '#6366f1' },
        handler: async (resp) => {
          try {
            const vr = await fetch(`${API_URL}/api/onboarding/preview/${token}/verify-payment`, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify(resp),
            });
            const vj = await vr.json();
            if (!vj.success) throw new Error(vj.message ?? 'Payment verification failed');
            setPhase('published');
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Payment verification failed');
          }
        },
      });
      rzp.open();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPayLoading(false);
    }
  };

  const handleExport = async () => {
    if (!token) return;
    setPhase('exporting');
    try {
      const r = await fetch(`${API_URL}/api/internal/export/by-token/${token}`);
      const j = await r.json();
      if (!j.success) throw new Error(j.message ?? 'Export failed');
      setExportData(j.data);
      setPhase('exported');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('published');
    }
  };

  const downloadCSV = (rows: unknown[], filename: string) => {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0] as Record<string, unknown>);
    const csvRows = [
      headers.join(','),
      ...(rows as Record<string, unknown>[]).map(row =>
        headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-sm w-full text-center shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h1 className="text-base font-bold text-gray-900 mb-1">Preview unavailable</h1>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const designCount = data.designs.length;
  const colorCount  = data.designs.reduce((s, d) => s + (d.design_colors?.length ?? 0), 0);
  const imageCount  = data.designs.reduce((s, d) =>
    s + d.design_colors.reduce((cs, c) => cs + (c.image_urls?.length ?? 0), 0), 0
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-gray-900">{data.tenant?.name ?? 'Your Catalog'}</h1>
            <p className="text-xs text-gray-400">Preview — {designCount} designs</p>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-indigo-500 font-medium">Preview mode</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Designs',        value: designCount },
            { label: 'Color variants', value: colorCount  },
            { label: 'Photos uploaded', value: imageCount },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center shadow-sm">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Approval / published banner */}
        {phase === 'viewing' && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-indigo-900">Your catalog is ready!</h2>
              <p className="text-xs text-indigo-700 mt-0.5">
                Review the designs below. When you're happy, approve to publish your catalog and go live.
                {data.payment_required && ` Setup fee: ₹${data.amount_paise / 100}`}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleApprove}
                disabled={payLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {payLoading
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Processing…</>
                  : <><ThumbsUp className="w-4 h-4" /> {data.payment_required ? `Approve & Pay ₹${data.amount_paise / 100}` : 'Approve & Publish'}</>
                }
              </button>
            </div>
          </div>
        )}

        {phase === 'published' && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <div>
                <h2 className="text-sm font-bold text-green-900">Your catalog is live!</h2>
                <p className="text-xs text-green-700">All designs are now published and visible to your retailers.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://${data.tenant?.slug}.${window.location.host}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-500"
              >
                <Eye className="w-4 h-4" /> Open live catalog
              </a>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-green-200 text-green-700 rounded-xl text-sm font-medium hover:bg-green-50"
              >
                <Download className="w-4 h-4" /> Export your data
              </button>
            </div>
          </div>
        )}

        {phase === 'exporting' && (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6 flex items-center gap-3 text-sm text-gray-500">
            <RefreshCw className="w-4 h-4 animate-spin" /> Preparing your export…
          </div>
        )}

        {phase === 'exported' && exportData && (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-6">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Download your data</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => downloadCSV(exportData.designs, 'designs.csv')}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200"
              >
                <Download className="w-4 h-4" /> Designs ({exportData.designs.length} rows)
              </button>
              <button
                onClick={() => downloadCSV(exportData.colors, 'design_colors.csv')}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200"
              >
                <Download className="w-4 h-4" /> Color variants ({exportData.colors.length} rows)
              </button>
              <button
                onClick={() => downloadCSV(exportData.photos, 'photo_manifest.csv')}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200"
              >
                <Download className="w-4 h-4" /> Photo manifest ({exportData.photos.length} photos)
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Design grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {data.designs.map(d => (
            <DesignCard key={d.id} design={d} />
          ))}
        </div>

        {designCount === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            No designs imported yet. Your setup team is still working on it.
          </div>
        )}
      </main>
    </div>
  );
}
