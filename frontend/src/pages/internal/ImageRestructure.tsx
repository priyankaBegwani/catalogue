/**
 * Internal Tool: Image Folder Restructure
 *
 * 1. Superadmin selects target tenant + uploads a ZIP of client photos
 * 2. Backend parses ZIP → returns tree of design_no / color_name / file_count
 * 3. Superadmin reviews + corrects any wrong mappings in a table
 * 4. Confirm → backend uploads each photo to R2 and updates design_colors
 */

import { useState, useRef } from 'react';
import { Upload, FolderOpen, CheckCircle, AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { InternalLayout } from './InternalLayout';
import { API_URL } from '../../config/backend';

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}` };
}

type Tenant = { id: string; name: string; slug: string };

type ParsedRow = {
  design_no:   string;
  color_name:  string;
  file_count:  number;
  files:       string[];
};

type MappingRow = ParsedRow & {
  original_design_no:  string;
  original_color_name: string;
};

type UploadResult = {
  uploaded: number;
  failed:   number;
  skipped:  number;
  errors:   string[];
  db_errors: string[];
};

type Phase = 'select' | 'parse' | 'review' | 'uploading' | 'done';

export function ImageRestructure() {
  const [tenants,     setTenants]     = useState<Tenant[]>([]);
  const [tenantId,    setTenantId]    = useState('');
  const [tenantsLoaded, setTenantsLoaded] = useState(false);

  const [phase,       setPhase]       = useState<Phase>('select');
  const [zipFile,     setZipFile]     = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<{ total_images: number; design_count: number; color_variant_count: number; rows: ParsedRow[] } | null>(null);
  const [mapping,     setMapping]     = useState<MappingRow[]>([]);
  const [result,      setResult]      = useState<UploadResult | null>(null);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [expandErrors, setExpandErrors] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const loadTenants = async () => {
    if (tenantsLoaded) return;
    try {
      const r = await fetch(`${API_URL}/api/internal/design-completion/tenants`, { headers: authHeaders() });
      const j = await r.json();
      setTenants(j.data ?? []);
      setTenantsLoaded(true);
    } catch {
      setError('Failed to load tenants');
    }
  };

  const handleParse = async () => {
    if (!zipFile || !tenantId) return;
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('zip', zipFile);
      fd.append('tenant_id', tenantId);
      const r = await fetch(`${API_URL}/api/internal/image-restructure/parse`, {
        method:  'POST',
        headers: authHeaders(),
        body:    fd,
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error ?? 'Parse failed');
      setParseResult(j.data);
      setMapping(j.data.rows.map((row: ParsedRow) => ({
        ...row,
        original_design_no:  row.design_no,
        original_color_name: row.color_name,
      })));
      setPhase('review');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const updateMapping = (idx: number, field: 'design_no' | 'color_name', val: string) => {
    setMapping(m => m.map((row, i) => i === idx ? { ...row, [field]: val } : row));
  };

  const handleUpload = async () => {
    if (!zipFile || !tenantId) return;
    setLoading(true);
    setError('');
    setPhase('uploading');
    try {
      const fd = new FormData();
      fd.append('zip', zipFile);
      fd.append('tenant_id', tenantId);
      fd.append('mapping', JSON.stringify(mapping));
      const r = await fetch(`${API_URL}/api/internal/image-restructure/upload`, {
        method:  'POST',
        headers: authHeaders(),
        body:    fd,
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error ?? 'Upload failed');
      setResult(j.data);
      setPhase('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('review');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPhase('select');
    setZipFile(null);
    setParseResult(null);
    setMapping([]);
    setResult(null);
    setError('');
  };

  return (
    <InternalLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-xl font-bold text-white mb-1">Image Folder Restructure</h1>
        <p className="text-sm text-gray-400 mb-8">
          Upload a client's photo ZIP in any folder structure. System infers design_no/color_name, lets you correct, then uploads to R2.
        </p>

        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Step 1: Tenant + ZIP selection */}
        {(phase === 'select' || phase === 'parse') && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Target Tenant</label>
              <select
                value={tenantId}
                onChange={e => setTenantId(e.target.value)}
                onFocus={loadTenants}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Select tenant…</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Photo ZIP File</label>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  zipFile ? 'border-indigo-500 bg-indigo-900/20' : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => fileRef.current?.click()}
              >
                <FolderOpen className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                {zipFile
                  ? <p className="text-sm text-indigo-300 font-medium">{zipFile.name} ({(zipFile.size / 1024 / 1024).toFixed(1)} MB)</p>
                  : <p className="text-sm text-gray-500">Click to select ZIP file (max 500 MB)</p>
                }
                <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={e => { setZipFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
              </div>
            </div>

            <button
              onClick={handleParse}
              disabled={!tenantId || !zipFile || loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 disabled:opacity-40 transition-colors"
            >
              {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Parsing…</> : <><Upload className="w-4 h-4" /> Parse ZIP</>}
            </button>
          </div>
        )}

        {/* Step 2: Review + correct mapping */}
        {phase === 'review' && parseResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total images',    value: parseResult.total_images },
                { label: 'Unique designs',  value: parseResult.design_count },
                { label: 'Color variants',  value: parseResult.color_variant_count },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Review mappings</h2>
                <p className="text-xs text-gray-400">Edit any incorrect design_no or color_name before uploading</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 border-b border-gray-800">
                      <th className="text-left px-4 py-2.5">Design No</th>
                      <th className="text-left px-4 py-2.5">Color Name</th>
                      <th className="text-left px-4 py-2.5">Files</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mapping.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="px-4 py-2">
                          <input
                            value={row.design_no}
                            onChange={e => updateMapping(idx, 'design_no', e.target.value)}
                            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={row.color_name}
                            onChange={e => updateMapping(idx, 'color_name', e.target.value)}
                            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-full"
                          />
                        </td>
                        <td className="px-4 py-2 text-gray-400 text-xs">{row.file_count} photo{row.file_count !== 1 ? 's' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="px-4 py-2.5 text-sm text-gray-400 border border-gray-700 rounded-xl hover:border-gray-600 hover:text-gray-200 transition-colors"
              >
                Start over
              </button>
              <button
                onClick={handleUpload}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 disabled:opacity-40 transition-colors"
              >
                {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Uploading…</> : 'Upload to R2'}
              </button>
            </div>
          </div>
        )}

        {/* Uploading indicator */}
        {phase === 'uploading' && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-10 text-center">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-300 font-medium">Uploading photos to R2…</p>
            <p className="text-xs text-gray-500 mt-1">This may take a while for large ZIPs. Please keep this tab open.</p>
          </div>
        )}

        {/* Done */}
        {phase === 'done' && result && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h2 className="text-base font-bold text-white">Upload complete</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Uploaded',  value: result.uploaded,  color: 'text-green-400' },
                { label: 'Failed',    value: result.failed,    color: 'text-red-400'   },
                { label: 'Skipped',   value: result.skipped,   color: 'text-yellow-400'},
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-800 rounded-xl p-4 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {(result.errors.length > 0 || result.db_errors.length > 0) && (
              <div>
                <button
                  onClick={() => setExpandErrors(x => !x)}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300"
                >
                  {expandErrors ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {result.errors.length + result.db_errors.length} error{result.errors.length + result.db_errors.length !== 1 ? 's' : ''}
                </button>
                {expandErrors && (
                  <ul className="mt-2 bg-gray-800 rounded-xl p-3 space-y-1 max-h-48 overflow-y-auto">
                    {[...result.errors, ...result.db_errors].map((e, i) => (
                      <li key={i} className="text-xs text-red-300 font-mono">{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <button onClick={reset} className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-gray-200 rounded-xl text-sm hover:bg-gray-700 transition-colors">
              <RefreshCw className="w-4 h-4" /> Process another ZIP
            </button>
          </div>
        )}
      </div>
    </InternalLayout>
  );
}
