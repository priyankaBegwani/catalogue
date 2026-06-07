import { useState, useRef } from 'react';
import { FileSpreadsheet, Headphones, Zap, ChevronRight, Upload, Link, X, Paperclip, Sparkles, PlayCircle, CheckCircle } from 'lucide-react';
import { OnboardingLayout } from '../OnboardingLayout';
import { useOnboarding, StartMethod } from '../OnboardingContext';
import { API_URL } from '../../config/backend';

function authHeaders() {
  const token = localStorage.getItem('access_token') ?? '';
  const tid   = sessionStorage.getItem('tenant_id') ?? '';
  return {
    Authorization: `Bearer ${token}`,
    ...(tid ? { 'X-Tenant-ID': tid } : {}),
  };
}

type MethodCard = {
  id:          StartMethod;
  icon:        React.ReactNode;
  title:       string;
  description: string;
  badge?:      string;
};

const METHODS: MethodCard[] = [
  {
    id:          'import',
    icon:        <FileSpreadsheet className="w-6 h-6" />,
    title:       'Upload Existing Data',
    description: 'Import your products and customers from Excel or CSV. Best if you already have a catalog.',
    badge:       'Most popular',
  },
  {
    id:          'assisted',
    icon:        <Headphones className="w-6 h-6" />,
    title:       'We Setup For You',
    description: "Share your files with our team. We'll import everything and get you live — no tech skills needed.",
  },
  {
    id:          'fresh',
    icon:        <Zap className="w-6 h-6" />,
    title:       'Start Fresh',
    description: 'Begin with an empty workspace. Add products and customers manually as you go.',
  },
];

const CATALOG_SIZES = [
  { value: 'small',      label: '< 100 designs',        hint: 'Small collection' },
  { value: 'medium',     label: '100 – 500 designs',     hint: 'Medium catalog' },
  { value: 'large',      label: '500 – 2,000 designs',   hint: 'Large catalog' },
  { value: 'enterprise', label: '2,000+ designs',        hint: 'Enterprise' },
];

// Setup fee per catalog tier (₹)
const SETUP_BASE_PRICE: Record<string, number> = {
  small:      999,
  medium:     1999,
  large:      3999,
  enterprise: 0,
};

// AI enrichment add-on per catalog tier (₹)
const AI_ENRICHMENT_PRICE: Record<string, number> = {
  small:      700,
  medium:     1499,
  large:      2999,
  enterprise: 0,
};

function calcTotal(size: string, withAI: boolean): number {
  return SETUP_BASE_PRICE[size] + (withAI ? AI_ENRICHMENT_PRICE[size] : 0);
}

