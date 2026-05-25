import { useState, useRef } from 'react';
import { FileSpreadsheet, Headphones, Zap, ChevronRight, Upload, Link, X, Paperclip } from 'lucide-react';
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

export function Step3StartMethod() {
  const { setStartMethod, completeStep, completeOnboarding } = useOnboarding();
  const [selected, setSelected] = useState<StartMethod | null>(null);

  // Assisted form state
  const [contactName, setContactName]   = useState('');
  const [waNum,       setWaNum]         = useState('');
  const [callTime,    setCallTime]      = useState('');
  const [catalogSize, setCatalogSize]   = useState('');
  const [notes,       setNotes]         = useState('');
  const [links,       setLinks]         = useState<string[]>(['']);
  const [files,       setFiles]         = useState<File[]>([]);
  const [submitting,  setSubmitting]    = useState(false);
  const [submitted,   setSubmitted]     = useState(false);
  const [submitError, setSubmitError]   = useState('');

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

  const handleSubmitAssist = async () => {
    if (!contactName || !waNum || !catalogSize) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      // Upload any attached files first
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

      await fetch(`${API_URL}/api/onboarding/assistance`, {
        method:  'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          contact_name:      contactName,
          whatsapp_number:   waNum,
          call_time:         callTime,
          catalog_size:      catalogSize,
          notes,
          data_links:        links.filter(Boolean),
          uploaded_file_urls: uploadedUrls,
        }),
      });
      setSubmitted(true);
    } catch {
      setSubmitError('Failed to send request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const assistFormValid = contactName.trim() && waNum.trim() && catalogSize;

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

            {submitError && (
              <p className="text-xs text-red-500">{submitError}</p>
            )}

            <button
              onClick={handleSubmitAssist}
              disabled={submitting || !assistFormValid}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {submitting ? 'Sending…' : 'Send Setup Request'}
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
    </OnboardingLayout>
  );
}
