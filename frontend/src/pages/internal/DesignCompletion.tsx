/**
 * Internal Tool: Design Data Completion
 *
 * 1. Select tenant + upload raw CSV/Excel
 * 2. Backend parses + auto-completes what it can (rule-based)
 * 3. Review stats, unmapped categories (superadmin maps them), preview table
 * 4. Optional: AI Enhance with cost shown upfront
 * 5. Import to tenant's DB
 */

import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Sparkles, CheckCircle, AlertCircle, ChevronDown, ChevronUp, RefreshCw, Info } from 'lucide-react';
import { InternalLayout } from './InternalLayout';
import { API_URL } from '../../config/backend';

function authHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

type Tenant = { id: string; name: string; slug: string };

type TenantCategory = { id: string; name: string };

type Stats = {
  missing_description: number;
  missing_department:  number;
  missing_category:    number;
  missing_work_type:   number;
  missing_occasion:    number;
  missing_collection:  number;
};

type AiEnhanceInfo = {
  fields:             string[];
  estimated_cost_usd: number;
  estimated_cost_inr: number;
  row_count:          number;
};

type ParsedResult = {
  headers:             string[];
  detected_column_map: Record<string, string>;
  total_rows:          number;
  auto_filled_rows:    number;
  stats:               Stats;
  unmapped_categories: string[];
  tenant_categories:   TenantCategory[];
  ai_enhance:          AiEnhanceInfo;
  preview:             Record<string, unknown>[];
  all_rows:            Record<string, unknown>[];
};

type ImportResult = {
  inserted: number;
  updated:  number;
  skipped:  number;
  errors:   string[];
};

type Phase = 'select' | 'parsed' | 'ai_enhancing' | 'done';

const FIELD_LABELS: Record<string, string> = {
  missing_description: 'Description',
  missing_department:  'Department',
  missing_category:    'Category',
  missing_work_type:   'Work Type',
  missing_occasion:    'Occasion',
  missing_collection:  'Collection',
};

