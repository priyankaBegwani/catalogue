/**
 * Step 4 – Design Import
 *
 * Two paths, clearly presented:
 *
 * A) EASY PATH (recommended): Download our CSV template → fill it → upload.
 *    Columns already match exactly — no mapping needed, import runs immediately.
 *
 * B) BRING YOUR OWN FILE: Upload any Excel/CSV from your ERP or wherever.
 *    Column mapping wizard handles the rest.
 *
 * Design principle: MSME users are not tech-savvy. The default action should
 * feel like "fill a form", not "map a schema". Template path removes ALL friction.
 */

import { useState } from 'react';
import { Download, FileSpreadsheet, ArrowRight, CheckCircle, ChevronRight, Sparkles } from 'lucide-react';
import { OnboardingLayout } from '../OnboardingLayout';
import { useOnboarding } from '../OnboardingContext';
import { ImportWizard, ImportSchema, FieldDef } from '../components/ImportWizard';
import { API_URL } from '../../config/backend';

// ─── Template definition — exact column headers our bulk endpoint expects ────
const TEMPLATE_HEADERS = [
  'design_no', 'name', 'price', 'description',
  'color_name', 'color_code', 'stock_quantity',
  'department', 'category', 'fabric_type', 'brand',
  'tags', 'work_type', 'occasion', 'collection',
];

const TEMPLATE_SAMPLE_ROWS = [
  {
    design_no: 'IND-001', name: 'Cotton Kurta', price: '999',
    description: 'Comfortable everyday kurta', color_name: 'Red',
    color_code: '#FF0000', stock_quantity: '10', department: 'mens',
    category: 'Kurta', fabric_type: 'Cotton', brand: '',
    tags: 'ethnic,casual', work_type: 'plain', occasion: 'casual', collection: '',
  },
  {
    design_no: 'IND-002', name: 'Silk Saree', price: '2499',
    description: 'Festival silk saree', color_name: 'Blue',
    color_code: '#0000FF', stock_quantity: '5', department: 'womens',
    category: 'Saree', fabric_type: 'Silk', brand: '',
    tags: 'ethnic,festive', work_type: 'printed', occasion: 'festive', collection: 'puja collection',
  },
];

