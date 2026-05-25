/**
 * Reusable ImportWizard
 * Steps: Upload → Map Columns → Preview & Validate → Import → Summary
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, FileSpreadsheet, ChevronRight, ChevronLeft, AlertTriangle,
  CheckCircle, X, RefreshCw, Download, Info
} from 'lucide-react';
import { API_URL } from '../../config/backend';

// ── Field schema ──────────────────────────────────────────────────────────────

export type FieldDef = {
  key:      string;
  label:    string;
  required: boolean;
  aliases:  string[];
  type?:    'text' | 'number' | 'boolean';
};

export type ImportSchema = {
  entityType: 'designs' | 'parties' | 'transport';
  fields:     FieldDef[];
  /**
   * Transform the mapped row object into the payload expected by the API.
   * Called before sending each batch.
   */
  transformRow: (row: Record<string, unknown>) => Record<string, unknown>;
  /** API endpoint that accepts a batch payload */
  batchEndpoint: string;
  /** Key used in the request body, e.g. "designs" | "parties" | "transporters" */
  batchKey: string;
  sampleRows: Record<string, string>[];
};

// ── Fuzzy column matching ─────────────────────────────────────────────────────

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function bestMatch(header: string, fields: FieldDef[]): string | null {
  const h = normalize(header);
  for (const f of fields) {
    if (normalize(f.key) === h) return f.key;
    if (f.aliases.some(a => normalize(a) === h)) return f.key;
  }
  // Partial match
  for (const f of fields) {
    if (normalize(f.key).includes(h) || h.includes(normalize(f.key))) return f.key;
    if (f.aliases.some(a => normalize(a).includes(h) || h.includes(normalize(a)))) return f.key;
  }
  return null;
}

