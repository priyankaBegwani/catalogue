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
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet, ArrowRight, CheckCircle, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { OnboardingLayout } from '../OnboardingLayout';
import { useOnboarding } from '../OnboardingContext';
import { ImportWizard, ImportSchema, FieldDef } from '../components/ImportWizard';
import { API_URL } from '../../config/backend';

// ─── Template definition — exact column headers our bulk endpoint expects ────
const TEMPLATE_HEADERS = [
  'design_no', 'name', 'description',
  'department', 'category', 'style', 'fabric_type', 'brand',
  'price', 'available_sizes',
  'color_name', 'color_code', 'stock_quantity', 'in_stock',
  'size_S', 'size_M', 'size_L', 'size_XL', 'size_XXL', 'size_XXXL',
  'work_type', 'occasion', 'collection', 'design_month_year', 'tags',
];

// Two rows for IND-001 demonstrate multi-color: repeat design_no for each color variant
const TEMPLATE_SAMPLE_ROWS = [
  {
    design_no: 'IND-001', name: 'Cotton Kurta', description: 'Comfortable everyday kurta',
    department: 'mens', category: "Men's Kurtas", style: 'Straight Cut',
    fabric_type: 'Cotton', brand: '',
    price: '999', available_sizes: 'S,M,L,XL,XXL',
    color_name: 'White', color_code: '#FFFFFF', stock_quantity: '50', in_stock: 'TRUE',
    size_S: '5', size_M: '15', size_L: '20', size_XL: '7', size_XXL: '3', size_XXXL: '0',
    work_type: 'plain', occasion: 'casual', collection: '', design_month_year: '2024-01',
    tags: 'ethnic,casual',
  },
  {
    design_no: 'IND-001', name: 'Cotton Kurta', description: 'Comfortable everyday kurta',
    department: 'mens', category: "Men's Kurtas", style: 'Straight Cut',
    fabric_type: 'Cotton', brand: '',
    price: '999', available_sizes: 'S,M,L,XL,XXL',
    color_name: 'Blue', color_code: '#0066CC', stock_quantity: '40', in_stock: 'TRUE',
    size_S: '4', size_M: '12', size_L: '16', size_XL: '6', size_XXL: '2', size_XXXL: '0',
    work_type: 'plain', occasion: 'casual', collection: '', design_month_year: '2024-01',
    tags: 'ethnic,casual',
  },
  {
    design_no: 'IND-002', name: 'Kurta Pajama Set', description: 'Traditional festive set',
    department: 'mens', category: 'Kurta Sets', style: 'Kurta Pajama',
    fabric_type: 'Silk', brand: '',
    price: '2499', available_sizes: 'M,L,XL,XXL',
    color_name: 'Golden', color_code: '#FFD700', stock_quantity: '25', in_stock: 'TRUE',
    size_S: '0', size_M: '8', size_L: '10', size_XL: '5', size_XXL: '2', size_XXXL: '0',
    work_type: 'emboidered', occasion: 'festive', collection: 'puja collection',
    design_month_year: '2024-09', tags: 'ethnic,festive,wedding',
  },
];

type LookupItem = { name: string };