function downloadTemplate() {
  const rows = [TEMPLATE_HEADERS, ...TEMPLATE_SAMPLE_ROWS.map(r => TEMPLATE_HEADERS.map(h => (r as Record<string, string>)[h] ?? ''))];
  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = 'catalogue_design_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Schema for ImportWizard (own-file path) ──────────────────────────────────
const DESIGN_FIELDS: FieldDef[] = [
  { key: 'design_no',      label: 'Design No',    required: true,  aliases: ['design no', 'design number', 'code', 'article', 'article no', 'item no', 'product code', 'sku'] },
  { key: 'name',           label: 'Name / Title', required: true,  aliases: ['product name', 'title', 'design name', 'item name', 'item'] },
  { key: 'price',          label: 'Price (₹)',    required: false, type: 'number', aliases: ['mrp', 'rate', 'amount', 'cost', 'selling price', 'sp', 'sale price'] },
  { key: 'description',    label: 'Description',  required: false, aliases: ['desc', 'detail', 'details', 'notes'] },
  { key: 'color_name',     label: 'Color',        required: false, aliases: ['colour', 'color', 'shade', 'color name', 'colour name'] },
  { key: 'color_code',     label: 'Color Code',   required: false, aliases: ['hex', 'colour code', 'color code'] },
  { key: 'stock_quantity', label: 'Stock Qty',    required: false, type: 'number', aliases: ['stock', 'qty', 'quantity', 'pieces', 'pcs', 'stock qty'] },
  { key: 'department',     label: 'Department',   required: false, aliases: ['dept', 'category type', 'gender', 'type', 'division'] },
  { key: 'category',       label: 'Category',     required: false, aliases: ['cat', 'product category', 'group'] },
  { key: 'fabric_type',    label: 'Fabric',       required: false, aliases: ['fabric', 'material', 'cloth', 'fabric type'] },
  { key: 'brand',          label: 'Brand',        required: false, aliases: ['brand name', 'maker', 'manufacturer'] },
  { key: 'tags',           label: 'Tags',         required: false, aliases: ['keywords', 'labels', 'tag'] },
  { key: 'work_type',      label: 'Work Type',    required: false, aliases: ['work', 'embroidery', 'print', 'work type'] },
  { key: 'occasion',       label: 'Occasion',     required: false, aliases: ['event', 'use', 'usage', 'for'] },
  { key: 'collection',     label: 'Collection',   required: false, aliases: ['series', 'range', 'line', 'collection name'] },
];

const DESIGN_SCHEMA: ImportSchema = {
  entityType:    'designs',
  fields:        DESIGN_FIELDS,
  batchEndpoint: '/api/designs/bulk',
  batchKey:      'designs',
  transformRow(row) {
    const r: Record<string, unknown> = {
      design_no: String(row.design_no ?? '').trim(),
      name:      String(row.name      ?? row.design_no ?? '').trim(),
    };
    if (row.price      !== undefined) r.price       = Number(row.price) || 0;
    if (row.description)              r.description = String(row.description);
    if (row.department)               r.department  = String(row.department);
    if (row.tags)                     r.tags        = String(row.tags).split(',').map((t: string) => t.trim()).filter(Boolean);
    if (row.work_type)                r.work_type   = String(row.work_type);
    if (row.occasion)                 r.occasion    = String(row.occasion);
    if (row.collection)               r.collection  = String(row.collection);
    if (row.color_name) {
      r.colors = [{
        color_name:     String(row.color_name),
        color_code:     row.color_code ? String(row.color_code) : null,
        stock_quantity: Number(row.stock_quantity) || 0,
        in_stock:       Number(row.stock_quantity) > 0,
      }];
    }
    return r;
  },
  sampleRows: TEMPLATE_SAMPLE_ROWS,
};

// ─── Template upload path ─────────────────────────────────────────────────────
// When user uploads OUR template, column names match exactly — run import directly
// without the mapping step.
function authHeaders() {
  const token = localStorage.getItem('access_token') ?? '';
  const tid   = sessionStorage.getItem('tenant_id') ?? '';
  return { Authorization: `Bearer ${token}`, ...(tid ? { 'X-Tenant-ID': tid } : {}) };
}

async function parseAndImportTemplate(file: File): Promise<{ inserted: number; updated: number; failed: number }> {
  // Read CSV in browser
  const text = await file.text();
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) throw new Error('File is empty');

  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  const rows = lines.slice(1).map(line => {
    const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) ?? line.split(',');
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (vals[i] ?? '').replace(/^"|"$/g, '').trim();
    });
    return obj;
  });

  // Use the same transform as DESIGN_SCHEMA
  const designs = rows
    .filter(r => r.design_no)
    .map(row => DESIGN_SCHEMA.transformRow(row));

  // Batch import (100 at a time)
  let inserted = 0, updated = 0, failed = 0;
  const BATCH = 100;
  for (let i = 0; i < designs.length; i += BATCH) {
    const batch = designs.slice(i, i + BATCH);
    const r = await fetch(`${API_URL}/api/designs/bulk`, {
      method:  'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body:    JSON.stringify({ designs: batch }),
    });
    const j = await r.json();
    inserted += j.inserted ?? 0;
    updated  += j.updated  ?? 0;
    failed   += j.skipped  ?? 0;
  }
  return { inserted, updated, failed };
}

type Path = 'choose' | 'template' | 'own';