export function DesignCompletion() {
  const [tenants,       setTenants]       = useState<Tenant[]>([]);
  const [tenantId,      setTenantId]      = useState('');
  const [tenantsLoaded, setTenantsLoaded] = useState(false);

  const [file,          setFile]          = useState<File | null>(null);
  const [phase,         setPhase]         = useState<Phase>('select');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');

  const [parsed,        setParsed]        = useState<ParsedResult | null>(null);
  const [rows,          setRows]          = useState<Record<string, unknown>[]>([]);

  // Category map: source_name → category_id (filled by superadmin for unmapped ones)
  const [catMap,        setCatMap]        = useState<Record<string, string>>({});

  const [aiCostConfirmed, setAiCostConfirmed] = useState(false);
  const [importResult,  setImportResult]  = useState<ImportResult | null>(null);
  const [expandErrors,  setExpandErrors]  = useState(false);
  const [showPreview,   setShowPreview]   = useState(false);
  const [aiUsed,        setAiUsed]        = useState(false);
  const [aiCostUsd,     setAiCostUsd]     = useState(0);

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
    if (!file || !tenantId) return;
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('tenant_id', tenantId);
      const r = await fetch(`${API_URL}/api/internal/design-completion/parse`, {
        method: 'POST',
        headers: authHeaders(),
        body: fd,
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error ?? 'Parse failed');
      setParsed(j.data);
      setRows(j.data.all_rows);
      setPhase('parsed');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleAiEnhance = async () => {
    if (!parsed || !tenantId) return;
    setLoading(true);
    setPhase('ai_enhancing');
    setError('');
    try {
      const r = await fetch(`${API_URL}/api/internal/design-completion/ai-enhance`, {
        method:  'POST',
        headers: authHeaders(true),
        body:    JSON.stringify({ rows, tenant_id: tenantId }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error ?? 'AI enhance failed');
      setRows(j.data.rows);
      setAiUsed(true);
      setAiCostUsd(j.data.actual_cost_usd);
      setPhase('parsed');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('parsed');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!tenantId || rows.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`${API_URL}/api/internal/design-completion/execute`, {
        method:  'POST',
        headers: authHeaders(true),
        body:    JSON.stringify({ tenant_id: tenantId, rows, category_map: catMap, ai_used: aiUsed, ai_cost_usd: aiCostUsd }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error ?? 'Import failed');
      setImportResult(j.data);
      setPhase('done');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPhase('select');
    setFile(null);
    setParsed(null);
    setRows([]);
    setCatMap({});
    setAiCostConfirmed(false);
    setImportResult(null);
    setError('');
    setAiUsed(false);
    setAiCostUsd(0);
    setShowPreview(false);
  };

  const completionPct = parsed
    ? Math.round((parsed.auto_filled_rows / parsed.total_rows) * 100)
    : 0;

  return (
    <InternalLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <h1 className="text-xl font-bold text-white mb-1">Design Data Completion</h1>
        <p className="text-sm text-gray-400 mb-8">
          Upload a client's raw design CSV/Excel. System auto-completes what it can, then optionally uses AI for the rest.
        </p>

        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Step 1: Select tenant + upload file */}
        {phase === 'select' && (
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
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Design CSV / Excel File</label>
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  file ? 'border-indigo-500 bg-indigo-900/20' : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={() => fileRef.current?.click()}
              >
                <FileSpreadsheet className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                {file
                  ? <p className="text-sm text-indigo-300 font-medium">{file.name}</p>
                  : <p className="text-sm text-gray-500">Click to select .csv, .xlsx, or .xls</p>
                }
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { setFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
              </div>
            </div>

            <button
              onClick={handleParse}
              disabled={!tenantId || !file || loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 disabled:opacity-40 transition-colors"
            >
              {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Parsing…</> : <><Upload className="w-4 h-4" /> Parse & Auto-complete</>}
            </button>
          </div>
        )}

        {/* Step 2: Review completion stats */}
        {(phase === 'parsed' || phase === 'ai_enhancing') && parsed && (
          <div className="space-y-5">

            {/* Completion overview */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-white">Auto-completion result</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{parsed.total_rows} designs parsed from file</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-indigo-400">{completionPct}%</span>
                  <p className="text-xs text-gray-400">auto-filled</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${completionPct}%` }} />
              </div>

              {/* Missing fields */}
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(parsed.stats).map(([key, count]) => (
                  <div key={key} className={`rounded-lg p-2.5 flex items-center justify-between ${count === 0 ? 'bg-green-900/20' : 'bg-gray-800'}`}>
                    <span className="text-xs text-gray-400">{FIELD_LABELS[key]}</span>
                    {count === 0
                      ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                      : <span className="text-xs font-semibold text-red-400">{count} missing</span>
                    }
                  </div>
                ))}
              </div>
            </div>

            {/* Unmapped categories */}
            {parsed.unmapped_categories.length > 0 && (
              <div className="bg-gray-900 rounded-2xl border border-yellow-800/40 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-yellow-400" />
                  <h2 className="text-sm font-bold text-white">Unmapped categories</h2>
                  <span className="text-xs text-yellow-400">{parsed.unmapped_categories.length} to map</span>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  These category names from the client's CSV aren't in this tenant's category list. Map them to an existing category:
                </p>
                <div className="space-y-2">
                  {parsed.unmapped_categories.map(srcCat => (
                    <div key={srcCat} className="flex items-center gap-3">
                      <span className="text-xs text-gray-300 bg-gray-800 rounded-lg px-2.5 py-1.5 min-w-[160px] font-mono">{srcCat}</span>
                      <span className="text-gray-600 text-xs">→</span>
                      <select
                        value={catMap[srcCat] ?? ''}
                        onChange={e => setCatMap(m => ({ ...m, [srcCat]: e.target.value }))}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">Leave unmapped</option>
                        {parsed.tenant_categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview table */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
              <button
                className="w-full px-4 py-3 text-left flex items-center justify-between border-b border-gray-800"
                onClick={() => setShowPreview(x => !x)}
              >
                <span className="text-sm font-semibold text-white">Preview (first 20 rows)</span>
                {showPreview ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {showPreview && (
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-gray-800">
                        {['design_no', 'name', 'department', 'category_id', 'price', 'work_type', 'description'].map(h => (
                          <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsed.preview.map((row, i) => (
                        <tr key={i} className="border-b border-gray-800/50">
                          {['design_no', 'name', 'department', 'category_id', 'price', 'work_type', 'description'].map(f => (
                            <td key={f} className={`px-3 py-2 ${row[f] ? 'text-gray-300' : 'text-gray-600 italic'}`}>
                              {row[f] != null && String(row[f]).length > 0
                                ? String(row[f]).slice(0, 30)
                                : '—'
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* AI Enhance section */}
            {!aiUsed && (
              <div className="bg-gray-900 rounded-2xl border border-indigo-800/40 p-5">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h2 className="text-sm font-bold text-white mb-1">AI Enhance (optional)</h2>
                    <p className="text-xs text-gray-400 mb-3">
                      Fill <span className="text-indigo-300 font-medium">{parsed.ai_enhance.fields.join(', ')}</span> using GPT-3.5-turbo based on design name + category.
                    </p>
                    <div className="bg-gray-800 rounded-xl p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">{parsed.ai_enhance.row_count} designs</span>
                        <div className="text-right">
                          <span className="text-sm font-bold text-indigo-300">~₹{parsed.ai_enhance.estimated_cost_inr}</span>
                          <span className="text-xs text-gray-500 ml-1">(${parsed.ai_enhance.estimated_cost_usd})</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={aiCostConfirmed}
                          onChange={e => setAiCostConfirmed(e.target.checked)}
                          className="w-3.5 h-3.5 accent-indigo-500"
                        />
                        I confirm the estimated cost
                      </label>
                      <button
                        onClick={handleAiEnhance}
                        disabled={!aiCostConfirmed || loading || phase === 'ai_enhancing'}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-500 disabled:opacity-40 transition-colors"
                      >
                        {phase === 'ai_enhancing'
                          ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enhancing…</>
                          : <><Sparkles className="w-3.5 h-3.5" /> Run AI Enhance</>
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {aiUsed && (
              <div className="bg-green-900/20 border border-green-800/40 rounded-xl px-4 py-3 flex items-center gap-2 text-xs text-green-300">
                <CheckCircle className="w-4 h-4" />
                AI enhance complete — actual cost: ₹{(aiCostUsd * 84).toFixed(2)} (${aiCostUsd})
              </div>
            )}

            {/* Import CTA */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={reset}
                className="px-4 py-2.5 text-sm text-gray-400 border border-gray-700 rounded-xl hover:border-gray-600 hover:text-gray-200 transition-colors"
              >
                Start over
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-500 disabled:opacity-40 transition-colors"
              >
                {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Importing…</> : <>Import {rows.length} designs</>}
              </button>
            </div>
          </div>
        )}

        {/* Done */}
        {phase === 'done' && importResult && (
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h2 className="text-base font-bold text-white">Import complete</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Inserted',  value: importResult.inserted,  color: 'text-green-400'  },
                { label: 'Updated',   value: importResult.updated,   color: 'text-blue-400'   },
                { label: 'Skipped',   value: importResult.skipped,   color: 'text-yellow-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-gray-800 rounded-xl p-4 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {importResult.errors.length > 0 && (
              <div>
                <button
                  onClick={() => setExpandErrors(x => !x)}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300"
                >
                  {expandErrors ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {importResult.errors.length} error{importResult.errors.length !== 1 ? 's' : ''}
                </button>
                {expandErrors && (
                  <ul className="mt-2 bg-gray-800 rounded-xl p-3 space-y-1 max-h-48 overflow-y-auto">
                    {importResult.errors.map((e, i) => (
                      <li key={i} className="text-xs text-red-300 font-mono">{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <button onClick={reset} className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-gray-200 rounded-xl text-sm hover:bg-gray-700 transition-colors">
              <RefreshCw className="w-4 h-4" /> Process another file
            </button>
          </div>
        )}
      </div>
    </InternalLayout>
  );
}
