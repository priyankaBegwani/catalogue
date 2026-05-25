/**
 * Internal Tool: Assisted Onboarding Request Inbox
 *
 * Superadmin sees all assistance requests, can:
 * - Filter by status
 * - Update status + add notes
 * - Generate preview link and copy/WhatsApp share it
 * - Create final payment order
 * - Publish designs after payment
 */

import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Phone, Copy, Check, ChevronDown, ChevronRight,
  ExternalLink, AlertCircle, CheckCircle, Clock, Wrench,
  CreditCard, Eye, Download, Share2
} from 'lucide-react';
import { InternalLayout } from './InternalLayout';
import { API_URL } from '../../config/backend';

function authHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:           { label: 'Pending',          color: 'bg-yellow-900/40 text-yellow-300 border-yellow-800/40' },
  in_progress:       { label: 'In Progress',       color: 'bg-blue-900/40 text-blue-300 border-blue-800/40' },
  preview_ready:     { label: 'Preview Ready',     color: 'bg-indigo-900/40 text-indigo-300 border-indigo-800/40' },
  changes_requested: { label: 'Changes Requested', color: 'bg-orange-900/40 text-orange-300 border-orange-800/40' },
  payment_pending:   { label: 'Payment Pending',   color: 'bg-purple-900/40 text-purple-300 border-purple-800/40' },
  paid:              { label: 'Paid',              color: 'bg-green-900/40 text-green-300 border-green-800/40' },
  complete:          { label: 'Complete',          color: 'bg-gray-700 text-gray-300 border-gray-600' },
};

const CATALOG_SIZE_LABELS: Record<string, string> = {
  small: '< 100', medium: '100–500', large: '500–2,000', enterprise: '2,000+',
};

type Request = {
  id: string;
  status: string;
  contact_name: string | null;
  whatsapp_number: string | null;
  call_time: string | null;
  catalog_size: string | null;
  notes: string | null;
  data_links: string[];
  uploaded_file_urls: string[];
  setup_fee_paise: number;
  superadmin_notes: string | null;
  preview_visit_count?: number;
  preview_token: string | null;
  preview_token_expires_at: string | null;
  final_paid_at: string | null;
  published_at: string | null;
  created_at: string;
  tenant: { id: string; name: string; slug: string } | null;
};

const FRONTEND_URL = window.location.origin;

