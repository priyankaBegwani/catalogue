/**
 * Import Pipeline — 4-step wizard for superadmin to process a setup_request
 *
 * Step 1: Parse   — pick Excel file, start import job
 * Step 2: Map     — map Excel columns to design fields
 * Step 3: Validate — validate all rows, view error report
 * Step 4: Publish — write valid rows to designs + design_colors
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, AlertCircle, CheckCircle, ChevronRight,
  FileSpreadsheet, GitMerge, ShieldCheck, Rocket, RotateCcw,
  X, Check, Info
} from 'lucide-react';
import { InternalLayout } from './InternalLayout';
import { API_URL } from '../../config/backend';

function authHeaders(json = false): Record<string, string> {
  const h: Record<string, string> = { Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus = 'new' | 'parsed' | 'mapped' | 'validated' | 'published' | 'failed';

type Job = {
  id: string;
  setup_request_id: string;
  tenant_id: string | null;
  status: JobStatus;
  source_file_url: string | null;
  raw_headers: string[] | null;
  column_mapping: Record<string, string> | null;
  validation_errors: ValidationError[] | null;
  valid_row_count: number | null;
  error_row_count: number | null;
  published_count: number | null;
  error_message: string | null;
  raw_row_count: number;
  setup_request: { id: string; name: string | null; whatsapp: string | null; catalog_size: string | null } | null;
  tenant: { id: string; name: string; slug: string } | null;
};

type ValidationError = {
  row: number;
  field: string;
  value: unknown;
  message: string;
};

type ParseResult = {
  job_id: string;
  headers: string[];
  row_count: number;
  sample_rows: Record<string, unknown>[];
  suggested_mapping: Record<string, string>;
  has_saved_mapping: boolean;
};

// ─── Known design fields ──────────────────────────────────────────────────────

const DESIGN_FIELDS = [
  { key: '',             label: '— skip —' },
  { key: 'design_no',   label: 'Design No *' },
  { key: 'name',        label: 'Name *' },
  { key: 'price',       label: 'Price *' },
  { key: 'mrp',         label: 'MRP' },
  { key: 'description', label: 'Description' },
  { key: 'department',  label: 'Department' },
  { key: 'category',    label: 'Category' },
  { key: 'style',       label: 'Style' },
  { key: 'fabric_type', label: 'Fabric Type' },
  { key: 'brand',       label: 'Brand' },
  { key: 'work_type',   label: 'Work Type' },
  { key: 'occasion',    label: 'Occasion' },
  { key: 'collection',  label: 'Collection' },
  { key: 'design_month_year', label: 'Month/Year' },
  { key: 'tags',        label: 'Tags' },
  { key: 'color_name',  label: 'Color Name' },
  { key: 'color_code',  label: 'Color Code' },
  { key: 'stock_quantity', label: 'Stock Qty' },
  { key: 'in_stock',    label: 'In Stock' },
  { key: 'size_S',      label: 'Size S' },
  { key: 'size_M',      label: 'Size M' },
  { key: 'size_L',      label: 'Size L' },
  { key: 'size_XL',     label: 'Size XL' },
  { key: 'size_XXL',    label: 'Size XXL' },
  { key: 'size_XXXL',   label: 'Size XXXL' },
];

const REQUIRED_FIELDS = new Set(['design_no', 'name', 'price']);

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Parse',    icon: FileSpreadsheet },
  { id: 2, label: 'Map',      icon: GitMerge },
  { id: 3, label: 'Validate', icon: ShieldCheck },
  { id: 4, label: 'Publish',  icon: Rocket },
];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = current > step.id;
        const active = current === step.id;
        return (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
              done   ? 'bg-green-900/40 text-green-300' :
              active ? 'bg-indigo-600 text-white' :
                       'bg-gray-800 text-gray-500'
            }`}>
              {done
                ? <Check className="w-3.5 h-3.5" />
                : <Icon className="w-3.5 h-3.5" />
              }
              {step.label}
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 text-gray-700 mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Parse ────────────────────────────────────────────────────────────

function Step1Parse({
  setupRequestId,
  onParsed,
}: {
  setupRequestId: string;
  onParsed: (result: ParseResult) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const parse = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`${API_URL}/api/internal/import/${setupRequestId}/start`, {
        method: 'POST', headers: authHeaders(),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error ?? j.message ?? 'Failed');
      onParsed(j.data as ParseResult);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-white mb-1">Parse Excel File</h2>
      <p className="text-sm text-gray-400 mb-6">
        The backend will fetch the uploaded Excel/CSV from the setup request and parse it into rows.
        If a mapping was saved for this tenant before, it will be pre-applied.
      </p>

      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      <button
        onClick={parse}
        disabled={loading}
        className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium disabled:opacity-50"
      >
        {loading
          ? <><RefreshCw className="w-4 h-4 animate-spin" /> Parsing…</>
          : <><FileSpreadsheet className="w-4 h-4" /> Fetch &amp; Parse Excel</>
        }
      </button>
    </div>
  );
}

// ─── Step 2: Map Columns ──────────────────────────────────────────────────────

function Step2Map({
  jobId,
  headers,
  initialMapping,
  hasSavedMapping,
  onMapped,
}: {
  jobId: string;
  headers: string[];
  initialMapping: Record<string, string>;
  hasSavedMapping: boolean;
  onMapped: () => void;
}) {
  const [mapping, setMapping] = useState<Record<string, string>>(initialMapping);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const usedFields = new Set(Object.values(mapping).filter(Boolean));
  const mappedCount = usedFields.size;
  const hasRequired = REQUIRED_FIELDS.size === [...REQUIRED_FIELDS].filter(f => usedFields.has(f)).length;

  const save = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`${API_URL}/api/internal/import/${jobId}/map`, {
        method: 'POST', headers: authHeaders(true),
        body: JSON.stringify({ mapping }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error ?? j.message ?? 'Failed');
      onMapped();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-base font-semibold text-white">Map Columns</h2>
          <p className="text-sm text-gray-400">
            Match each Excel column to a design field.
            {hasSavedMapping && (
              <span className="ml-2 text-indigo-400 text-xs inline-flex items-center gap-1">
                <Info className="w-3 h-3" /> Saved mapping loaded
              </span>
            )}
          </p>
        </div>
        <div className="text-xs text-gray-500">
          {mappedCount} / {DESIGN_FIELDS.length - 1} fields mapped
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {!hasRequired && (
        <div className="mb-4 bg-yellow-900/20 border border-yellow-800/40 rounded-xl px-4 py-3 text-xs text-yellow-300 flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          Required fields not yet mapped: {[...REQUIRED_FIELDS].filter(f => !usedFields.has(f)).join(', ')}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6 max-h-[480px] overflow-y-auto pr-1">
        {headers.map(header => (
          <div key={header} className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2">
            <span className="text-xs text-gray-300 flex-1 min-w-0 truncate font-mono">{header}</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
            <select
              value={mapping[header] ?? ''}
              onChange={e => setMapping(m => ({ ...m, [header]: e.target.value }))}
              className={`bg-gray-900 border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 w-36 flex-shrink-0 ${
                mapping[header]
                  ? REQUIRED_FIELDS.has(mapping[header])
                    ? 'border-green-700 text-green-300'
                    : 'border-indigo-700 text-indigo-300'
                  : 'border-gray-700 text-gray-500'
              }`}
            >
              {DESIGN_FIELDS.map(f => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <button
        onClick={save}
        disabled={loading || !hasRequired}
        className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium disabled:opacity-50"
      >
        {loading
          ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</>
          : <><GitMerge className="w-4 h-4" /> Save Mapping &amp; Continue</>
        }
      </button>
      <p className="text-xs text-gray-500 mt-2">
        This mapping will be saved and auto-applied for future imports from this tenant.
      </p>
    </div>
  );
}

// ─── Step 3: Validate ─────────────────────────────────────────────────────────

function Step3Validate({
  jobId,
  initialErrors,
  validRowCount,
  errorRowCount,
  onValidated,
  onGoBack,
}: {
  jobId: string;
  initialErrors: ValidationError[] | null;
  validRowCount: number | null;
  errorRowCount: number | null;
  onValidated: (errors: ValidationError[], valid: number, errorCount: number) => void;
  onGoBack: () => void;
}) {
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<ValidationError[]>(initialErrors ?? []);
  const [valid, setValid]       = useState<number | null>(validRowCount);
  const [errCount, setErrCount] = useState<number | null>(errorRowCount);
  const [apiError, setApiError] = useState('');
  const [hasRun, setHasRun]     = useState(initialErrors !== null);

  const validate = async () => {
    setLoading(true);
    setApiError('');
    try {
      const r = await fetch(`${API_URL}/api/internal/import/${jobId}/validate`, {
        method: 'POST', headers: authHeaders(),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error ?? j.message ?? 'Failed');
      setErrors(j.data.errors ?? []);
      setValid(j.data.valid_rows);
      setErrCount(j.data.error_rows);
      setHasRun(true);
      onValidated(j.data.errors ?? [], j.data.valid_rows, j.data.error_rows);
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const byField: Record<string, ValidationError[]> = {};
  for (const e of errors) {
    if (!byField[e.field]) byField[e.field] = [];
    byField[e.field].push(e);
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-white mb-1">Validate Rows</h2>
      <p className="text-sm text-gray-400 mb-6">
        Checks required fields, number formats, and enum values. Rows with errors are skipped during publish.
      </p>

      {apiError && (
        <div className="mb-4 bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {apiError}
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={validate}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium disabled:opacity-50"
        >
          {loading
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Validating…</>
            : <><ShieldCheck className="w-4 h-4" /> {hasRun ? 'Re-validate' : 'Validate'}</>
          }
        </button>
        <button
          onClick={onGoBack}
          className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm"
        >
          <RotateCcw className="w-4 h-4" /> Edit mapping
        </button>
      </div>

      {hasRun && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-green-900/20 border border-green-800/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-300">{valid ?? 0}</p>
              <p className="text-xs text-green-500 mt-1">Valid rows</p>
            </div>
            <div className={`rounded-xl p-4 text-center border ${errCount ? 'bg-red-900/20 border-red-800/30' : 'bg-gray-800 border-gray-700'}`}>
              <p className={`text-2xl font-bold ${errCount ? 'text-red-300' : 'text-gray-400'}`}>{errCount ?? 0}</p>
              <p className={`text-xs mt-1 ${errCount ? 'text-red-500' : 'text-gray-500'}`}>Error rows (will be skipped)</p>
            </div>
          </div>

          {errors.length === 0 ? (
            <div className="flex items-center gap-2 text-green-400 text-sm mb-6">
              <CheckCircle className="w-4 h-4" /> All rows are valid — ready to publish
            </div>
          ) : (
            <div className="mb-6">
              <p className="text-xs text-gray-400 mb-3">{errors.length} validation issue{errors.length !== 1 ? 's' : ''} found:</p>
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-400 font-medium">Row</th>
                      <th className="text-left px-3 py-2 text-gray-400 font-medium">Field</th>
                      <th className="text-left px-3 py-2 text-gray-400 font-medium">Value</th>
                      <th className="text-left px-3 py-2 text-gray-400 font-medium">Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.slice(0, 200).map((e, i) => (
                      <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/40">
                        <td className="px-3 py-2 text-yellow-400 font-mono">{e.row}</td>
                        <td className="px-3 py-2 text-indigo-300 font-mono">{e.field}</td>
                        <td className="px-3 py-2 text-gray-400 font-mono max-w-[120px] truncate">{String(e.value ?? '—')}</td>
                        <td className="px-3 py-2 text-red-300">{e.message}</td>
                      </tr>
                    ))}
                    {errors.length > 200 && (
                      <tr className="border-t border-gray-800">
                        <td colSpan={4} className="px-3 py-2 text-center text-gray-500">
                          … and {errors.length - 200} more issues
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(valid ?? 0) > 0 && (
            <button
              onClick={() => onValidated(errors, valid ?? 0, errCount ?? 0)}
              className="flex items-center gap-2 px-5 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-medium"
            >
              <Rocket className="w-4 h-4" />
              Proceed with {valid} valid row{valid !== 1 ? 's' : ''} →
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Step 4: Publish ──────────────────────────────────────────────────────────

function Step4Publish({
  jobId,
  tenantName,
  validRowCount,
  errorRowCount,
  alreadyPublished,
  publishedCount,
  onPublished,
}: {
  jobId: string;
  tenantName: string | null;
  validRowCount: number | null;
  errorRowCount: number | null;
  alreadyPublished: boolean;
  publishedCount: number | null;
  onPublished: (count: number) => void;
}) {
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(alreadyPublished);
  const [count, setCount]       = useState<number | null>(publishedCount);
  const [error, setError]       = useState('');
  const [publishErrs, setPublishErrs] = useState<{ design_no: string; error: string }[]>([]);

  const publish = async () => {
    if (!confirm(`This will write ${validRowCount} designs to "${tenantName ?? 'this tenant'}". Continue?`)) return;
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`${API_URL}/api/internal/import/${jobId}/publish`, {
        method: 'POST', headers: authHeaders(),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.error ?? j.message ?? 'Failed');
      setCount(j.data.published_designs);
      setPublishErrs(j.data.publish_errors ?? []);
      setDone(true);
      onPublished(j.data.published_designs);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-white mb-1">Publish to Catalog</h2>
      <p className="text-sm text-gray-400 mb-6">
        Writes valid rows to the <span className="text-white font-medium">{tenantName ?? 'tenant'}</span> catalog.
        Designs are upserted by <span className="font-mono text-indigo-300">design_no</span>, so re-running updates existing designs.
      </p>

      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {!done ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-green-900/20 border border-green-800/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-300">{validRowCount ?? 0}</p>
              <p className="text-xs text-green-500 mt-1">Designs to publish</p>
            </div>
            {(errorRowCount ?? 0) > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-yellow-300">{errorRowCount}</p>
                <p className="text-xs text-yellow-500 mt-1">Rows to skip</p>
              </div>
            )}
          </div>

          <button
            onClick={publish}
            disabled={loading || (validRowCount ?? 0) === 0}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-bold disabled:opacity-50"
          >
            {loading
              ? <><RefreshCw className="w-4 h-4 animate-spin" /> Publishing…</>
              : <><Rocket className="w-4 h-4" /> Publish {validRowCount} Designs</>
            }
          </button>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-green-900/20 border border-green-800/40 rounded-2xl p-5">
            <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
            <div>
              <p className="text-white font-semibold">
                {count} design{count !== 1 ? 's' : ''} published to <span className="text-green-300">{tenantName}</span>!
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Designs are now live in the catalog. Colors were upserted per design.
              </p>
            </div>
          </div>

          {publishErrs.length > 0 && (
            <div className="bg-red-900/20 border border-red-800/30 rounded-xl p-4">
              <p className="text-xs text-red-400 font-medium mb-2">{publishErrs.length} design{publishErrs.length !== 1 ? 's' : ''} failed to publish:</p>
              <div className="space-y-1">
                {publishErrs.map((e, i) => (
                  <p key={i} className="text-xs text-red-300 font-mono">
                    {e.design_no}: {e.error}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main: ImportPipeline ─────────────────────────────────────────────────────

function statusToStep(status: JobStatus): number {
  switch (status) {
    case 'new':       return 1;
    case 'parsed':    return 2;
    case 'mapped':    return 3;
    case 'validated': return 4;
    case 'published': return 4;
    case 'failed':    return 1;
  }
}

export function ImportPipeline() {
  const { setupRequestId } = useParams<{ setupRequestId: string }>();
  const navigate = useNavigate();

  const [job, setJob]         = useState<Job | null>(null);
  const [step, setStep]       = useState(1);
  const [loadingJob, setLoadingJob] = useState(true);
  const [error, setError]     = useState('');

  // Parse result buffered for step 2 without refetch
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  const fetchJob = useCallback(async (jobId: string) => {
    try {
      const r = await fetch(`${API_URL}/api/internal/import/${jobId}`, { headers: authHeaders() });
      const j = await r.json();
      if (!j.success) throw new Error(j.error ?? 'Failed');
      setJob(j.data);
      setStep(statusToStep(j.data.status));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // On mount: check if a job already exists for this setup request
  useEffect(() => {
    if (!setupRequestId) return;
    (async () => {
      setLoadingJob(true);
      try {
        // List jobs for this setup request via the start endpoint (GET not available by setupRequestId)
        // We use the assistance/setup-requests endpoint to find existing job
        const r = await fetch(`${API_URL}/api/internal/assistance/setup-requests`, { headers: authHeaders() });
        const j = await r.json();
        if (!j.success) throw new Error(j.error ?? 'Failed');

        const request = (j.data as { id: string; import_job?: { id: string } | null }[]).find(req => req.id === setupRequestId);
        if (request?.import_job?.id) {
          await fetchJob(request.import_job.id);
        } else {
          setJob(null);
          setStep(1);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoadingJob(false);
      }
    })();
  }, [setupRequestId, fetchJob]);

  if (loadingJob) {
    return (
      <InternalLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      </InternalLayout>
    );
  }

  const currentStep = step;
  const headers = job?.raw_headers ?? parseResult?.headers ?? [];
  const mapping = job?.column_mapping ?? parseResult?.suggested_mapping ?? {};

  return (
    <InternalLayout>
      <div className="p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/internal/assistance')}
            className="p-2 bg-gray-800 rounded-xl text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Import Pipeline</h1>
            {job?.setup_request && (
              <p className="text-sm text-gray-400">
                {job.tenant?.name ?? job.setup_request.name} — {job.setup_request.catalog_size} catalog
              </p>
            )}
          </div>
          {job && (
            <span className={`ml-auto text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
              job.status === 'published' ? 'bg-green-900/40 text-green-300 border-green-800/40' :
              job.status === 'failed'    ? 'bg-red-900/40 text-red-300 border-red-800/40' :
                                          'bg-indigo-900/40 text-indigo-300 border-indigo-800/40'
            }`}>
              {job.status}
            </span>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        <StepBar current={currentStep} />

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          {currentStep === 1 && (
            <Step1Parse
              setupRequestId={setupRequestId!}
              onParsed={result => {
                setParseResult(result);
                // Fetch the job so we have full job state
                fetchJob(result.job_id).then(() => setStep(2));
              }}
            />
          )}

          {currentStep === 2 && (
            <Step2Map
              jobId={job!.id}
              headers={headers}
              initialMapping={mapping}
              hasSavedMapping={parseResult?.has_saved_mapping ?? false}
              onMapped={() => {
                fetchJob(job!.id).then(() => setStep(3));
              }}
            />
          )}

          {currentStep === 3 && (
            <Step3Validate
              jobId={job!.id}
              initialErrors={job?.validation_errors ?? null}
              validRowCount={job?.valid_row_count ?? null}
              errorRowCount={job?.error_row_count ?? null}
              onValidated={(_errors, valid, errorCount) => {
                setJob(prev => prev ? {
                  ...prev,
                  status: 'validated',
                  validation_errors: _errors,
                  valid_row_count: valid,
                  error_row_count: errorCount,
                } : prev);
                setStep(4);
              }}
              onGoBack={() => setStep(2)}
            />
          )}

          {currentStep === 4 && (
            <Step4Publish
              jobId={job!.id}
              tenantName={job?.tenant?.name ?? null}
              validRowCount={job?.valid_row_count ?? null}
              errorRowCount={job?.error_row_count ?? null}
              alreadyPublished={job?.status === 'published'}
              publishedCount={job?.published_count ?? null}
              onPublished={count => {
                setJob(prev => prev ? { ...prev, status: 'published', published_count: count } : prev);
              }}
            />
          )}
        </div>

        {/* Step nav — allow going back/forward for already-processed steps */}
        {job && (
          <div className="flex gap-2 mt-4">
            {currentStep > 1 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
            {currentStep < 4 && job.status !== 'new' && (
              <button
                onClick={() => setStep(s => s + 1)}
                className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 ml-auto"
              >
                Skip forward <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </InternalLayout>
  );
}