async function buildAndDownloadTemplate(headers: Record<string, string>) {
  // Fetch valid option lists so users know exactly what to type
  const [catRes, styRes, fabRes, brnRes] = await Promise.all([
    fetch(`${API_URL}/api/designs/categories`, { headers }),
    fetch(`${API_URL}/api/designs/styles`,     { headers }),
    fetch(`${API_URL}/api/designs/fabric-types`, { headers }),
    fetch(`${API_URL}/api/brands`,             { headers }),
  ]);
  const [categories, styles, fabricTypes, brands]: LookupItem[][] = await Promise.all([
    catRes.ok ? catRes.json() : [],
    styRes.ok ? styRes.json() : [],
    fabRes.ok ? fabRes.json() : [],
    brnRes.ok ? brnRes.json() : [],
  ]);

  // ── Sheet 1: Designs (sample data) ────────────────────────────────────────
  const sampleData = TEMPLATE_SAMPLE_ROWS.map(r =>
    Object.fromEntries(TEMPLATE_HEADERS.map(h => [h, (r as Record<string, string>)[h] ?? '']))
  );
  const designsWs = XLSX.utils.json_to_sheet(sampleData, { header: TEMPLATE_HEADERS });
  designsWs['!cols'] = TEMPLATE_HEADERS.map(h => ({
    wch: h.startsWith('size_') ? 9
       : h === 'description'   ? 35
       : h === 'available_sizes' || h === 'design_month_year' ? 18
       : 15,
  }));

  // Excel dropdowns for fixed-enum columns
  const ENUMS: Record<string, string> = {
    department:  'mens,boys',
    work_type:   'plain,printed,emboidered,chikankari,shaded,handwork',
    occasion:    'festive,casual,wedding,office wear,daily wear',
    collection:  'summer collection,winter collection,puja collection,eid collection',
    in_stock:    'TRUE,FALSE',
  };
  designsWs['!dataValidation'] = designsWs['!dataValidation'] ?? [];
  const colIdx = (k: string) => TEMPLATE_HEADERS.indexOf(k);

  for (const [field, vals] of Object.entries(ENUMS)) {
    const ci = colIdx(field);
    if (ci === -1) continue;
    for (let row = 2; row <= 500; row++) {
      (designsWs['!dataValidation'] as unknown[]).push({
        sqref: XLSX.utils.encode_cell({ r: row - 1, c: ci }),
        type: 'list', formula1: `"${vals}"`, allowBlank: true, showDropDown: true,
      });
    }
  }

  // Dropdown for category if it fits Excel's 255-char formula limit
  const catList = categories.map(c => c.name).join(',');
  const catCi   = colIdx('category');
  if (catList && catCi !== -1 && catList.length < 255) {
    for (let row = 2; row <= 500; row++) {
      (designsWs['!dataValidation'] as unknown[]).push({
        sqref: XLSX.utils.encode_cell({ r: row - 1, c: catCi }),
        type: 'list', formula1: `"${catList}"`, allowBlank: true, showDropDown: true,
      });
    }
  }

  // ── Sheet 2: Allowed Values ────────────────────────────────────────────────
  const allowedRows = [
    { field: 'department',          allowed_values: 'mens, boys',                                                                          notes: 'Required. Exactly one of these' },
    { field: 'category',            allowed_values: categories.map(c => c.name).join(', ') || '(none yet — create in app first)',           notes: 'Optional. Copy name exactly' },
    { field: 'style',               allowed_values: styles.map(s => s.name).join(', ')     || '(none yet)',                                 notes: 'Optional. Copy name exactly' },
    { field: 'fabric_type',         allowed_values: fabricTypes.map(f => f.name).join(', ') || '(none yet)',                                notes: 'Optional. Copy name exactly' },
    { field: 'brand',               allowed_values: brands.map(b => b.name).join(', ')     || '(none yet — create in app first)',           notes: 'Optional. Copy name exactly' },
    { field: 'work_type',           allowed_values: 'plain, printed, emboidered, chikankari, shaded, handwork',                            notes: 'Optional. Use exactly as shown' },
    { field: 'occasion',            allowed_values: 'festive, casual, wedding, office wear, daily wear',                                   notes: 'Optional. Use exactly as shown' },
    { field: 'collection',          allowed_values: 'summer collection, winter collection, puja collection, eid collection',               notes: 'Optional. Use exactly as shown' },
    { field: 'available_sizes',     allowed_values: 'S, M, L, XL, XXL, XXXL',                                                             notes: 'Comma-separated, e.g. S,M,L,XL,XXL' },
    { field: 'in_stock',            allowed_values: 'TRUE, FALSE',                                                                         notes: 'Use TRUE for in stock' },
    { field: 'color_code',          allowed_values: 'Hex code e.g. #FF0000',                                                               notes: 'Optional. See Color Reference sheet for common codes' },
    { field: 'design_month_year',   allowed_values: 'YYYY-MM, e.g. 2024-01',                                                               notes: 'Optional. Year and month of the design launch' },
    { field: 'size_S / size_M / …', allowed_values: 'Number (quantity per size)',                                                          notes: 'Optional. Per-color size qty, use 0 if not tracked' },
  ];
  const allowedWs = XLSX.utils.json_to_sheet(allowedRows);
  allowedWs['!cols'] = [{ wch: 22 }, { wch: 65 }, { wch: 45 }];

  // ── Sheet 3: Color Reference ───────────────────────────────────────────────
  const colorRef = [
    { color_name: 'White',       color_code: '#FFFFFF' },
    { color_name: 'Off White',   color_code: '#F5F5DC' },
    { color_name: 'Black',       color_code: '#000000' },
    { color_name: 'Red',         color_code: '#FF0000' },
    { color_name: 'Dark Red',    color_code: '#8B0000' },
    { color_name: 'Maroon',      color_code: '#800000' },
    { color_name: 'Pink',        color_code: '#FF69B4' },
    { color_name: 'Royal Blue',  color_code: '#0066CC' },
    { color_name: 'Navy Blue',   color_code: '#000080' },
    { color_name: 'Sky Blue',    color_code: '#87CEEB' },
    { color_name: 'Green',       color_code: '#008000' },
    { color_name: 'Dark Green',  color_code: '#006400' },
    { color_name: 'Yellow',      color_code: '#FFFF00' },
    { color_name: 'Golden',      color_code: '#FFD700' },
    { color_name: 'Orange',      color_code: '#FF8C00' },
    { color_name: 'Brown',       color_code: '#8B4513' },
    { color_name: 'Beige',       color_code: '#F5F5DC' },
    { color_name: 'Cream',       color_code: '#FFFDD0' },
    { color_name: 'Grey',        color_code: '#808080' },
    { color_name: 'Silver',      color_code: '#C0C0C0' },
    { color_name: 'Purple',      color_code: '#800080' },
    { color_name: 'Violet',      color_code: '#EE82EE' },
    { color_name: 'Teal',        color_code: '#008080' },
    { color_name: 'Mustard',     color_code: '#FFDB58' },
    { color_name: 'Rust',        color_code: '#B7410E' },
    { color_name: 'Indigo',      color_code: '#4B0082' },
    { color_name: 'Peach',       color_code: '#FFCBA4' },
    { color_name: 'Magenta',     color_code: '#FF00FF' },
    { color_name: 'Turquoise',   color_code: '#40E0D0' },
    { color_name: 'Olive',       color_code: '#808000' },
  ];
  const colorWs = XLSX.utils.json_to_sheet(colorRef);
  colorWs['!cols'] = [{ wch: 16 }, { wch: 14 }];

  // ── Sheet 4: Instructions ──────────────────────────────────────────────────
  const instrRows = [
    { '#': 1, instruction: 'Fill the Designs sheet only. Do NOT rename or delete any column headers.' },
    { '#': 2, instruction: 'One row per color variant. Repeat design_no and other design fields for each color.' },
    { '#': 3, instruction: 'For category, style, fabric_type, brand — copy the exact name from the Allowed Values sheet.' },
    { '#': 4, instruction: 'For color_code, copy a hex value from the Color Reference sheet, or leave it blank.' },
    { '#': 5, instruction: 'Only design_no and name are required. Everything else is optional.' },
    { '#': 6, instruction: 'Delete the 3 example rows (rows 2–4) before uploading.' },
    { '#': 7, instruction: 'Upload this file as-is (no need to convert to CSV).' },
  ];
  const instrWs = XLSX.utils.json_to_sheet(instrRows);
  instrWs['!cols'] = [{ wch: 5 }, { wch: 95 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, designsWs, 'Designs');
  XLSX.utils.book_append_sheet(wb, allowedWs, 'Allowed Values');
  XLSX.utils.book_append_sheet(wb, colorWs,   'Color Reference');
  XLSX.utils.book_append_sheet(wb, instrWs,   'Instructions');
  XLSX.writeFile(wb, 'catalogue_design_template.xlsx');
}

// ─── Schema for ImportWizard (own-file path) ──────────────────────────────────
const DESIGN_FIELDS: FieldDef[] = [
  { key: 'design_no',        label: 'Design No',       required: true,  aliases: ['design no', 'design number', 'code', 'article', 'article no', 'item no', 'product code', 'sku'] },
  { key: 'name',             label: 'Name / Title',    required: true,  aliases: ['product name', 'title', 'design name', 'item name', 'item'] },
  { key: 'price',            label: 'Price (₹)',       required: true,  type: 'number', aliases: ['mrp', 'rate', 'amount', 'cost', 'selling price', 'sp', 'sale price'] },
  { key: 'description',      label: 'Description',     required: false, aliases: ['desc', 'detail', 'details', 'notes'] },
  { key: 'department',       label: 'Department',      required: false, aliases: ['dept', 'category type', 'gender', 'type', 'division'] },
  { key: 'category',         label: 'Category',        required: true,  aliases: ['cat', 'product category', 'group'] },
  { key: 'style',            label: 'Style',           required: false, aliases: ['design style', 'cut', 'style name', 'product style'] },
  { key: 'fabric_type',      label: 'Fabric',          required: false, aliases: ['fabric', 'material', 'cloth', 'fabric type'] },
  { key: 'brand',            label: 'Brand',           required: false, aliases: ['brand name', 'maker', 'manufacturer'] },
  { key: 'available_sizes',  label: 'Available Sizes', required: false, aliases: ['sizes', 'size range', 'available sizes', 'size list'] },
  { key: 'color_name',       label: 'Color',           required: false, aliases: ['colour', 'color', 'shade', 'color name', 'colour name'] },
  { key: 'color_code',       label: 'Color Code',      required: false, aliases: ['hex', 'colour code', 'color code'] },
  { key: 'stock_quantity',   label: 'Stock Qty',       required: false, type: 'number', aliases: ['stock', 'qty', 'quantity', 'pieces', 'pcs', 'stock qty'] },
  { key: 'in_stock',         label: 'In Stock',        required: false, aliases: ['stock status', 'availability', 'available'] },
  { key: 'size_S',           label: 'Size S Qty',      required: false, type: 'number', aliases: ['s qty', 'small qty', 'qty s'] },
  { key: 'size_M',           label: 'Size M Qty',      required: false, type: 'number', aliases: ['m qty', 'medium qty', 'qty m'] },
  { key: 'size_L',           label: 'Size L Qty',      required: false, type: 'number', aliases: ['l qty', 'large qty', 'qty l'] },
  { key: 'size_XL',          label: 'Size XL Qty',     required: false, type: 'number', aliases: ['xl qty', 'qty xl', 'extra large qty'] },
  { key: 'size_XXL',         label: 'Size XXL Qty',    required: false, type: 'number', aliases: ['xxl qty', 'qty xxl', '2xl qty'] },
  { key: 'size_XXXL',        label: 'Size XXXL Qty',   required: false, type: 'number', aliases: ['xxxl qty', 'qty xxxl', '3xl qty'] },
  { key: 'tags',             label: 'Tags',            required: false, aliases: ['keywords', 'labels', 'tag'] },
  { key: 'work_type',        label: 'Work Type',       required: false, aliases: ['work', 'embroidery', 'print', 'work type'] },
  { key: 'occasion',         label: 'Occasion',        required: false, aliases: ['event', 'use', 'usage', 'for'] },
  { key: 'collection',       label: 'Collection',      required: false, aliases: ['series', 'range', 'line', 'collection name'] },
  { key: 'design_month_year',label: 'Month / Year',    required: false, aliases: ['month year', 'design month', 'design date', 'month', 'launch month'] },
];

const DESIGN_SCHEMA: ImportSchema = {
  entityType:    'designs',
  fields:        DESIGN_FIELDS,
  batchEndpoint: '/api/designs/bulk',
  batchKey:      'designs',
  transformRow(row) {
    const r: Record<string, unknown> = {
      design_no: String(row.design_no ?? '').trim(),
      name:      String(row.name ?? row.design_no ?? '').trim(),
    };
    if (row.price !== undefined)      r.price            = Number(row.price) || 0;
    if (row.description)              r.description      = String(row.description);
    if (row.department)               r.department       = String(row.department);
    if (row.category)                 r.category         = String(row.category);
    if (row.style)                    r.style            = String(row.style);
    if (row.fabric_type)              r.fabric_type      = String(row.fabric_type);
    if (row.brand)                    r.brand            = String(row.brand);
    if (row.tags)                     r.tags             = String(row.tags).split(',').map((t: string) => t.trim()).filter(Boolean);
    if (row.work_type)                r.work_type        = String(row.work_type);
    if (row.occasion)                 r.occasion         = String(row.occasion);
    if (row.collection)               r.collection       = String(row.collection);
    if (row.design_month_year)        r.design_month_year = String(row.design_month_year);
    if (row.available_sizes)          r.available_sizes  = String(row.available_sizes).split(',').map((s: string) => s.trim()).filter(Boolean);
    if (row.color_name) {
      const sizeQty: Record<string, number> = {};
      for (const sz of ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']) {
        const val = (row as Record<string, unknown>)[`size_${sz}`];
        if (val !== undefined && val !== '') sizeQty[sz] = Number(val) || 0;
      }
      const inStockStr = String(row.in_stock ?? '').toLowerCase();
      r.colors = [{
        color_name:      String(row.color_name),
        color_code:      row.color_code ? String(row.color_code) : null,
        stock_quantity:  Number(row.stock_quantity) || 0,
        in_stock:        inStockStr === 'false' ? false : Number(row.stock_quantity) > 0,
        ...(Object.keys(sizeQty).length > 0 && { size_quantities: sizeQty }),
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
  const buffer = await file.arrayBuffer();
  const wb     = XLSX.read(buffer);
  // Prefer the "Designs" sheet if it exists, otherwise take the first sheet
  const sheetName = wb.SheetNames.includes('Designs') ? 'Designs' : wb.SheetNames[0];
  const ws   = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '', raw: false });

  if (rows.length === 0) throw new Error('File is empty');

  // Group rows by design_no so that multiple rows with the same number become
  // one design with multiple color variants (standard one-row-per-color format)
  const designGroups = new Map<string, Record<string, string>[]>();
  for (const row of rows) {
    if (!row.design_no) continue;
    const key = row.design_no.toLowerCase();
    if (!designGroups.has(key)) designGroups.set(key, []);
    designGroups.get(key)!.push(row);
  }

  const designs = Array.from(designGroups.values()).map(group => {
    const firstRow = group[0];
    // Design-level fields come from the first row
    const base = DESIGN_SCHEMA.transformRow(firstRow);
    // Aggregate colors from every row in the group
    const colors = group
      .filter(r => r.color_name)
      .map(r => {
        const sizeQty: Record<string, number> = {};
        for (const sz of ['S', 'M', 'L', 'XL', 'XXL', 'XXXL']) {
          const val = r[`size_${sz}`];
          if (val) sizeQty[sz] = Number(val) || 0;
        }
        const inStockStr = String(r.in_stock ?? '').toLowerCase();
        return {
          color_name:     String(r.color_name),
          color_code:     r.color_code || null,
          stock_quantity: Number(r.stock_quantity) || 0,
          in_stock:       inStockStr === 'false' ? false : Number(r.stock_quantity) > 0,
          ...(Object.keys(sizeQty).length > 0 && { size_quantities: sizeQty }),
        };
      });
    // Replace whatever transformRow put in colors with the properly aggregated set
    return { ...base, ...(colors.length > 0 ? { colors } : { colors: undefined }) };
  });

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
  const [path,            setPath]           = useState<Path>('choose');
  const [importing,       setImporting]      = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [summary,         setSummary]        = useState<{ inserted: number; updated: number; failed: number } | null>(null);
  const [error,           setError]          = useState('');

  const handleDownloadTemplate = async () => {
    setTemplateLoading(true);
    try {
      await buildAndDownloadTemplate(authHeaders());
    } catch (err) {
      console.error('Template generation failed:', err);
      setError('Could not generate template. Check your connection and try again.');
    } finally {
      setTemplateLoading(false);
    }
  };

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
                <p className="text-xs text-gray-500 mb-3">
                  An Excel file with all columns, <strong>dropdown lists</strong> for category/fabric/etc., and a Color Reference sheet.
                  Three example rows show the format.
                </p>
                <button
                  onClick={handleDownloadTemplate}
                  disabled={templateLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {templateLoading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</>
                    : <><Download className="w-4 h-4" /> Download template.xlsx</>
                  }
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
                <p className="text-xs text-gray-500">Open it in Excel or Google Sheets. Use the dropdowns for category, fabric, work type etc. Check the <strong>Allowed Values</strong> and <strong>Color Reference</strong> sheets for valid options. Delete the example rows when done.</p>
                <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700 space-y-1">
                  <p><strong>Only 2 columns are required:</strong> design_no and name. Everything else is optional.</p>
                  <p><strong>Multiple colors:</strong> add one row per color, repeating the same design_no. See IND-001 in the sample.</p>
                  <p><strong>color_code:</strong> pick a hex value from the Color Reference sheet, or leave it blank.</p>
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
