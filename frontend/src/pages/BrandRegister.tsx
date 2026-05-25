import { useState, useEffect, useRef } from 'react';
import {
  Building2, User, Mail, Lock, Phone, Globe, CheckCircle,
  AlertCircle, Eye, EyeOff, Loader2, ArrowRight, Sparkles,
  Check, X,
} from 'lucide-react';
import { API_URL } from '../config/backend';

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = {
  id: string;
  name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  max_products: number | null;
  max_users: number | null;
  max_retailers: number | null;
  features: {
    pdf_catalog: boolean;
    ai_descriptions: boolean;
    custom_domain: boolean;
    analytics: boolean;
    whatsapp_sharing: boolean;
    bulk_import: boolean;
  };
};

type FormState = {
  business_name: string;
  subdomain: string;
  owner_name: string;
  email: string;
  password: string;
  confirm_password: string;
  phone: string;
  plan: string;
};

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-/, '')
    .slice(0, 30);
}

const PLAN_COLORS: Record<string, string> = {
  starter: 'from-blue-500 to-blue-600',
  growth: 'from-violet-500 to-purple-600',
  enterprise: 'from-amber-500 to-orange-500',
};

const PLAN_BORDER: Record<string, string> = {
  starter: 'border-blue-500',
  growth: 'border-violet-500',
  enterprise: 'border-amber-500',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function BrandRegister() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  const [form, setForm] = useState<FormState>({
    business_name: '',
    subdomain: '',
    owner_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: '',
    plan: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [slugMessage, setSlugMessage] = useState('');
  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState<{ slug: string; app_url: string } | null>(null);

  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // ── Load plans ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/api/platform/plans`)
      .then(r => r.json())
      .then(({ data }) => {
        setPlans(data ?? []);
        if (data?.length) setForm(f => ({ ...f, plan: data[0].name }));
      })
      .catch(() => {
        // Use static fallback plans for demo purposes
        const fallback: Plan[] = [
          {
            id: 'starter', name: 'starter', display_name: 'Starter',
            price_monthly: 999, price_yearly: 9990,
            max_products: 500, max_users: 5, max_retailers: 50,
            features: { pdf_catalog: false, ai_descriptions: false, custom_domain: false, analytics: false, whatsapp_sharing: true, bulk_import: false },
          },
          {
            id: 'growth', name: 'growth', display_name: 'Growth',
            price_monthly: 2999, price_yearly: 29990,
            max_products: 2000, max_users: 15, max_retailers: 200,
            features: { pdf_catalog: true, ai_descriptions: false, custom_domain: false, analytics: true, whatsapp_sharing: true, bulk_import: true },
          },
          {
            id: 'enterprise', name: 'enterprise', display_name: 'Enterprise',
            price_monthly: 7999, price_yearly: 79990,
            max_products: null, max_users: null, max_retailers: null,
            features: { pdf_catalog: true, ai_descriptions: true, custom_domain: true, analytics: true, whatsapp_sharing: true, bulk_import: true },
          },
        ];
        setPlans(fallback);
        setForm(f => ({ ...f, plan: 'starter' }));
      })
      .finally(() => setPlansLoading(false));
  }, []);

  // ── Auto-generate subdomain from business name ─────────────────────────────
  const handleBusinessNameChange = (value: string) => {
    setForm(f => ({
      ...f,
      business_name: value,
      // Only auto-fill if user hasn't manually edited subdomain
      subdomain: f.subdomain === slugify(f.business_name) || f.subdomain === ''
        ? slugify(value)
        : f.subdomain,
    }));
  };

  // ── Slug availability check (debounced) ───────────────────────────────────
  const handleSubdomainChange = (value: string) => {
    const clean = slugify(value);
    setForm(f => ({ ...f, subdomain: clean }));
    setSlugStatus('idle');
    setSlugMessage('');

    if (slugTimer.current) clearTimeout(slugTimer.current);
    if (!clean || clean.length < 3) {
      if (clean && clean.length < 3) {
        setSlugStatus('invalid');
        setSlugMessage('Minimum 3 characters');
      }
      return;
    }

    setSlugStatus('checking');
    slugTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/platform/check-slug?slug=${clean}`);
        const { data } = await res.json();
        if (data.available) {
          setSlugStatus('available');
          setSlugMessage(`${clean}.yourplatform.com is available`);
        } else {
          setSlugStatus('taken');
          setSlugMessage(data.reason || 'This subdomain is already taken');
        }
      } catch {
        setSlugStatus('idle');
      }
    }, 500);
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: typeof errors = {};

    if (!form.business_name.trim()) e.business_name = 'Business name is required';
    if (!form.subdomain || form.subdomain.length < 3) e.subdomain = 'Subdomain must be at least 3 characters';
    if (slugStatus === 'taken') e.subdomain = 'This subdomain is already taken';
    if (slugStatus === 'invalid') e.subdomain = 'Invalid subdomain format';
    if (!form.owner_name.trim()) e.owner_name = 'Your name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Minimum 8 characters';
    if (form.confirm_password !== form.password) e.confirm_password = 'Passwords do not match';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    else if (!/^\+?[1-9]\d{9,13}$/.test(form.phone.replace(/[\s-]/g, '')))
      e.phone = 'Enter a valid phone number with country code (e.g. +91...)';
    if (!form.plan) e.plan = 'Please select a plan';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitStatus('submitting');
    setSubmitError('');

    try {
      const res = await fetch(`${API_URL}/api/platform/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: form.business_name.trim(),
          subdomain: form.subdomain,
          owner_name: form.owner_name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          phone: form.phone.trim(),
          plan: form.plan,
        }),
      });

      const body = await res.json();

      if (!res.ok || !body.success) {
        setSubmitError(body.message || 'Registration failed. Please try again.');
        setSubmitStatus('error');
        return;
      }

      setResult({ slug: body.data.slug, app_url: body.data.app_url });
      setSubmitStatus('success');
    } catch {
      setSubmitError('Could not reach the server. Check that the backend is running.');
      setSubmitStatus('error');
    }
  };

  // ── Field helper ──────────────────────────────────────────────────────────
  const field = (
    id: keyof FormState,
    label: string,
    icon: React.ReactNode,
    inputProps: React.InputHTMLAttributes<HTMLInputElement>,
    hint?: string,
    extra?: React.ReactNode,
  ) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          {icon}
        </div>
        <input
          id={id}
          {...inputProps}
          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
            errors[id] ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
          }`}
        />
        {extra}
      </div>
      {errors[id] && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {errors[id]}
        </p>
      )}
      {hint && !errors[id] && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitStatus === 'success' && result) {
    // Dev: add ?tenant=slug so resolveTenant picks up the correct tenant
    const devAppUrl = `${window.location.origin}?tenant=${result.slug}`;
    const isDev = import.meta.env.DEV;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-9 h-9 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h1>
          <p className="text-gray-600 mb-6">
            Your brand workspace <span className="font-semibold text-gray-800">{form.business_name}</span> is ready.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-3">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">Your app URL</p>
              <code className="text-sm text-blue-700 font-mono break-all">{result.app_url}</code>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">Login email</p>
              <p className="text-sm text-gray-800">{form.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-0.5">Plan</p>
              <p className="text-sm text-gray-800 capitalize">{form.plan}</p>
            </div>
          </div>

          {isDev && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-left">
              <p className="text-xs font-semibold text-amber-800 mb-1">Dev mode — no subdomain DNS</p>
              <p className="text-xs text-amber-700 mb-2">
                Use the link below to test with the correct tenant context in localhost:
              </p>
              <code className="text-xs text-amber-900 break-all">{devAppUrl}</code>
            </div>
          )}

          <a
            href={isDev ? devAppUrl : result.app_url}
            className="block w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:shadow-lg transition-all hover:scale-[1.01] mb-3"
          >
            Open Your App →
          </a>
          <button
            onClick={() => {
              setSubmitStatus('idle');
              setResult(null);
              setForm({ business_name: '', subdomain: '', owner_name: '', email: '', password: '', confirm_password: '', phone: '', plan: plans[0]?.name ?? '' });
              setErrors({});
            }}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Register another brand
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-start justify-center p-4 py-8">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white text-xs font-medium px-3 py-1.5 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Demo Registration — Brand Onboarding
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Create your brand workspace</h1>
          <p className="text-blue-200 text-sm">Set up your white-label catalog platform in minutes</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* ── Plan Selection ───────────────────────────────────────────── */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-4">
            <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" /> Choose a Plan
            </h2>

            {plansLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-blue-200">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading plans…
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {plans.map((plan) => {
                  const selected = form.plan === plan.name;
                  return (
                    <button
                      key={plan.name}
                      type="button"
                      onClick={() => { setForm(f => ({ ...f, plan: plan.name })); setErrors(e => ({ ...e, plan: undefined })); }}
                      className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                        selected
                          ? `${PLAN_BORDER[plan.name] ?? 'border-blue-500'} bg-white/15 shadow-lg`
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      {selected && (
                        <span className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-gradient-to-br ${PLAN_COLORS[plan.name] ?? 'from-blue-500 to-blue-600'} flex items-center justify-center`}>
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                      <div className={`text-sm font-bold bg-gradient-to-r ${PLAN_COLORS[plan.name] ?? 'from-blue-400 to-blue-500'} bg-clip-text text-transparent mb-1`}>
                        {plan.display_name}
                      </div>
                      <div className="text-white font-bold text-lg leading-none mb-2">
                        ₹{plan.price_monthly.toLocaleString('en-IN')}
                        <span className="text-white/50 text-xs font-normal">/mo</span>
                      </div>
                      <ul className="space-y-1">
                        {[
                          plan.max_products ? `${plan.max_products.toLocaleString()} products` : 'Unlimited products',
                          plan.max_users ? `${plan.max_users} users` : 'Unlimited users',
                          plan.features.analytics && 'Analytics',
                          plan.features.pdf_catalog && 'PDF catalog',
                          plan.features.ai_descriptions && 'AI descriptions',
                          plan.features.custom_domain && 'Custom domain',
                        ].filter(Boolean).map((feat, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-xs text-white/70">
                            <Check className="w-3 h-3 text-green-400 shrink-0" />
                            {feat}
                          </li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>
            )}
            {errors.plan && (
              <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.plan}
              </p>
            )}
          </div>

          {/* ── Business Details ─────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-4 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" /> Business Details
            </h2>

            {field('business_name', 'Business Name', <Building2 className="w-4 h-4" />, {
              value: form.business_name,
              onChange: (e) => handleBusinessNameChange(e.target.value),
              placeholder: 'e.g., Indie Craft',
              autoComplete: 'organization',
            })}

            {/* Subdomain */}
            <div>
              <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700 mb-1.5">
                Subdomain <span className="text-red-500">*</span>
              </label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white transition-colors">
                <div className="flex items-center pl-3.5 text-gray-400">
                  <Globe className="w-4 h-4" />
                </div>
                <input
                  id="subdomain"
                  type="text"
                  value={form.subdomain}
                  onChange={(e) => handleSubdomainChange(e.target.value)}
                  placeholder="mybrand"
                  className={`flex-1 px-2.5 py-2.5 text-sm focus:outline-none min-w-0 ${errors.subdomain ? 'bg-red-50' : ''}`}
                />
                <div className="flex items-center pr-3 text-xs text-gray-400 shrink-0 pl-1">
                  .platform.com
                </div>
                <div className="flex items-center pr-3 shrink-0">
                  {slugStatus === 'checking' && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                  {slugStatus === 'available' && <Check className="w-4 h-4 text-green-500" />}
                  {(slugStatus === 'taken' || slugStatus === 'invalid') && <X className="w-4 h-4 text-red-500" />}
                </div>
              </div>
              {slugStatus === 'available' && (
                <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> {slugMessage}
                </p>
              )}
              {(slugStatus === 'taken' || slugStatus === 'invalid') && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <X className="w-3 h-3" /> {slugMessage}
                </p>
              )}
              {errors.subdomain && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.subdomain}
                </p>
              )}
              {!errors.subdomain && slugStatus === 'idle' && (
                <p className="mt-1 text-xs text-gray-500">Lowercase letters, numbers and hyphens only</p>
              )}
            </div>
          </div>

          {/* ── Admin Account ────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-4 space-y-4">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" /> Admin Account
            </h2>

            {field('owner_name', 'Your Full Name', <User className="w-4 h-4" />, {
              value: form.owner_name,
              onChange: (e) => setForm(f => ({ ...f, owner_name: e.target.value })),
              placeholder: 'e.g., Rahul Sharma',
              autoComplete: 'name',
            })}

            {field('email', 'Email Address', <Mail className="w-4 h-4" />, {
              type: 'email',
              value: form.email,
              onChange: (e) => setForm(f => ({ ...f, email: e.target.value })),
              placeholder: 'you@yourbrand.com',
              autoComplete: 'email',
            })}

            {field('phone', 'Phone Number', <Phone className="w-4 h-4" />, {
              type: 'tel',
              value: form.phone,
              onChange: (e) => setForm(f => ({ ...f, phone: e.target.value })),
              placeholder: '+91 98765 43210',
              autoComplete: 'tel',
            }, 'Include country code')}

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min 8 characters"
                  autoComplete="new-password"
                  className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirm_password"
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirm_password}
                  onChange={(e) => setForm(f => ({ ...f, confirm_password: e.target.value }))}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  className={`w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${errors.confirm_password ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.confirm_password}</p>
              )}
              {!errors.confirm_password && form.confirm_password && form.password === form.confirm_password && (
                <p className="mt-1 text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Passwords match</p>
              )}
            </div>
          </div>

          {/* ── Submit ──────────────────────────────────────────────────── */}
          {submitStatus === 'error' && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl mb-4 text-sm text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitStatus === 'submitting'}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:shadow-xl hover:scale-[1.01]"
          >
            {submitStatus === 'submitting' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Creating your workspace…
              </>
            ) : (
              <>
                Create Brand Workspace <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-center text-xs text-blue-200/60 mt-4">
            14-day free trial · No credit card required · Cancel anytime
          </p>

          <p className="text-center text-xs text-blue-200/60 mt-2">
            Already have an account?{' '}
            <a href="/login" className="text-blue-300 hover:text-white underline transition-colors">
              Sign in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