function autoMap(headers: string[], fields: FieldDef[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();
  for (const h of headers) {
    const match = bestMatch(h, fields);
    if (match && !used.has(match)) {
      mapping[h] = match;
      used.add(match);
    } else {
      mapping[h] = '__skip__';
    }
  }
  return mapping;
}

// ── Validation ────────────────────────────────────────────────────────────────

type ValidationResult = { valid: boolean; errors: string[] };

function validateRow(row: Record<string, string>, fields: FieldDef[]): ValidationResult {
  const errors: string[] = [];
  for (const f of fields) {
    if (f.required) {
      const val = (row[f.key] ?? '').toString().trim();
      if (!val) errors.push(`${f.label} is required`);
    }
  }
  return { valid: errors.length === 0, errors };
}

// ── Download sample ───────────────────────────────────────────────────────────

function downloadSample(schema: ImportSchema) {
  const ws   = XLSX.utils.json_to_sheet(schema.sampleRows);
  const wb   = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sample');
  XLSX.writeFile(wb, `${schema.entityType}_sample.xlsx`);
}

// ── Auth headers ──────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token') ?? '';
  const tid   = sessionStorage.getItem('tenant_id') ?? '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(tid ? { 'X-Tenant-ID': tid } : {}),
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

type WizardStep = 'upload' | 'map' | 'preview' | 'importing' | 'done';

type ParsedRow = Record<string, string>;

type MappedRow = Record<string, unknown> & { __rowIndex: number; __errors: string[] };

type ImportResult = {
  inserted: number;
  updated:  number;
  failed:   number;
  errors:   { row: number; error: string }[];
};

// ── Component ─────────────────────────────────────────────────────────────────

type Props = {
  schema:   ImportSchema;
  onDone:   (result: ImportResult) => void;
  onSkip:   () => void;
};

const BATCH_SIZE = 100;
const PREVIEW_ROWS = 20;

export function ImportWizard({ schema, onDone, onSkip }: Props) {
  const [step,       setStep]       = useState<WizardStep>('upload');
  const [file,       setFile]       = useState<File | null>(null);
  const [rawRows,    setRawRows]    = useState<ParsedRow[]>([]);
  const [headers,    setHeaders]    = useState<string[]>([]);
  const [mapping,    setMapping]    = useState<Record<string, string>>({});
  const [mappedRows, setMappedRows] = useState<MappedRow[]>([]);
  const [progress,   setProgress]   = useState(0); // 0-100
  const [result,     setResult]     = useState<ImportResult | null>(null);
  const [dragOver,   setDragOver]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Parse file → rawRows
  const parseFile = useCallback((f: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const wb   = XLSX.read(data, { type: 'array' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: '',
        raw: false,
      });
      if (!json.length) return;
      const hdrs = Object.keys(json[0]);
      const rows = json.map(r =>
        Object.fromEntries(hdrs.map(h => [h, String(r[h] ?? '').trim()]))
      );
      setHeaders(hdrs);
      setRawRows(rows);
      setMapping(autoMap(hdrs, schema.fields));
      setFile(f);
      setStep('map');
    };
    reader.readAsArrayBuffer(f);
  }, [schema.fields]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) parseFile(e.target.files[0]);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv'))) {
      parseFile(f);
    }
  };

  // Build mappedRows from rawRows + mapping
  const buildMappedRows = useCallback(() => {
    return rawRows.map((row, idx): MappedRow => {
      const mapped: Record<string, unknown> = {};
      for (const [header, fieldKey] of Object.entries(mapping)) {
        if (fieldKey === '__skip__') continue;
        const fieldDef = schema.fields.find(f => f.key === fieldKey);
        let val: unknown = row[header] ?? '';
        if (fieldDef?.type === 'number') val = parseFloat(String(val)) || 0;
        if (fieldDef?.type === 'boolean') val = ['true', 'yes', '1', 'y'].includes(String(val).toLowerCase());
        mapped[fieldKey] = val;
      }
      const { errors } = validateRow(
        mapped as Record<string, string>,
        schema.fields
      );
      return { ...mapped, __rowIndex: idx + 2, __errors: errors }; // +2 for header + 1-based
    });
  }, [rawRows, mapping, schema.fields]);

  const goToPreview = useCallback(() => {
    setMappedRows(buildMappedRows());
    setStep('preview');
  }, [buildMappedRows]);

  // Import all rows in batches
  const runImport = useCallback(async () => {
    setStep('importing');
    setProgress(0);

    const validRows   = mappedRows.filter(r => r.__errors.length === 0);
    const allFailures: { row: number; error: string }[] = [];
    const skippedRows = mappedRows.filter(r => r.__errors.length > 0);

    // Add pre-validation failures
    skippedRows.forEach(r => {
      allFailures.push({ row: r.__rowIndex as number, error: r.__errors.join('; ') });
    });

    let inserted = 0;
    let updated  = 0;

    const total   = Math.ceil(validRows.length / BATCH_SIZE) || 1;
    let   batches = 0;

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const chunk = validRows.slice(i, i + BATCH_SIZE).map(r => {
        // Strip internal keys
        const { __rowIndex, __errors, ...rest } = r;
        return schema.transformRow(rest as Record<string, unknown>);
      });

      try {
        const res  = await fetch(`${API_URL}${schema.batchEndpoint}`, {
          method:  'POST',
          headers: authHeaders(),
          body:    JSON.stringify({ [schema.batchKey]: chunk }),
        });
        const json = await res.json();
        if (json.success) {
          inserted += json.inserted ?? 0;
          updated  += json.updated  ?? 0;
          if (Array.isArray(json.errors)) {
            json.errors.forEach((e: { row: number; error: string }) =>
              allFailures.push({ row: i + e.row, error: e.error })
            );
          }
        } else {
          chunk.forEach((_, ci) =>
            allFailures.push({ row: i + ci + 2, error: json.message ?? 'Unknown error' })
          );
        }
      } catch (err) {
        chunk.forEach((_, ci) =>
          allFailures.push({ row: i + ci + 2, error: 'Network error' })
        );
      }

      batches++;
      setProgress(Math.round((batches / total) * 100));
    }

    const finalResult: ImportResult = {
      inserted,
      updated,
      failed: allFailures.length,
      errors: allFailures,
    };
    setResult(finalResult);
    setStep('done');
    onDone(finalResult);
  }, [mappedRows, schema, onDone]);

  const requiredFields = schema.fields.filter(f => f.required);
  const mappedRequiredCount = requiredFields.filter(f =>
    Object.values(mapping).includes(f.key)
  ).length;
  const canProceedFromMap = mappedRequiredCount === requiredFields.length;

  const validCount   = mappedRows.filter(r => r.__errors.length === 0).length;
  const invalidCount = mappedRows.filter(r => r.__errors.length > 0).length;

  // ── Render ──────────────────────────────────────────────────────────────────

  if (step === 'upload') {
    return (
      <div className="space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors ${
            dragOver ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
          }`}
        >
          <FileSpreadsheet className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-base font-medium text-gray-700">Drop your Excel or CSV file here</p>
          <p className="text-sm text-gray-400 mt-1">.xlsx, .xls, .csv supported</p>
          <button className="mt-4 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90">
            <Upload className="w-4 h-4 inline mr-1.5" />
            Browse file
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={onFileChange}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => downloadSample(schema)}
            className="flex items-center gap-1.5 text-primary hover:underline"
          >
            <Download className="w-4 h-4" />
            Download sample template
          </button>
          <button onClick={onSkip} className="text-gray-400 hover:text-gray-600">
            Skip for now →
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-sm text-blue-800">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Required columns:</strong>{' '}
            {schema.fields.filter(f => f.required).map(f => f.label).join(', ')}.
            Column names don't need to be exact — we'll try to match them automatically.
          </div>
        </div>
      </div>
    );
  }

  if (step === 'map') {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            <strong>{rawRows.length}</strong> rows found in <span className="font-medium">{file?.name}</span>.
            Map your columns below.
          </p>
          <button
            onClick={() => { setStep('upload'); setFile(null); setRawRows([]); }}
            className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Change file
          </button>
        </div>

        {/* Column mapping table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-2 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-50 px-4 py-2 border-b border-gray-100">
            <span>Your column</span>
            <span>Maps to field</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
            {headers.map(h => {
              const mapped     = mapping[h] ?? '__skip__';
              const isRequired = schema.fields.find(f => f.key === mapped)?.required;
              return (
                <div key={h} className="grid grid-cols-2 items-center px-4 py-2.5 gap-3">
                  <span className="text-sm text-gray-700 font-mono truncate" title={h}>{h}</span>
                  <select
                    value={mapped}
                    onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}
                    className={`text-sm border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary ${
                      isRequired ? 'border-primary/40 bg-primary/5' : 'border-gray-200'
                    }`}
                  >
                    <option value="__skip__">— Skip this column —</option>
                    {schema.fields.map(f => (
                      <option key={f.key} value={f.key}>
                        {f.label}{f.required ? ' *' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        {!canProceedFromMap && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Map all required fields ({requiredFields.map(f => f.label).join(', ')}) to continue.
          </div>
        )}

        <div className="flex items-center justify-between">
          <button onClick={onSkip} className="text-sm text-gray-400 hover:text-gray-600">
            Skip import
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => setStep('upload')}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              disabled={!canProceedFromMap}
              onClick={goToPreview}
              className="flex items-center gap-1.5 px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              Preview <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'preview') {
    const previewRows  = mappedRows.slice(0, PREVIEW_ROWS);
    const visibleFields = schema.fields.filter(f =>
      Object.values(mapping).includes(f.key)
    );

    return (
      <div className="space-y-5">
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
            <CheckCircle className="w-4 h-4" /> {validCount} valid
          </span>
          {invalidCount > 0 && (
            <span className="flex items-center gap-1.5 text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
              <AlertTriangle className="w-4 h-4" /> {invalidCount} will be skipped
            </span>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-500 font-semibold">#</th>
                  {visibleFields.map(f => (
                    <th key={f.key} className="px-3 py-2 text-left text-gray-500 font-semibold whitespace-nowrap">
                      {f.label}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-left text-gray-500 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {previewRows.map((row, i) => (
                  <tr key={i} className={row.__errors.length > 0 ? 'bg-red-50' : ''}>
                    <td className="px-3 py-2 text-gray-400">{row.__rowIndex as number}</td>
                    {visibleFields.map(f => (
                      <td key={f.key} className="px-3 py-2 text-gray-700 max-w-[140px] truncate">
                        {String(row[f.key] ?? '')}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      {row.__errors.length > 0
                        ? <span className="text-red-600" title={(row.__errors as string[]).join('; ')}>
                            <AlertTriangle className="w-3.5 h-3.5 inline" /> {(row.__errors as string[])[0]}
                          </span>
                        : <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mappedRows.length > PREVIEW_ROWS && (
            <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100 bg-gray-50">
              Showing {PREVIEW_ROWS} of {mappedRows.length} rows
            </div>
          )}
        </div>

        {validCount === 0 && (
          <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4" /> No valid rows to import. Fix your file or mapping.
          </div>
        )}

        <div className="flex items-center justify-between">
          <button onClick={onSkip} className="text-sm text-gray-400 hover:text-gray-600">
            Skip import
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => setStep('map')}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              disabled={validCount === 0}
              onClick={runImport}
              className="flex items-center gap-1.5 px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              Import {validCount} row{validCount !== 1 ? 's' : ''} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'importing') {
    return (
      <div className="flex flex-col items-center gap-6 py-12">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-gray-900">Importing your data…</p>
          <p className="text-sm text-gray-500 mt-1">Please don't close this tab</p>
        </div>
        <div className="w-64">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // done
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Import Complete</h3>
            <p className="text-sm text-gray-500">Your data has been added to the system</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          {[
            { label: 'Inserted',  value: result?.inserted ?? 0, color: 'text-green-700 bg-green-50' },
            { label: 'Updated',   value: result?.updated  ?? 0, color: 'text-blue-700 bg-blue-50' },
            { label: 'Skipped',   value: result?.failed   ?? 0, color: 'text-red-700 bg-red-50' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl p-4 text-center ${color}`}>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {(result?.errors?.length ?? 0) > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-red-600 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              {result!.errors.length} rows had errors — click to view
            </summary>
            <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-red-100 bg-red-50">
              {result!.errors.slice(0, 50).map((e, i) => (
                <div key={i} className="px-3 py-1.5 border-b border-red-100 last:border-0 text-red-700 text-xs">
                  Row {e.row}: {e.error}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
