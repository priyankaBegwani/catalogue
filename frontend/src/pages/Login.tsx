import { useState, useCallback, lazy, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBranding } from '../hooks/useBranding';
import { ErrorAlert, LoadingSpinner } from '../components';

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
    <div className="min-h-screen bg-gradient-to-br from-secondary to-white flex items-center justify-center px-4 pt-2 pb-4 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex justify-center">
          <img
            src={branding.logoUrl}
            alt={branding.brandName}
            className="h-36 w-auto"
            loading="eager"
            decoding="sync"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <ErrorAlert message={error} onDismiss={() => setError('')} />

          <div>
            <label htmlFor="emailOrUsername" className="block text-sm font-medium text-gray-700 mb-2">
              Username or Email
            </label>
            <input
              id="emailOrUsername"
              type="text"
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
              placeholder="Enter username or email"
              autoComplete="username"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-primary hover:text-opacity-80 font-medium transition"
              >
                Forgot Password?
              </button>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <LoadingSpinner />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
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
