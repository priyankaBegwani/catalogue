import { useState, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBranding, getWhatsAppUrl } from '../hooks/useBranding';
import { ErrorAlert, LoadingSpinner } from '../components';
import { Mail, Lock, ExternalLink, Eye, EyeOff } from 'lucide-react';

const ForgotPasswordModal = lazy(() => import('../components/ForgotPasswordModal').then(module => ({ default: module.ForgotPasswordModal })));

interface LoginProps {
  onShowSetup?: () => void;
}

// Whollio wordmark shown when tenant hasn't set a logo yet
function WholllioWordmark() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
        <span className="text-white font-bold text-lg leading-none">W</span>
      </div>
      <span className="text-2xl font-bold text-white tracking-tight">Whollio</span>
    </div>
  );
}

export function Login(_props: LoginProps) {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const branding = useBranding();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(emailOrUsername, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login');
    } finally {
      setLoading(false);
    }
  }, [emailOrUsername, password, login]);

  const whatsappUrl = branding.whatsappNumber
    ? getWhatsAppUrl(`Hi ${branding.brandName} Team, I want to apply for a wholesale account.`, branding.whatsappNumber)
    : null;

  const isWhollio = !branding.hasCustomBranding;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl flex flex-col lg:flex-row items-center gap-10 lg:gap-16 relative z-10">

        {/* ── Left panel ──────────────────────────────────────────────────── */}
        <div className="hidden lg:flex flex-col flex-1 text-left">
          {isWhollio ? (
            <>
              <WholllioWordmark />
              <h2 className="mt-6 text-3xl font-bold text-white leading-snug">
                Your white-label<br />catalog platform
              </h2>
              <p className="mt-3 text-blue-200/80 text-base">
                Sign in to manage your catalog,<br />retailers, and orders.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  'Beautiful product catalogs, instantly',
                  'Manage retailers and wholesale orders',
                  'WhatsApp sharing built-in',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-white/70">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                      <span className="text-blue-300 text-xs">✓</span>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <img
                src={branding.logoUrl}
                alt={branding.brandName}
                className="h-16 w-auto object-contain"
              />
              <h2 className="mt-6 text-3xl font-bold text-white leading-snug">
                {branding.brandName}
              </h2>
              {branding.tagline && (
                <p className="mt-2 text-blue-200/80 text-base">{branding.tagline}</p>
              )}
              <ul className="mt-8 space-y-3">
                {[
                  'Wholesale access for verified partners',
                  'Competitive pricing, direct from source',
                  'Fast dispatch and reliable delivery',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-white/70">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                      <span className="text-blue-300 text-xs">✓</span>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* ── Mobile logo — shown above the card on small screens ─────────── */}
        <div className="lg:hidden flex flex-col items-center gap-2 text-center">
          {isWhollio ? (
            <WholllioWordmark />
          ) : (
            <img
              src={branding.logoUrl}
              alt={branding.brandName}
              className="h-14 w-auto object-contain"
            />
          )}
          <p className="text-sm text-blue-200/80">
            {isWhollio ? 'Sign in to your workspace' : `Welcome back to ${branding.brandName}`}
          </p>
        </div>

        {/* ── Login card ──────────────────────────────────────────────────── */}
        <div className="w-full max-w-sm">
          <div
            className="rounded-2xl p-7 shadow-2xl"
            style={{
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.3)',
            }}
          >
            {/* Card header — logo only shown on desktop; mobile sees it above the card */}
            <div className="hidden lg:block mb-6 text-center">
              {isWhollio ? (
                <div className="flex justify-center mb-3">
                  <WholllioWordmark />
                </div>
              ) : (
                <div className="flex justify-center mb-3 h-14 items-center overflow-hidden">
                  <img
                    src={branding.logoUrl}
                    alt={branding.brandName}
                    className="h-12 w-auto object-contain"
                  />
                </div>
              )}
              <p className="text-sm text-gray-500">
                {isWhollio ? 'Sign in to your workspace' : `Welcome back to ${branding.brandName}`}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <ErrorAlert message={error} onDismiss={() => setError('')} />

              <div>
                <label htmlFor="emailOrUsername" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email / Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="emailOrUsername"
                    type="text"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all text-gray-900 placeholder:text-gray-400 text-sm"
                    placeholder="Enter your email or mobile"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all text-gray-900 placeholder:text-gray-400 text-sm"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg transition-all"
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            <div className="mt-4 space-y-2">
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-gray-500 hover:text-blue-600 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {whatsappUrl && (
                <div className="pt-3 border-t border-gray-100">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors group"
                  >
                    <span>Apply for wholesale account</span>
                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              )}
            </div>

            {/* Powered by Whollio — shown only when displaying a custom brand */}
            {!isWhollio && (
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-center gap-1.5">
                <span className="text-xs text-gray-400">Powered by</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-white font-bold text-[9px] leading-none">W</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-500">Whollio</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
        />
      </Suspense>
    </div>
  );
}
