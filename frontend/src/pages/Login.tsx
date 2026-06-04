import { useState, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBranding, getWhatsAppUrl } from '../hooks/useBranding';
import { ErrorAlert, LoadingSpinner, WholllioLogo } from '../components';
import { Mail, Lock, ExternalLink, Eye, EyeOff } from 'lucide-react';

const ForgotPasswordModal = lazy(() => import('../components/ForgotPasswordModal').then(module => ({ default: module.ForgotPasswordModal })));

interface LoginProps {
  onShowSetup?: () => void;
}


const WHOLLIO_FEATURES = [
  'Beautiful product catalogs, instantly',
  'Manage retailers and wholesale orders',
  'WhatsApp sharing built-in',
];

const TENANT_FEATURES = [
  'Wholesale access for verified partners',
  'Competitive pricing, direct from source',
  'Fast dispatch and reliable delivery',
];

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

  const isWhollio  = !branding.hasCustomBranding;
  const ctaColor   = isWhollio ? '#E8A838' : (branding.accentColor  || '#E8A838');
  const focusColor = isWhollio ? '#0D7377' : (branding.primaryColor || '#0D7377');
  const features   = isWhollio ? WHOLLIO_FEATURES : TENANT_FEATURES;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #060F1A 0%, #091628 40%, #0C1E30 70%, #0A1825 100%)' }}
    >
      {/* Dot-grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.042) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Teal radial glow — top right */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-80px', right: '-60px',
          width: '560px', height: '560px',
          background: 'radial-gradient(circle at center, rgba(13,115,119,0.18) 0%, transparent 65%)',
        }}
      />

      {/* Amber radial glow — bottom left */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '-80px', left: '-60px',
          width: '460px', height: '460px',
          background: 'radial-gradient(circle at center, rgba(232,130,12,0.13) 0%, transparent 65%)',
        }}
      />

      {/* Thin gradient border line across top */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(13,115,119,0.5) 40%, rgba(232,168,56,0.4) 60%, transparent)' }}
      />

      <div className="w-full max-w-[920px] flex flex-col lg:flex-row items-center gap-12 lg:gap-20 relative z-10">

        {/* ── Left panel (desktop only) ─────────────────────────────────────── */}
        <div className="hidden lg:flex flex-col flex-1 min-w-0">
          {isWhollio ? (
            <WholllioLogo variant="light" size="lg" />
          ) : (
            <img
              src={branding.logoUrl}
              alt={branding.brandName}
              className="h-14 w-auto object-contain object-left"
            />
          )}

          <h2
            className="mt-7 text-[2.1rem] font-bold leading-snug tracking-tight"
            style={{ color: '#EBE8E3' }}
          >
            {isWhollio
              ? <>Your white-label<br />catalog platform</>
              : branding.brandName}
          </h2>

          <p className="mt-3.5 text-[0.9375rem] leading-relaxed" style={{ color: '#7A9DB5' }}>
            {isWhollio
              ? <>Sign in to manage your catalog,<br />retailers, and orders.</>
              : (branding.tagline ?? 'Sign in to your wholesale account.')}
          </p>

          {/* Teal accent line */}
          <div
            className="mt-9 mb-8 w-10 h-px rounded-full"
            style={{ background: 'linear-gradient(90deg, #0D9DA3, transparent)' }}
          />

          <ul className="space-y-4">
            {features.map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm" style={{ color: '#7A9DB5' }}>
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: 'rgba(13,115,119,0.15)',
                    border: '1px solid rgba(13,157,163,0.35)',
                  }}
                >
                  <span style={{ color: '#0D9DA3', fontSize: '10px', fontWeight: 700, lineHeight: 1 }}>✓</span>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Login card ───────────────────────────────────────────────────── */}
        <div className="w-full max-w-[390px] shrink-0">

          {/* Mobile: logo above card */}
          <div className="lg:hidden flex flex-col items-center gap-2 mb-7 text-center">
            {isWhollio ? (
              <WholllioLogo variant="light" size="md" />
            ) : (
              <img src={branding.logoUrl} alt={branding.brandName} className="h-12 w-auto object-contain" />
            )}
            <p className="text-sm" style={{ color: '#7A9DB5' }}>
              {isWhollio ? 'Sign in to your workspace' : `Welcome back to ${branding.brandName}`}
            </p>
          </div>

          {/* White card */}
          <div
            className="rounded-[22px] px-8 pt-8 pb-7"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 12px 28px rgba(0,0,0,0.22)',
            }}
          >
            {/* Card logo (desktop only — mobile sees it above) */}
            <div className="hidden lg:flex flex-col items-center mb-7">
              {isWhollio ? (
                <WholllioLogo variant="dark" size="md" />
              ) : (
                <img src={branding.logoUrl} alt={branding.brandName} className="h-10 w-auto object-contain" />
              )}
              <p className="mt-2 text-sm" style={{ color: '#6B7280' }}>
                {isWhollio ? 'Sign in to your workspace' : `Welcome back to ${branding.brandName}`}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <ErrorAlert message={error} onDismiss={() => setError('')} />

              {/* Email */}
              <div>
                <label
                  htmlFor="emailOrUsername"
                  className="block text-[0.8125rem] font-semibold mb-1.5"
                  style={{ color: '#374151' }}
                >
                  Email / Mobile Number
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                    style={{ color: '#9CA3AF' }}
                  />
                  <input
                    id="emailOrUsername"
                    type="text"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all"
                    style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = focusColor;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${focusColor}22`;
                      e.currentTarget.style.background = '#FFFFFF';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#E5E7EB';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.background = '#F9FAFB';
                    }}
                    placeholder="Enter your email or mobile"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="text-[0.8125rem] font-semibold" style={{ color: '#374151' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs font-medium transition-opacity hover:opacity-75"
                    style={{ color: focusColor }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                    style={{ color: '#9CA3AF' }}
                  />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-11 py-2.5 text-sm rounded-xl outline-none transition-all"
                    style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB', color: '#111827' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = focusColor;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${focusColor}22`;
                      e.currentTarget.style.background = '#FFFFFF';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#E5E7EB';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.background = '#F9FAFB';
                    }}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#9CA3AF' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#6B7280'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Sign In button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-[0.9375rem] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
                style={{
                  background: `linear-gradient(135deg, ${ctaColor} 0%, #CF8E22 100%)`,
                  color: '#0A1520',
                  boxShadow: `0 4px 18px ${ctaColor}55`,
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = `0 8px 24px ${ctaColor}70`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = `0 4px 18px ${ctaColor}55`;
                }}
              >
                {loading ? (
                  <><LoadingSpinner /><span>Signing in…</span></>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            {/* WhatsApp wholesale link */}
            {whatsappUrl && (
              <div className="mt-5 pt-4 text-center" style={{ borderTop: '1px solid #F3F4F6' }}>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                  style={{ color: '#9CA3AF' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = focusColor; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
                >
                  Apply for wholesale account
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Powered by Whollio (custom brand only) */}
            {!isWhollio && (
              <div className="mt-4 pt-3.5 flex items-center justify-center gap-2" style={{ borderTop: '1px solid #F3F4F6' }}>
                <span className="text-xs" style={{ color: '#C4C9D1' }}>Powered by</span>
                <WholllioLogo variant="dark" size="sm" />
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