function loadRazorpayScript(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function Step3StartMethod() {
  const { setStartMethod, completeStep, completeOnboarding } = useOnboarding();
  const [selected, setSelected] = useState<StartMethod | null>(null);

  // Assisted form state
  const [contactName,   setContactName]   = useState('');
  const [waNum,         setWaNum]         = useState('');
  const [callTime,      setCallTime]      = useState('');
  const [catalogSize,   setCatalogSize]   = useState('');
  const [notes,         setNotes]         = useState('');
  const [links,         setLinks]         = useState<string[]>(['']);
  const [files,         setFiles]         = useState<File[]>([]);
  const [submitted,     setSubmitted]     = useState(false);
  const [submitError,   setSubmitError]   = useState('');

  // New: AI enrichment + modals
  const [aiEnrichment,  setAiEnrichment]  = useState<boolean | null>(null);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [showVideo,     setShowVideo]     = useState(false);
  const [payLoading,    setPayLoading]    = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (method: StartMethod) => setSelected(method);

  const handleContinue = () => {
    if (!selected) return;
    setStartMethod(selected);
    completeStep(3);
  };

  const addLink = () => setLinks(l => [...l, '']);
  const updateLink = (i: number, val: string) =>
    setLinks(l => l.map((v, idx) => idx === i ? val : v));
  const removeLink = (i: number) =>
    setLinks(l => l.filter((_, idx) => idx !== i));

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    e.target.value = '';
  };
  const removeFile = (i: number) => setFiles(f => f.filter((_, idx) => idx !== i));

  // Upload files + save setup_request record; returns the new record id
  const saveRequest = async (paymentStatus: string, amount: number): Promise<string> => {
    const uploadedUrls: string[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('designNo', 'onboarding');
      fd.append('colorName', 'assist');
      const r = await fetch(`${API_URL}/api/storage/upload`, {
        method: 'POST',
        headers: authHeaders(),
        body: fd,
      });
      if (r.ok) {
        const j = await r.json();
        if (j.publicUrl) uploadedUrls.push(j.publicUrl);
      }
    }

    const r = await fetch(`${API_URL}/api/onboarding/setup-request`, {
      method:  'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name:             contactName,
        whatsapp:         waNum,
        best_time:        callTime,
        catalog_size:     catalogSize,
        data_description: notes,
        links:            links.filter(Boolean),
        files_uploaded:   uploadedUrls,
        ai_enrichment:    aiEnrichment === true,
        amount,
        payment_status:   paymentStatus,
      }),
    });
    const j = await r.json();
    if (!j.success) throw new Error(j.message ?? 'Failed to save request');
    return j.data.id as string;
  };

  // "I'll pay later on call" path
  const handlePayLater = async () => {
    setPayLoading(true);
    setSubmitError('');
    try {
      const isEnterprise = catalogSize === 'enterprise';
      const total  = isEnterprise ? 0 : calcTotal(catalogSize, aiEnrichment === true);
      const status = isEnterprise ? 'custom_quote' : 'pending_payment';
      await saveRequest(status, total);
      setShowConfirm(false);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to send request. Please try again.');
    } finally {
      setPayLoading(false);
    }
  };

  // "Pay & Confirm" path — Razorpay
  const handlePayAndConfirm = async () => {
    setPayLoading(true);
    setSubmitError('');
    try {
      const total  = calcTotal(catalogSize, aiEnrichment === true);
      const id     = await saveRequest('pending_payment', total);

      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Failed to load payment gateway. Check your connection and try again.');

      const orderRes = await fetch(`${API_URL}/api/onboarding/setup-request/${id}/create-order`, {
        method:  'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      });
      const orderJson = await orderRes.json();
      if (!orderJson.success) throw new Error(orderJson.message ?? 'Failed to create payment order');

      const rzp = new window.Razorpay({
        key:      orderJson.data.key_id,
        amount:   orderJson.data.amount_paise,
        currency: 'INR',
        order_id: orderJson.data.order_id,
        name:     'Catalog Setup',
        description: `${CATALOG_SIZES.find(s => s.value === catalogSize)?.label ?? catalogSize}${aiEnrichment ? ' + AI Enrichment' : ''}`,
        prefill:  { name: contactName, contact: waNum },
        theme:    { color: '#4F46E5' },
        handler:  async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          await fetch(`${API_URL}/api/onboarding/setup-request/${id}/verify-payment`, {
            method:  'POST',
            headers: { ...authHeaders(), 'Content-Type': 'application/json' },
            body:    JSON.stringify(response),
          });
          setShowConfirm(false);
          setSubmitted(true);
        },
      });
      rzp.open();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setPayLoading(false);
    }
  };

  const assistFormValid = contactName.trim() && waNum.trim() && catalogSize && aiEnrichment !== null;

  return (
    <OnboardingLayout
      title="How would you like to get started?"
      subtitle="Choose the approach that best fits your situation."
    >
      <div className="space-y-6">
        {/* Method cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {METHODS.map(m => (
            <button
              key={m.id}
              onClick={() => handleSelect(m.id)}
              className={`relative text-left p-5 rounded-2xl border-2 transition-all ${
                selected === m.id
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
              }`}
            >
              {m.badge && (
                <span className="absolute -top-2.5 left-4 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  {m.badge}
                </span>
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                selected === m.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
              }`}>
                {m.icon}
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1">{m.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{m.description}</p>
            </button>
          ))}
        </div>

        {/* Assisted onboarding form */}
        {selected === 'assisted' && !submitted && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Tell us about your setup</h3>
              <p className="text-xs text-gray-400 mt-0.5">Our team will contact you to schedule a call and handle the full setup.</p>
            </div>

            {/* Contact */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Your name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="Raju Sharma"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">WhatsApp number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={waNum}
                  onChange={e => setWaNum(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Call time */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Best time to call (optional)</label>
              <input
                type="text"
                value={callTime}
                onChange={e => setCallTime(e.target.value)}
                placeholder="e.g. Weekdays after 6 PM, Saturday 10 AM – 1 PM"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Catalog size */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Approximate catalog size <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CATALOG_SIZES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setCatalogSize(s.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      catalogSize === s.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xs font-semibold">{s.label}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{s.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">What data do you have? (optional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. I have an Excel with 800 designs and a folder of photos. Parties are on WhatsApp..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* File upload */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Upload your data files (optional)</label>
              <p className="text-[11px] text-gray-400 mb-2">CSVs, Excel files, ZIP of photos — anything you have. Max 10 MB per file.</p>
              <div
                className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Click to attach files</p>
                <input ref={fileInputRef} type="file" multiple accept=".csv,.xlsx,.xls,.zip,.pdf" className="hidden" onChange={handleFiles} />
              </div>
              {files.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-xs">
                      <span className="flex items-center gap-1.5 text-gray-700">
                        <Paperclip className="w-3 h-3 text-gray-400" />
                        {f.name}
                      </span>
                      <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Links */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Share any links (optional)</label>
              <p className="text-[11px] text-gray-400 mb-2">Google Drive, Dropbox, WhatsApp catalog links, etc.</p>
              <div className="space-y-2">
                {links.map((link, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div className="flex-1 flex items-center border border-gray-200 rounded-xl px-3 py-2 gap-2">
                      <Link className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                      <input
                        type="url"
                        value={link}
                        onChange={e => updateLink(i, e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="flex-1 text-sm focus:outline-none bg-transparent"
                      />
                    </div>
                    {links.length > 1 && (
                      <button onClick={() => removeLink(i)} className="text-gray-300 hover:text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLink}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  + Add another link
                </button>
              </div>
            </div>

            {/* AI enrichment upsell */}
            <div className="border border-gray-100 rounded-2xl p-4 space-y-3 bg-gray-50/50">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">AI Catalog Enrichment</p>
                  <p className="text-xs text-gray-500 mt-0.5">Auto-fill missing descriptions, tags, occasion & collection metadata using AI — saves hours of manual work.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVideo(true)}
                  className="flex-shrink-0 flex items-center gap-1 text-[11px] text-primary border border-primary/30 px-2.5 py-1 rounded-lg hover:bg-primary/5 transition-colors"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  Watch Demo
                </button>
              </div>

              <div className="space-y-2">
                {/* Yes option */}
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  aiEnrichment === true
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="ai_enrichment"
                    checked={aiEnrichment === true}
                    onChange={() => setAiEnrichment(true)}
                    className="accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900">Yes, include AI catalog enrichment</span>
                  </div>
                  {catalogSize && catalogSize !== 'enterprise' ? (
                    <span className="text-sm font-bold text-primary flex-shrink-0">
                      +₹{AI_ENRICHMENT_PRICE[catalogSize].toLocaleString('en-IN')}
                    </span>
                  ) : catalogSize === 'enterprise' ? (
                    <span className="text-xs text-gray-400 flex-shrink-0">Included in quote</span>
                  ) : (
                    <span className="text-xs text-gray-400 flex-shrink-0">Select catalog size above</span>
                  )}
                </label>

                {/* No option */}
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  aiEnrichment === false
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="ai_enrichment"
                    checked={aiEnrichment === false}
                    onChange={() => setAiEnrichment(false)}
                    className="accent-primary"
                  />
                  <span className="text-sm text-gray-700">No thanks</span>
                </label>
              </div>
            </div>

            {submitError && (
              <p className="text-xs text-red-500">{submitError}</p>
            )}

            <button
              onClick={() => setShowConfirm(true)}
              disabled={!assistFormValid}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              Send Setup Request
            </button>
          </div>
        )}

        {selected === 'assisted' && submitted && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-center space-y-2">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Headphones className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm font-semibold text-green-800">Request received!</p>
            <p className="text-xs text-green-700">Our team will reach out on WhatsApp within 24 hours to schedule your setup call.</p>
            <button
              onClick={handleContinue}
              className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:opacity-90"
            >
              Continue to dashboard
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* CTA for non-assisted methods */}
        {selected && selected !== 'assisted' && (
          <div className="flex items-center justify-between">
            <button
              onClick={() => completeOnboarding()}
              className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2"
            >
              Skip setup, explore the app first
            </button>
            <button
              onClick={handleContinue}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90 transition-all"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* No method selected yet — offer express skip */}
        {!selected && (
          <div className="text-center pt-2">
            <button
              onClick={() => completeOnboarding()}
              className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2"
            >
              Skip setup, explore the app first →
            </button>
          </div>
        )}
      </div>

      {/* ── Confirmation modal ──────────────────────────────────────────── */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 space-y-5">
              {catalogSize === 'enterprise' ? (
                /* Enterprise: custom quote, no payment */
                <>
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <Headphones className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900">We'll contact you with a custom quote</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Your catalog size requires a tailored plan. Our team will reach out on WhatsApp within 24 hours with a custom proposal.
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-xs text-gray-600">
                    <div className="flex justify-between"><span>Name</span><span className="font-medium text-gray-900">{contactName}</span></div>
                    <div className="flex justify-between"><span>WhatsApp</span><span className="font-medium text-gray-900">{waNum}</span></div>
                    <div className="flex justify-between"><span>Catalog size</span><span className="font-medium text-gray-900">2,000+ designs</span></div>
                    <div className="flex justify-between"><span>AI enrichment</span><span className="font-medium text-gray-900">{aiEnrichment ? 'Yes' : 'No'}</span></div>
                  </div>

                  {submitError && <p className="text-xs text-red-500">{submitError}</p>}

                  <button
                    onClick={handlePayLater}
                    disabled={payLoading}
                    className="w-full px-5 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    {payLoading ? 'Submitting…' : 'Submit Request'}
                  </button>
                </>
              ) : (
                /* Standard: show pricing + two payment options */
                <>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Confirm your setup request</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Review the summary before proceeding to payment.</p>
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-xs text-gray-600">
                    <div className="flex justify-between"><span>Name</span><span className="font-medium text-gray-900">{contactName}</span></div>
                    <div className="flex justify-between"><span>WhatsApp</span><span className="font-medium text-gray-900">{waNum}</span></div>
                    {callTime && <div className="flex justify-between"><span>Best time</span><span className="font-medium text-gray-900">{callTime}</span></div>}
                    <div className="flex justify-between"><span>Catalog size</span><span className="font-medium text-gray-900">{CATALOG_SIZES.find(s => s.value === catalogSize)?.label}</span></div>
                    <div className="flex justify-between"><span>AI enrichment</span><span className="font-medium text-gray-900">{aiEnrichment ? 'Yes' : 'No'}</span></div>
                  </div>

                  {/* Price breakdown */}
                  <div className="border border-gray-100 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Setup fee</span>
                      <span>₹{SETUP_BASE_PRICE[catalogSize].toLocaleString('en-IN')}</span>
                    </div>
                    {aiEnrichment && (
                      <div className="flex justify-between text-gray-600">
                        <span>AI enrichment</span>
                        <span>+₹{AI_ENRICHMENT_PRICE[catalogSize].toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-100 pt-2 flex justify-between font-bold text-gray-900">
                      <span>Total</span>
                      <span>₹{calcTotal(catalogSize, aiEnrichment === true).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {submitError && <p className="text-xs text-red-500">{submitError}</p>}

                  <div className="space-y-2">
                    <button
                      onClick={handlePayAndConfirm}
                      disabled={payLoading}
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                      {payLoading ? 'Processing…' : `Pay ₹${calcTotal(catalogSize, aiEnrichment === true).toLocaleString('en-IN')} & Confirm`}
                    </button>
                    <button
                      onClick={handlePayLater}
                      disabled={payLoading}
                      className="w-full px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all"
                    >
                      I'll pay later on call
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 pb-5">
              <button
                onClick={() => { setShowConfirm(false); setSubmitError(''); }}
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Video demo modal ────────────────────────────────────────────── */}
      {showVideo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">AI Catalog Enrichment — Demo</h3>
                <p className="text-xs text-gray-400 mt-0.5">See how AI fills your catalog metadata automatically</p>
              </div>
              <button
                onClick={() => setShowVideo(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Video placeholder — src to be added later */}
            <div className="bg-gray-900 aspect-video flex flex-col items-center justify-center gap-3">
              <PlayCircle className="w-14 h-14 text-white/30" />
              <p className="text-xs text-white/40">Demo video coming soon</p>
            </div>
            <div className="px-5 py-4 bg-gray-50 text-xs text-gray-500 leading-relaxed">
              AI enrichment automatically generates product descriptions, tags, occasion, collection and work-type metadata for every design in your catalog.
            </div>
          </div>
        </div>
      )}
    </OnboardingLayout>
  );
}
