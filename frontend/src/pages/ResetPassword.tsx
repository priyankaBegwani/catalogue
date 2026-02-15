import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useBranding } from '../hooks/useBranding';
import { ErrorAlert, LoadingSpinner } from '../components';

export function ResetPassword() {
  const navigate = useNavigate();
  const branding = useBranding();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    // Extract token from URL - Supabase uses hash fragment with access_token
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.substring(1));
    
    // Try to get token from hash first (Supabase default)
    let accessToken = hashParams.get('access_token');
    
    // Fallback to query params if not in hash
    if (!accessToken) {
      const searchParams = new URLSearchParams(window.location.search);
      accessToken = searchParams.get('access_token') || searchParams.get('token');
    }
    
    console.log('Reset URL hash:', hash);
    console.log('Extracted token:', accessToken ? 'Token found' : 'No token');
    
    if (accessToken) {
      setToken(accessToken);
    } else {
      setError('Invalid or missing reset token. Please request a new password reset.');
      setVerifying(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    if (!token) {
      setError('Invalid or missing reset token');
      setVerifying(false);
      return;
    }

    try {
      console.log('Verifying token with API...');
      const response = await api.verifyResetToken(token);
      console.log('Token verification response:', response);
      setTokenValid(true);
      setUserEmail(response.email || '');
    } catch (err) {
      console.error('Token verification error:', err);
      setError('This password reset link is invalid or has expired. Please request a new one.');
      setTokenValid(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }, [token, password, confirmPassword, navigate]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex justify-center mb-6">
          <img
            src={branding.logoUrl}
            alt={branding.brandName}
            className="h-24 w-auto"
          />
        </div>

        {!tokenValid ? (
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Invalid Reset Link
            </h2>
            <p className="text-gray-600 mb-6">
              {error}
            </p>
            <button
              onClick={() => navigate('/')}
              className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 transition duration-200"
            >
              Back to Login
            </button>
          </div>
        ) : success ? (
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Password Reset Successfully!
            </h2>
            <p className="text-gray-600 mb-4">
              Your password has been updated. You can now sign in with your new password.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to login page...
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center w-16 h-16 bg-primary bg-opacity-10 rounded-full mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
              Reset Your Password
            </h2>
            {userEmail && (
              <p className="text-gray-600 text-center mb-6 text-sm">
                for <strong>{userEmail}</strong>
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <ErrorAlert message={error} onDismiss={() => setError('')} />

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                    placeholder="Enter new password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Must be at least 6 characters long
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
                    placeholder="Confirm new password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-opacity-90 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    Resetting Password...
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Reset Password
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                disabled={loading}
                className="w-full text-gray-600 py-2 rounded-lg font-medium hover:text-gray-800 transition"
              >
                Back to Login
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
