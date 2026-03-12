import { useState, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../hooks/useBranding';
import { ErrorAlert, LoadingSpinner } from '../components';
import { Mail, Lock, ExternalLink, Shield, Eye, EyeOff } from 'lucide-react';

const ForgotPasswordModal = lazy(() => import('../components/ForgotPasswordModal').then(module => ({ default: module.ForgotPasswordModal })));

interface LoginProps {
  onShowSetup?: () => void;
}

export function Login({ onShowSetup }: LoginProps) {
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

  return (
    <div className="min-h-screen lg:h-screen flex flex-col lg:overflow-hidden relative">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .login-card { animation: fadeUp 0.5s ease; }

        .logo-wrapper { position: relative; }
        .logo-wrapper::before {
          content: "";
          position: absolute;
          inset: -20px;
          background: radial-gradient(
            circle,
            rgba(255, 244, 214, 0.32) 0%,
            rgba(255, 244, 214, 0.12) 40%,
            transparent 70%
          );
          filter: blur(10px);
          z-index: -1;
          pointer-events: none;
        }
      `}</style>

      {/* Full Screen Background Image - All Devices */}
      <div className="absolute inset-0 z-0">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(10,20,40,0.75), rgba(10,20,40,0.55), rgba(10,20,40,0.20)), url('/login-bg.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
        </div>
        
        {/* Handloom Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0-5.523-4.477-10-10-10zm-20 0c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0-5.523-4.477-10-10-10zM30 30c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0-5.523-4.477-10-10-10zm-20 0c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0-5.523-4.477-10-10-10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '40px 40px'
          }}
        />
        
        {/* Gradient Accent Overlays */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#ffbd54]/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[#C6A15B]/15 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Desktop/Tablet - Brand Content (Left Side) */}
      <div className="hidden md:flex absolute left-12 top-1/2 -translate-y-1/2 lg:left-1/4 lg:-translate-x-1/2 z-20 flex-col items-start text-left max-w-md xl:max-w-lg">
        {/* Tagline */}
        <div className="space-y-3 mb-6 ">
          <h1 className="text-3xl lg:text-4xl font-serif font-bold text-white leading-tight">
            Premium Men's
            <br />
            <span className="text-[#ffbd54]">Ethnic Wear</span>
          </h1>
          <p className="text-base text-gray-200 font-light">
            Crafted for the modern gentleman
          </p>
        </div>
        
        {/* Trust Messages */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[#C6A15B] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
            <span className="text-sm text-gray-200">Wholesale access for verified retailers</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[#C6A15B] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
            <span className="text-sm text-gray-200">Factory-direct pricing</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[#C6A15B] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">✓</span>
            </div>
            <span className="text-sm text-gray-200">Fast dispatch across India</span>
          </div>
        </div>
      </div>

      {/* Login Form Container */}
      <div className="flex-1 flex items-center justify-center md:justify-end pt-0 md:pt-0 lg:pt-0 p-4 sm:p-6 md:pr-8 lg:pr-16 relative z-20">
        <div className="w-full max-w-sm">
          {/* Login Card - Enhanced Shadow on Desktop/Tablet */}
          <div
            className="login-card p-5 sm:p-6"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: '16px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
            }}
          >
            {/* Header */}
            <div className="text-center">
             
              <div className="mb-2 flex justify-center h-[80px] items-center overflow-hidden">
                <img
                  src="/indiecraft_logo.svg"
                  alt={branding.brandName}
                  className="h-[110px] w-auto"
                  loading="eager"
                  decoding="sync"
                />
              </div>
              <div className="mb-3 flex justify-center">
                <p className="text-sm text-gray-500 mt-2 tracking-wide">
    Retailer Portal
  </p>
              </div>
              
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <ErrorAlert message={error} onDismiss={() => setError('')} />

              {/* Email/Mobile Field */}
              <div>
                <label htmlFor="emailOrUsername" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email / Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="emailOrUsername"
                    type="text"
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#C6A15B] focus:border-[#C6A15B] focus:bg-white transition-all duration-300 text-gray-900 placeholder:text-gray-400 text-base"
                    placeholder="Enter your email or mobile"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#C6A15B] focus:border-[#C6A15B] focus:bg-white transition-all duration-300 text-gray-900 placeholder:text-gray-400 text-base"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#1e3473] to-[#2a4a8f] text-white py-3 rounded-2xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0 hover:shadow-[0_8px_18px_rgba(0,0,0,0.2)]"
                style={{ transition: 'all 0.25s ease' }}
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Login</span>
                )}
              </button>

            </form>

            {/* Below Login Links */}
            <div className="mt-4 space-y-2">
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-gray-600 hover:text-[#1e3473] font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              
              <div className="pt-3 border-t border-gray-200">
                <a
                  href="https://wa.me/919876543210?text=Hi%20IndieCraft%20Team%2C%20I%20want%20to%20apply%20for%20a%20wholesale%20account."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-sm font-medium text-gray-700 hover:text-[#C6A15B] transition-colors group"
                >
                  <span>Apply for wholesale account</span>
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>
            </div>
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