export function AssistanceRequests() {
  const [requests,      setRequests]      = useState<Request[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [filterStatus,  setFilterStatus]  = useState('');
  const [expandedId,    setExpandedId]    = useState<string | null>(null);
  const [copiedId,      setCopiedId]      = useState<string | null>(null);
  const [working,       setWorking]       = useState<string | null>(null); // request id being acted on
  const [error,         setError]         = useState('');

  // Inline edit state per request
  const [editNotes,    setEditNotes]    = useState<Record<string, string>>({});
  const [editFee,      setEditFee]      = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const r = await fetch(`${API_URL}/api/internal/assistance${params}`, { headers: authHeaders() });
      const j = await r.json();
      setRequests(j.data ?? []);
    } catch {
      setError('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const patch = async (id: string, body: Record<string, unknown>) => {
    setWorking(id);
    try {
      const r = await fetch(`${API_URL}/api/internal/assistance/${id}`, {
        method: 'PATCH', headers: authHeaders(true), body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error ?? 'Update failed');
      setRequests(prev => prev.map(req => req.id === id ? { ...req, ...j.data } : req));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setWorking(null);
    }
  };

  const generatePreviewToken = async (id: string) => {
    setWorking(id);
    try {
      const r = await fetch(`${API_URL}/api/internal/assistance/${id}/preview-token`, {
        method: 'POST', headers: authHeaders(),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error ?? 'Failed');
      setRequests(prev => prev.map(req =>
        req.id === id ? { ...req, status: 'preview_ready', preview_token: j.data.preview_token } : req
      ));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setWorking(null);
    }
  };

  const publishDesigns = async (id: string) => {
    if (!confirm('This will make all imported designs live for this tenant. Are you sure?')) return;
    setWorking(id);
    try {
      const r = await fetch(`${API_URL}/api/internal/assistance/${id}/publish`, {
        method: 'POST', headers: authHeaders(),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error ?? 'Publish failed');
      setRequests(prev => prev.map(req =>
        req.id === id ? { ...req, status: 'complete', published_at: new Date().toISOString() } : req
      ));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setWorking(null);
    }
  };

  const copyPreviewLink = async (token: string, id: string) => {
    const url = `${FRONTEND_URL}/preview/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const shareOnWhatsApp = (token: string, name: string | null) => {
    const url = `${FRONTEND_URL}/preview/${token}`;
    const msg = encodeURIComponent(`Hi${name ? ` ${name}` : ''}! Your catalog preview is ready. Please review and approve: ${url}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const exportCSV = (tenantId: string, type: 'designs' | 'colors' | 'photos') => {
    window.open(`${API_URL}/api/internal/export/${tenantId}/${type}`, '_blank');
  };

  return (
    <InternalLayout>
      <div className="p-8 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Assisted Setup Requests</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage all "We Setup For You" onboarding requests</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <button
              onClick={load}
              className="p-2 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-200">✕</button>
          </div>
        )}

        {loading && requests.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 text-gray-600 text-sm">No requests found</div>
        ) : (
          <div className="space-y-2">
            {requests.map(req => {
              const isExpanded = expandedId === req.id;
              const statusInfo = STATUS_LABELS[req.status] ?? STATUS_LABELS.pending;
              const previewUrl = req.preview_token ? `${FRONTEND_URL}/preview/${req.preview_token}` : null;

              return (
                <div key={req.id} className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                  {/* Row header */}
                  <button
                    className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-800/40 transition-colors text-left"
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">
                          {req.tenant?.name ?? 'Unknown tenant'}
                        </span>
                        {req.contact_name && (
                          <span className="text-xs text-gray-400">— {req.contact_name}</span>
                        )}
                        {req.catalog_size && (
                          <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                            {CATALOG_SIZE_LABELS[req.catalog_size] ?? req.catalog_size} designs
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {req.whatsapp_number && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {req.whatsapp_number}
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    }
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-gray-800 space-y-4 pt-4">

                      {/* Info grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        {[
                          { label: 'Preferred call time', value: req.call_time },
                          { label: 'Setup fee', value: req.setup_fee_paise ? `₹${req.setup_fee_paise / 100}` : 'Not set' },
                          { label: 'Preview visits', value: req.preview_visit_count ?? 0 },
                          { label: 'Payment received', value: req.final_paid_at ? new Date(req.final_paid_at).toLocaleDateString('en-IN') : '—' },
                          { label: 'Published at', value: req.published_at ? new Date(req.published_at).toLocaleDateString('en-IN') : '—' },
                          { label: 'Tenant slug', value: req.tenant?.slug ?? '—' },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-gray-800 rounded-xl p-3">
                            <p className="text-gray-500 mb-0.5">{label}</p>
                            <p className="text-gray-200 font-medium">{String(value ?? '—')}</p>
                          </div>
                        ))}
                      </div>

                      {/* Client notes */}
                      {req.notes && (
                        <div className="bg-gray-800 rounded-xl p-3">
                          <p className="text-xs text-gray-500 mb-1">Client notes</p>
                          <p className="text-xs text-gray-300">{req.notes}</p>
                        </div>
                      )}

                      {/* Files + links */}
                      {(req.uploaded_file_urls?.length > 0 || req.data_links?.length > 0) && (
                        <div className="space-y-2">
                          {req.uploaded_file_urls?.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer"
                              className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300">
                              <ExternalLink className="w-3 h-3" /> Uploaded file {i + 1}
                            </a>
                          ))}
                          {req.data_links?.filter(Boolean).map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer"
                              className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300">
                              <ExternalLink className="w-3 h-3" /> {url.length > 50 ? url.slice(0, 50) + '…' : url}
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Setup fee input */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Setup fee (₹)</label>
                          <input
                            type="number"
                            value={editFee[req.id] ?? String((req.setup_fee_paise ?? 99900) / 100)}
                            onChange={e => setEditFee(f => ({ ...f, [req.id]: e.target.value }))}
                            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <button
                          onClick={() => patch(req.id, { setup_fee_paise: Math.round(Number(editFee[req.id] ?? 999) * 100) })}
                          disabled={working === req.id}
                          className="mt-4 px-3 py-1.5 bg-gray-700 text-gray-200 rounded-lg text-xs hover:bg-gray-600 disabled:opacity-40"
                        >
                          Save fee
                        </button>
                      </div>

                      {/* Internal notes */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Internal notes</label>
                        <textarea
                          rows={2}
                          value={editNotes[req.id] ?? (req.superadmin_notes ?? '')}
                          onChange={e => setEditNotes(n => ({ ...n, [req.id]: e.target.value }))}
                          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                          placeholder="Notes visible only to superadmins…"
                        />
                        <button
                          onClick={() => patch(req.id, { superadmin_notes: editNotes[req.id] ?? req.superadmin_notes })}
                          disabled={working === req.id}
                          className="mt-1 px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-600 disabled:opacity-40"
                        >
                          Save notes
                        </button>
                      </div>

                      {/* Status actions */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {/* Status selector */}
                        <select
                          value={req.status}
                          onChange={e => patch(req.id, { status: e.target.value })}
                          disabled={working === req.id}
                          className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-40"
                        >
                          {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>

                        {/* Internal tool links */}
                        {req.tenant?.id && (
                          <>
                            <a
                              href={`/internal/design-completion`}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-gray-300 rounded-xl text-xs hover:bg-gray-700 border border-gray-700"
                            >
                              <Wrench className="w-3.5 h-3.5" /> Design tool
                            </a>
                            <a
                              href={`/internal/image-restructure`}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-gray-300 rounded-xl text-xs hover:bg-gray-700 border border-gray-700"
                            >
                              <Wrench className="w-3.5 h-3.5" /> Image tool
                            </a>
                          </>
                        )}

                        {/* Generate preview token */}
                        {!req.preview_token && (
                          <button
                            onClick={() => generatePreviewToken(req.id)}
                            disabled={working === req.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-700 text-white rounded-xl text-xs hover:bg-indigo-600 disabled:opacity-40"
                          >
                            {working === req.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                            Generate preview link
                          </button>
                        )}

                        {/* Preview link actions */}
                        {previewUrl && (
                          <>
                            <button
                              onClick={() => copyPreviewLink(req.preview_token!, req.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-gray-300 rounded-xl text-xs hover:bg-gray-700 border border-gray-700"
                            >
                              {copiedId === req.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedId === req.id ? 'Copied!' : 'Copy preview link'}
                            </button>
                            <button
                              onClick={() => shareOnWhatsApp(req.preview_token!, req.contact_name)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white rounded-xl text-xs hover:bg-green-600"
                            >
                              <Share2 className="w-3.5 h-3.5" /> Share on WhatsApp
                            </button>
                          </>
                        )}

                        {/* Publish button */}
                        {['paid', 'payment_pending'].includes(req.status) && !req.published_at && (
                          <button
                            onClick={() => publishDesigns(req.id)}
                            disabled={working === req.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white rounded-xl text-xs hover:bg-green-600 disabled:opacity-40"
                          >
                            {working === req.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            Publish designs
                          </button>
                        )}

                        {/* Export buttons */}
                        {req.tenant?.id && (
                          <>
                            <button onClick={() => exportCSV(req.tenant!.id, 'designs')}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-gray-300 rounded-xl text-xs hover:bg-gray-700 border border-gray-700">
                              <Download className="w-3.5 h-3.5" /> Designs CSV
                            </button>
                            <button onClick={() => exportCSV(req.tenant!.id, 'photos')}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-gray-300 rounded-xl text-xs hover:bg-gray-700 border border-gray-700">
                              <Download className="w-3.5 h-3.5" /> Photo manifest
                            </button>
                          </>
                        )}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </InternalLayout>
  );
}