export function Step4DesignImport() {
  const { completeStep } = useOnboarding();
  const [path,       setPath]       = useState<Path>('choose');
  const [importing,  setImporting]  = useState(false);
  const [summary,    setSummary]    = useState<{ inserted: number; updated: number; failed: number } | null>(null);
  const [error,      setError]      = useState('');

  const handleTemplateFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError('');
    try {
      const result = await parseAndImportTemplate(file);
      setSummary(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Import failed. Please check the file format.');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  // ─── Success screen ──────────────────────────────────────────────────────
  if (summary) {
    return (
      <OnboardingLayout title="Products imported!" subtitle="">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {summary.inserted + summary.updated} designs ready
            </h3>
            <p className="text-sm text-gray-500">
              {summary.inserted} added · {summary.updated} updated
              {summary.failed > 0 && ` · ${summary.failed} skipped`}
            </p>
          </div>
          <div className="flex justify-end">
            <button onClick={() => completeStep(4)} className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-semibold hover:opacity-90">
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  // ─── Path chooser ────────────────────────────────────────────────────────
  if (path === 'choose') {
    return (
      <OnboardingLayout
        title="Import Your Product Catalog"
        subtitle="Choose how you'd like to bring in your designs."
      >
        <div className="space-y-4">
          {/* Easy path — recommended */}
          <button
            onClick={() => setPath('template')}
            className="w-full text-left p-5 rounded-2xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-gray-900">Use our template</span>
                  <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Recommended</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Download our pre-formatted CSV, fill in your products, upload it back. <strong>No column mapping needed</strong> — imports instantly.
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-xs text-primary font-semibold flex items-center gap-1">
                    3 easy steps <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs text-gray-400">Takes ~10 minutes to fill</span>
                </div>
              </div>
            </div>
          </button>

          {/* Own file path */}
          <button
            onClick={() => setPath('own')}
            className="w-full text-left p-5 rounded-2xl border-2 border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 mb-1">Upload my own file</p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Have an existing Excel or CSV from your ERP or Tally? Upload it and we'll help you match the columns.
                </p>
              </div>
            </div>
          </button>

          <div className="flex justify-between items-center pt-1">
            <button onClick={() => completeStep(4)} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              Skip for now — add products later
            </button>
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  // ─── Template path — 3 micro-steps ──────────────────────────────────────
  if (path === 'template') {
    return (
      <OnboardingLayout
        title="Import Using Our Template"
        subtitle="Follow these 3 steps — takes about 10 minutes."
      >
        <div className="space-y-4">
          {/* Step 1: Download */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center flex-shrink-0">1</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900 mb-1">Download the template</p>
                <p className="text-xs text-gray-500 mb-3">A CSV file with all the right columns. Two example rows are included to guide you.</p>
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90"
                >
                  <Download className="w-4 h-4" />
                  Download template.csv
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Fill */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 text-sm font-bold flex items-center justify-center flex-shrink-0">2</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900 mb-1">Fill in your products</p>
                <p className="text-xs text-gray-500">Open it in Excel or Google Sheets. Fill in your design numbers, names, prices, and colors. Delete the example rows when done.</p>
                <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
                  <strong>Only 2 columns are required:</strong> design_no and name. Everything else is optional.
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Upload */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 text-sm font-bold flex items-center justify-center flex-shrink-0">3</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900 mb-1">Upload it back</p>
                <p className="text-xs text-gray-500 mb-3">We'll import everything instantly — no column matching needed.</p>

                {importing ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
                    Importing your products…
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold cursor-pointer hover:opacity-90">
                    <FileSpreadsheet className="w-4 h-4" />
                    Upload filled template
                    <input type="file" accept=".csv" className="hidden" onChange={handleTemplateFile} />
                  </label>
                )}
                {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-1">
            <button onClick={() => setPath('choose')} className="text-sm text-gray-400 hover:text-gray-600">← Back</button>
            <button onClick={() => completeStep(4)} className="text-sm text-gray-400 hover:text-gray-600">Skip for now</button>
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  // ─── Own-file path — full ImportWizard ───────────────────────────────────
  return (
    <OnboardingLayout
      title="Import Your Product Catalog"
      subtitle="Upload your Excel or CSV. We'll help you match the columns."
    >
      <div className="space-y-4">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 flex items-center gap-2.5 text-xs text-indigo-700">
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <span>We'll try to auto-detect your columns. You can correct anything before importing.</span>
        </div>

        <ImportWizard
          schema={DESIGN_SCHEMA}
          onDone={result => setSummary(result)}
          onSkip={() => completeStep(4)}
        />

        <button onClick={() => setPath('choose')} className="text-sm text-gray-400 hover:text-gray-600">← Back to options</button>
      </div>
    </OnboardingLayout>
  );
}
