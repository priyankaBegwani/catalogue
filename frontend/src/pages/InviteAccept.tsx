import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Eye, EyeOff, AlertTriangle, Loader } from 'lucide-react';
import { useBranding } from '../hooks/useBranding';
import { API_URL } from '../config/backend';

type InviteData = {
  email:         string;
  name:          string | null;
  role_name:     string;
  business_name: string | null;
};

export function InviteAccept() {
  const { token }   = useParams<{ token: string }>();
  const navigate    = useNavigate();
  const branding    = useBranding();

  const [invite,    setInvite]    = useState<InviteData | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [invalid,   setInvalid]   = useState(false);

  const [fullName,  setFullName]  = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [submitting,setSubmitting]= useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) { setInvalid(true); setLoading(false); return; }
    fetch(`${API_URL}/api/invitations/accept/${token}`)
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          setInvite(json.data);
          setFullName(json.data.name ?? '');
        } else {
          setInvalid(true);
        }
      })
      .catch(() => setInvalid(true))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) { setError('Please enter your name'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }

    setSubmitting(true);
    try {
      const res  = await fetch(`${API_URL}/api/invitations/accept/${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ full_name: fullName, password }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess(true);
        setTimeout(() => navigate('/'), 3000);
      } else {
        setError(json.message ?? 'Something went wrong');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Invite Link Invalid</h1>
          <p className="text-sm text-gray-500">
            This invite link has expired or already been used. Please contact your team admin for a new link.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Account Created!</h1>
          <p className="text-sm text-gray-500">
            You've joined <strong>{invite?.business_name ?? 'the team'}</strong> as {invite?.role_name}.
            Redirecting you to login…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={branding.logoUrl} alt={branding.brandName} className="h-12 w-auto" />
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-gray-900">You've been invited!</h1>
            <p className="text-sm text-gray-500 mt-1">
              Join <strong>{invite?.business_name ?? 'the team'}</strong> as <strong>{invite?.role_name}</strong>
            </p>
            <p className="text-xs text-gray-400 mt-1">{invite?.email}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Your name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Full name"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Create password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {submitting ? 'Creating account…' : 'Create my account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default InviteAccept;
