import { useState, useCallback } from 'react';
import { Plus, Trash2, Send, Copy, CheckCircle, ChevronRight, Users, Link } from 'lucide-react';
import { OnboardingLayout } from '../OnboardingLayout';
import { useOnboarding } from '../OnboardingContext';
import { API_URL } from '../../config/backend';

type InviteRow = { email: string; name: string; role: string; id: string };

const ROLES = ['Admin', 'Staff', 'Sales'];

function newRow(): InviteRow {
  return { email: '', name: '', role: 'Staff', id: Math.random().toString(36).slice(2) };
}

type SentInvite = { email: string; name: string; role: string; invite_url: string };

function authHeaders() {
  const token = localStorage.getItem('access_token') ?? '';
  const tid   = sessionStorage.getItem('tenant_id') ?? '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(tid ? { 'X-Tenant-ID': tid } : {}),
  };
}

export function Step6TeamInvite() {
  const { completeStep } = useOnboarding();
  const [rows,       setRows]       = useState<InviteRow[]>([newRow()]);
  const [sending,    setSending]    = useState(false);
  const [sentInvites,setSentInvites]= useState<SentInvite[]>([]);
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [copied,     setCopied]     = useState<string | null>(null);

  const addRow = () => setRows(r => [...r, newRow()]);
  const removeRow = (id: string) => setRows(r => r.filter(x => x.id !== id));
  const updateRow = (id: string, field: keyof InviteRow, value: string) =>
    setRows(r => r.map(x => x.id === id ? { ...x, [field]: value } : x));

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    rows.forEach(row => {
      if (!row.email.trim()) return; // empty rows are fine
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
        errs[row.id] = 'Invalid email';
      }
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [rows]);

  const handleSend = useCallback(async () => {
    if (!validate()) return;
    const validRows = rows.filter(r => r.email.trim());
    if (validRows.length === 0) {
      completeStep(6);
      return;
    }

    setSending(true);
    const sent: SentInvite[] = [];

    for (const row of validRows) {
      try {
        const res  = await fetch(`${API_URL}/api/invitations`, {
          method:  'POST',
          headers: authHeaders(),
          body:    JSON.stringify({ email: row.email, name: row.name, role_name: row.role }),
        });
        const json = await res.json();
        if (json.success) {
          sent.push({ email: row.email, name: row.name, role: row.role, invite_url: json.data.invite_url });
        }
      } catch {
        // continue
      }
    }

    setSentInvites(sent);
    setSending(false);
  }, [rows, validate, completeStep]);

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(url);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  if (sentInvites.length > 0) {
    return (
      <OnboardingLayout title="Invites ready to share" subtitle="Share the links below via WhatsApp or copy them.">
        <div className="space-y-5">
          <div className="space-y-3">
            {sentInvites.map(inv => (
              <div key={inv.email} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{inv.name || inv.email}</p>
                  <p className="text-xs text-gray-400">{inv.email} · {inv.role}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`You've been invited to join our team!\n\nClick here to set up your account:\n${inv.invite_url}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:opacity-90"
                  >
                    <Send className="w-3 h-3" />
                    WhatsApp
                  </a>
                  <button
                    onClick={() => copyLink(inv.invite_url)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    {copied === inv.invite_url ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    {copied === inv.invite_url ? 'Copied' : 'Copy link'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 text-xs text-blue-800">
            <Link className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Invite links expire in 7 days. You can resend them anytime from Settings → Team.</span>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => completeStep(6)}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout
      title="Invite Your Team"
      subtitle="Add people who will help manage the catalog, orders, or sales. You can skip this and invite them later."
    >
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_140px_40px] gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Email</span>
            <span>Name (optional)</span>
            <span>Role</span>
            <span />
          </div>
          <div className="divide-y divide-gray-50">
            {rows.map(row => (
              <div key={row.id} className="grid grid-cols-[1fr_1fr_140px_40px] gap-3 px-4 py-3 items-center">
                <div>
                  <input
                    type="email"
                    value={row.email}
                    onChange={e => updateRow(row.id, 'email', e.target.value)}
                    placeholder="email@example.com"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${
                      errors[row.id] ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                  {errors[row.id] && <p className="text-xs text-red-500 mt-0.5">{errors[row.id]}</p>}
                </div>
                <input
                  type="text"
                  value={row.name}
                  onChange={e => updateRow(row.id, 'name', e.target.value)}
                  placeholder="Full name"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <select
                  value={row.role}
                  onChange={e => updateRow(row.id, 'role', e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
                <button
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length === 1}
                  className="p-1.5 text-gray-300 hover:text-red-400 disabled:opacity-0 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={addRow}
          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <Plus className="w-4 h-4" />
          Add another person
        </button>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => completeStep(6)}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Skip for now
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => completeStep(6)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
            >
              <Users className="w-4 h-4 inline mr-1.5" />
              Invite later
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Sending…' : 'Send Invites'}
            </button>
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}
