import { useState } from 'react';
import { MessageCircle, Share2, Eye, ChevronRight, Copy, CheckCircle, Sparkles, Pencil, Check, X } from 'lucide-react';
import { OnboardingLayout } from '../OnboardingLayout';
import { useOnboarding } from '../OnboardingContext';
import { useBranding } from '../../hooks/useBranding';
import { useTenant } from '../../contexts/TenantContext';
import { API_URL } from '../../config/backend';

function authHeaders() {
  const token = localStorage.getItem('access_token') ?? '';
  const tid   = sessionStorage.getItem('tenant_id') ?? '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(tid ? { 'X-Tenant-ID': tid } : {}),
  };
}

type Template = {
  id:      string;
  label:   string;
  preview: (ctx: { brandName: string; catalogUrl: string }) => string;
};

const TEMPLATES: Template[] = [
  {
    id:    'catalog',
    label: 'Share catalog',
    preview: ({ brandName, catalogUrl }) =>
      `Hi! 👋\n\nCheck out our latest ${brandName} collection:\n🛍️ ${catalogUrl}\n\nBrowse designs, place orders, and more — all from your phone!\n\nReply to order or enquire 📲`,
  },
  {
    id:    'new_arrival',
    label: 'New arrivals',
    preview: ({ brandName, catalogUrl }) =>
      `✨ *New Arrivals from ${brandName}!*\n\nFresh designs just landed 🎉\nView now: ${catalogUrl}\n\nLimited stock — order fast! 🔥`,
  },
  {
    id:    'order_ready',
    label: 'Order ready',
    preview: ({ brandName }) =>
      `Hi! 🙏\n\nYour order from *${brandName}* is ready for dispatch.\n\nPlease confirm your delivery address and we'll ship it today.\n\nThank you for your business! 🤝`,
  },
];

export function Step7WhatsApp() {
  const { completeStep, completeOnboarding } = useOnboarding();
  const branding                             = useBranding();
  const { slug }                             = useTenant();
  const [selected,  setSelected]  = useState('catalog');
  const [copied,    setCopied]    = useState(false);
  const [waNumber,  setWaNumber]  = useState(branding.whatsappNumber ?? '');

  // Inline slug editing
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugInput,   setSlugInput]   = useState(slug ?? '');
  const [slugSaving,  setSlugSaving]  = useState(false);
  const [slugError,   setSlugError]   = useState('');
  const [slugSaved,   setSlugSaved]   = useState(false);

  const appDomain  = import.meta.env.VITE_APP_DOMAIN || window.location.hostname;
  const currentSlug = slugSaved ? slugInput : (slug ?? '');
  const catalogUrl = currentSlug
    ? `https://${currentSlug}.${appDomain}/catalogue`
    : `${window.location.origin}/catalogue`;

  const saveSlug = async () => {
    const trimmed = slugInput.trim().toLowerCase();
    if (!trimmed || trimmed === slug) { setEditingSlug(false); return; }
    if (!/^[a-z0-9][a-z0-9-]{2,29}$/.test(trimmed)) {
      setSlugError('3–30 lowercase letters/numbers/hyphens, must start with a letter or number');
      return;
    }
    setSlugSaving(true);
    setSlugError('');
    try {
      const r = await fetch(`${API_URL}/api/tenant/subdomain`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ slug: trimmed }),
      });
      const j = await r.json();
      if (!r.ok) { setSlugError(j.message ?? 'Failed to save'); return; }
      setSlugSaved(true);
      setEditingSlug(false);
    } catch {
      setSlugError('Network error. Please try again.');
    } finally {
      setSlugSaving(false);
    }
  };

  const ctx      = { brandName: branding.brandName, catalogUrl };
  const template = TEMPLATES.find(t => t.id === selected)!;
  const message  = template.preview(ctx);

  const waHref = `https://wa.me/?text=${encodeURIComponent(message)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <OnboardingLayout
      title="Set Up WhatsApp Sharing"
      subtitle="Your catalog is ready to share. WhatsApp is the fastest way to reach customers."
    >
      <div className="space-y-6">
        {/* Share link + slug editor */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-gray-700">Your catalog link</span>
            </div>
            {!editingSlug && (
              <button
                onClick={() => { setSlugInput(currentSlug); setEditingSlug(true); setSlugError(''); }}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Pencil className="w-3 h-3" /> Customize URL
              </button>
            )}
          </div>

          {editingSlug ? (
            <div className="px-4 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-primary">
                  <input
                    autoFocus
                    value={slugInput}
                    onChange={e => setSlugInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1 px-3 py-2 text-sm focus:outline-none"
                    placeholder="your-brand-name"
                  />
                  <span className="px-3 text-xs text-gray-400 bg-gray-50 border-l border-gray-200 py-2 whitespace-nowrap">
                    .{appDomain}
                  </span>
                </div>
                <button
                  onClick={saveSlug}
                  disabled={slugSaving}
                  className="p-2 bg-primary text-white rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setEditingSlug(false); setSlugError(''); }}
                  className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {slugError && <p className="text-xs text-red-500">{slugError}</p>}
              <p className="text-xs text-gray-400">3–30 characters, lowercase letters, numbers, and hyphens only</p>
            </div>
          ) : (
            <div className="px-4 py-4 flex items-center gap-3">
              <code className="flex-1 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2.5 break-all">
                {catalogUrl}
                {slugSaved && <span className="ml-2 text-green-600 font-medium">✓ Saved</span>}
              </code>
              <a
                href={catalogUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 flex-shrink-0"
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </a>
            </div>
          )}
        </div>

        {/* Template selector */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">Choose a message template</p>
          <div className="flex gap-2 flex-wrap mb-4">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selected === t.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Message preview */}
          <div className="bg-green-50 rounded-2xl p-4 relative">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4 text-green-700" />
              <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">WhatsApp Preview</span>
            </div>
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
              {message}
            </pre>
            <div className="mt-3 flex gap-2">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:opacity-90"
              >
                <Share2 className="w-4 h-4" />
                Share via WhatsApp
              </a>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2 border border-green-200 rounded-xl text-sm font-medium text-green-800 hover:bg-green-100"
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy text'}
              </button>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-1.5 text-xs text-blue-800">
          <p className="font-semibold">Pro tips for WhatsApp sharing</p>
          <ul className="list-disc list-inside space-y-1 text-blue-700">
            <li>Customers can browse your catalog on their mobile — no app needed</li>
            <li>Add products to WhatsApp Business catalog for extra visibility</li>
            <li>Use broadcast lists to reach multiple customers at once</li>
          </ul>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => completeOnboarding()}
            className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2"
          >
            Skip for now, explore the app
          </button>
          <button
            onClick={() => completeStep(7)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90"
          >
            Done, go to dashboard <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
