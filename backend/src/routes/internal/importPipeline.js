/**
 * Internal: Import Pipeline
 *
 * POST /api/internal/import/:setupRequestId/start  — fetch Excel, parse, create job
 * GET  /api/internal/import/:jobId                  — fetch job state
 * POST /api/internal/import/:jobId/map              — save column mapping, apply to rows
 * POST /api/internal/import/:jobId/validate         — validate mapped rows, return error report
 * POST /api/internal/import/:jobId/publish          — write valid rows to designs + design_colors
 */

import express from 'express';
import * as XLSX from 'xlsx';
import { supabaseAdmin } from '../../config.js';
import { authenticateUser, requireSuperAdmin } from '../../middleware/auth.js';
import { asyncHandler, AppError } from '../../utils/index.js';

const router = express.Router();

// ─── Known design fields ──────────────────────────────────────────────────────
const DESIGN_FIELDS = [
  'design_no', 'name', 'description', 'department',
  'category', 'style', 'fabric_type', 'brand',
  'price', 'mrp', 'work_type', 'occasion', 'collection',
  'design_month_year', 'tags',
  'color_name', 'color_code', 'stock_quantity', 'in_stock',
  'size_S', 'size_M', 'size_L', 'size_XL', 'size_XXL', 'size_XXXL',
];

const REQUIRED_FIELDS = ['design_no', 'name', 'price'];

// ─── Auto-map: fuzzy match Excel header → known field ─────────────────────────
function autoMap(headers) {
  const mapping = {};
  const normalize = s => s.toLowerCase().replace(/[\s_\-\.]+/g, '');

  for (const header of headers) {
    const h = normalize(header);
    let best = null;

    for (const field of DESIGN_FIELDS) {
      const f = normalize(field);
      if (h === f || h.includes(f) || f.includes(h)) {
        best = field;
        break;
      }
    }

    // Common aliases
    const aliases = {
      'designno': 'design_no', 'designnumber': 'design_no', 'sr': 'design_no', 'srno': 'design_no',
      'productname': 'name', 'title': 'name', 'item': 'name',
      'rate': 'price', 'cost': 'price', 'sellingprice': 'price', 'sp': 'price',
      'mrp': 'mrp', 'maximumretailprice': 'mrp',
      'colour': 'color_name', 'colorname': 'color_name', 'colourname': 'color_name',
      'colorcode': 'color_code', 'colourcode': 'color_code', 'hexcode': 'color_code',
      'qty': 'stock_quantity', 'quantity': 'stock_quantity', 'stock': 'stock_quantity',
      'fabric': 'fabric_type', 'material': 'fabric_type',
      'category': 'category', 'cat': 'category',
      'style': 'style', 'stylecode': 'style',
      'brand': 'brand', 'brandname': 'brand',
      'desc': 'description', 'details': 'description',
      'dept': 'department', 'gender': 'department',
      'tags': 'tags', 'keywords': 'tags',
      'monthyear': 'design_month_year', 'month': 'design_month_year', 'season': 'design_month_year',
      'work': 'work_type', 'worktype': 'work_type', 'embroidery': 'work_type',
      'occasion': 'occasion', 'use': 'occasion',
      'collection': 'collection',
    };

    if (!best && aliases[h]) best = aliases[h];

    if (best) mapping[header] = best;
  }

  return mapping;
}

// ─── Validate a single mapped row ─────────────────────────────────────────────
function validateRow(row, rowIndex) {
  const errors = [];

  for (const field of REQUIRED_FIELDS) {
    const val = row[field];
    if (val === undefined || val === null || String(val).trim() === '') {
      errors.push({ row: rowIndex + 2, field, value: val, message: `${field} is required` });
    }
  }

  if (row.price !== undefined && row.price !== null && row.price !== '') {
    const p = Number(row.price);
    if (isNaN(p) || p < 0) {
      errors.push({ row: rowIndex + 2, field: 'price', value: row.price, message: 'price must be a positive number' });
    }
  }

  if (row.mrp !== undefined && row.mrp !== null && row.mrp !== '') {
    const m = Number(row.mrp);
    if (isNaN(m) || m < 0) {
      errors.push({ row: rowIndex + 2, field: 'mrp', value: row.mrp, message: 'mrp must be a positive number' });
    }
  }

  if (row.department && !['mens', 'boys', 'women', 'girls', 'unisex'].includes(String(row.department).toLowerCase())) {
    errors.push({ row: rowIndex + 2, field: 'department', value: row.department, message: 'department must be: mens, boys, women, girls, unisex' });
  }

  if (row.in_stock !== undefined && row.in_stock !== null && row.in_stock !== '') {
    const v = String(row.in_stock).toLowerCase();
    if (!['true', 'false', '1', '0', 'yes', 'no'].includes(v)) {
      errors.push({ row: rowIndex + 2, field: 'in_stock', value: row.in_stock, message: 'in_stock must be true/false/yes/no' });
    }
  }

  return errors;
}

// ─── Apply column mapping to raw rows ────────────────────────────────────────
function applyMapping(rawRows, mapping) {
  return rawRows.map(raw => {
    const mapped = {};
    for (const [excelCol, fieldKey] of Object.entries(mapping)) {
      if (fieldKey && raw[excelCol] !== undefined) {
        mapped[fieldKey] = raw[excelCol];
      }
    }
    return mapped;
  });
}

// ─── POST /:setupRequestId/start ─────────────────────────────────────────────
router.post('/:setupRequestId/start', authenticateUser, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { setupRequestId } = req.params;

  const { data: request, error: reqErr } = await supabaseAdmin
    .from('setup_requests')
    .select('id, brand_id, name, files_uploaded, links')
    .eq('id', setupRequestId)
    .maybeSingle();

  if (reqErr || !request) throw new AppError('Setup request not found', 404);

  // Find an Excel/CSV file in files_uploaded
  const files = request.files_uploaded ?? [];
  const excelUrl = files.find(url =>
    /\.(xlsx|xls|csv)(\?|$)/i.test(url)
  );

  if (!excelUrl) throw new AppError('No Excel/CSV file found in this setup request', 400);

  // Fetch the file
  let buffer;
  try {
    const response = await fetch(excelUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } catch (e) {
    throw new AppError(`Failed to fetch Excel file: ${e.message}`, 502);
  }

  // Parse with xlsx
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  } catch (e) {
    throw new AppError(`Failed to parse Excel file: ${e.message}`, 422);
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });

  if (!rawData.length) throw new AppError('Excel file is empty or has no data rows', 422);

  const headers = Object.keys(rawData[0]);
  const suggestedMapping = autoMap(headers);

  // Load saved mapping for this tenant (if any)
  let savedMapping = null;
  if (request.brand_id) {
    const { data: im } = await supabaseAdmin
      .from('import_mappings')
      .select('mapping')
      .eq('tenant_id', request.brand_id)
      .maybeSingle();
    if (im) savedMapping = im.mapping;
  }

  // Upsert import_job
  const { data: existingJob } = await supabaseAdmin
    .from('import_jobs')
    .select('id')
    .eq('setup_request_id', setupRequestId)
    .maybeSingle();

  let jobId;
  if (existingJob) {
    await supabaseAdmin
      .from('import_jobs')
      .update({
        status: 'parsed',
        source_file_url: excelUrl,
        raw_headers: headers,
        raw_rows: rawData,
        column_mapping: savedMapping ?? suggestedMapping,
        validation_errors: null,
        valid_row_count: null,
        error_row_count: null,
        published_count: null,
        error_message: null,
        tenant_id: request.brand_id,
      })
      .eq('id', existingJob.id);
    jobId = existingJob.id;
  } else {
    const { data: newJob, error: jobErr } = await supabaseAdmin
      .from('import_jobs')
      .insert({
        setup_request_id: setupRequestId,
        tenant_id: request.brand_id,
        status: 'parsed',
        source_file_url: excelUrl,
        raw_headers: headers,
        raw_rows: rawData,
        column_mapping: savedMapping ?? suggestedMapping,
        created_by: req.user.id,
      })
      .select('id')
      .single();

    if (jobErr) throw new AppError(jobErr.message, 500);
    jobId = newJob.id;
  }

  res.json({
    success: true,
    data: {
      job_id: jobId,
      headers,
      row_count: rawData.length,
      sample_rows: rawData.slice(0, 5),
      suggested_mapping: savedMapping ?? suggestedMapping,
      has_saved_mapping: !!savedMapping,
    },
  });
}));

// ─── GET /:jobId — fetch job state ───────────────────────────────────────────
router.get('/:jobId', authenticateUser, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('import_jobs')
    .select(`
      id, setup_request_id, tenant_id, status,
      source_file_url, raw_headers, column_mapping,
      validation_errors, valid_row_count, error_row_count,
      published_count, error_message, created_at, updated_at,
      setup_request:setup_requests(id, name, whatsapp, catalog_size),
      tenant:tenants(id, name, slug)
    `)
    .eq('id', req.params.jobId)
    .maybeSingle();

  if (error || !data) throw new AppError('Import job not found', 404);

  // Don't send raw_rows in GET — can be huge. Only send row count.
  const { data: rowCountData } = await supabaseAdmin
    .from('import_jobs')
    .select('raw_rows')
    .eq('id', req.params.jobId)
    .maybeSingle();

  const rowCount = Array.isArray(rowCountData?.raw_rows) ? rowCountData.raw_rows.length : 0;

  res.json({ success: true, data: { ...data, raw_row_count: rowCount } });
}));

// ─── POST /:jobId/map — save column mapping ───────────────────────────────────
router.post('/:jobId/map', authenticateUser, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { mapping } = req.body;
  if (!mapping || typeof mapping !== 'object') throw new AppError('mapping object is required', 400);

  const { data: job, error: jobErr } = await supabaseAdmin
    .from('import_jobs')
    .select('id, tenant_id, raw_rows, status')
    .eq('id', req.params.jobId)
    .maybeSingle();

  if (jobErr || !job) throw new AppError('Import job not found', 404);
  if (!['parsed', 'mapped', 'validated'].includes(job.status)) {
    throw new AppError(`Cannot remap job in status: ${job.status}`, 400);
  }

  // Upsert saved mapping for this tenant
  if (job.tenant_id) {
    await supabaseAdmin
      .from('import_mappings')
      .upsert({ tenant_id: job.tenant_id, mapping }, { onConflict: 'tenant_id' });
  }

  await supabaseAdmin
    .from('import_jobs')
    .update({ column_mapping: mapping, status: 'mapped', validation_errors: null, valid_row_count: null, error_row_count: null })
    .eq('id', req.params.jobId);

  // Return a preview of mapped rows (first 10)
  const mappedRows = applyMapping((job.raw_rows ?? []).slice(0, 10), mapping);

  res.json({ success: true, data: { mapped: true, sample_mapped_rows: mappedRows } });
}));

// ─── POST /:jobId/validate — validate all rows ────────────────────────────────
router.post('/:jobId/validate', authenticateUser, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { data: job, error: jobErr } = await supabaseAdmin
    .from('import_jobs')
    .select('id, raw_rows, column_mapping, status')
    .eq('id', req.params.jobId)
    .maybeSingle();

  if (jobErr || !job) throw new AppError('Import job not found', 404);
  if (!['mapped', 'validated'].includes(job.status)) {
    throw new AppError(`Job must be in mapped status to validate. Current: ${job.status}`, 400);
  }
  if (!job.column_mapping) throw new AppError('No column mapping set. Call /map first.', 400);

  const rawRows = job.raw_rows ?? [];
  const mappedRows = applyMapping(rawRows, job.column_mapping);

  const allErrors = [];
  for (let i = 0; i < mappedRows.length; i++) {
    const rowErrors = validateRow(mappedRows[i], i);
    allErrors.push(...rowErrors);
  }

  const errorRowNumbers = new Set(allErrors.map(e => e.row));
  const errorRowCount = errorRowNumbers.size;
  const validRowCount = rawRows.length - errorRowCount;

  await supabaseAdmin
    .from('import_jobs')
    .update({
      status: 'validated',
      validation_errors: allErrors,
      valid_row_count: validRowCount,
      error_row_count: errorRowCount,
    })
    .eq('id', req.params.jobId);

  res.json({
    success: true,
    data: {
      total_rows: rawRows.length,
      valid_rows: validRowCount,
      error_rows: errorRowCount,
      errors: allErrors,
    },
  });
}));

// ─── POST /:jobId/publish — write valid rows to designs + design_colors ───────
router.post('/:jobId/publish', authenticateUser, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { data: job, error: jobErr } = await supabaseAdmin
    .from('import_jobs')
    .select('id, tenant_id, raw_rows, column_mapping, validation_errors, valid_row_count, status')
    .eq('id', req.params.jobId)
    .maybeSingle();

  if (jobErr || !job) throw new AppError('Import job not found', 404);
  if (job.status !== 'validated') {
    throw new AppError(`Job must be validated before publishing. Current: ${job.status}`, 400);
  }
  if (!job.tenant_id) throw new AppError('Job has no tenant_id — cannot publish', 400);

  const tenantId = job.tenant_id;
  const rawRows = job.raw_rows ?? [];
  const mappedRows = applyMapping(rawRows, job.column_mapping ?? {});
  const errorRowNumbers = new Set((job.validation_errors ?? []).map(e => e.row));

  // Separate valid rows (row numbers are 1-indexed in error, rawRows are 0-indexed)
  const validMappedRows = mappedRows.filter((_, i) => !errorRowNumbers.has(i + 2));

  if (validMappedRows.length === 0) throw new AppError('No valid rows to publish', 400);

  // Fetch lookups
  const [categoriesRes, stylesRes, fabricsRes, brandsRes] = await Promise.all([
    supabaseAdmin.from('categories').select('id, name').eq('tenant_id', tenantId),
    supabaseAdmin.from('styles').select('id, name').eq('tenant_id', tenantId),
    supabaseAdmin.from('fabric_types').select('id, name').eq('tenant_id', tenantId),
    supabaseAdmin.from('brands').select('id, name').eq('tenant_id', tenantId),
  ]);

  const toNameMap = (rows) => Object.fromEntries((rows ?? []).map(r => [r.name?.toLowerCase(), r.id]));
  const catMap   = toNameMap(categoriesRes.data);
  const styleMap = toNameMap(stylesRes.data);
  const fabricMap = toNameMap(fabricsRes.data);
  const brandMap = toNameMap(brandsRes.data);

  // Group rows by design_no
  const designGroups = {};
  for (const row of validMappedRows) {
    const key = String(row.design_no ?? '').trim();
    if (!key) continue;
    if (!designGroups[key]) designGroups[key] = [];
    designGroups[key].push(row);
  }

  let publishedCount = 0;
  const publishErrors = [];

  for (const [designNo, rows] of Object.entries(designGroups)) {
    const firstRow = rows[0];

    const priceVal = parseFloat(String(firstRow.price ?? 0));
    const mrpVal   = firstRow.mrp != null ? parseFloat(String(firstRow.mrp)) : null;

    // Resolve FK ids (create if missing)
    const resolveOrCreate = async (map, table, name) => {
      if (!name) return null;
      const key = String(name).toLowerCase().trim();
      if (map[key]) return map[key];
      const { data } = await supabaseAdmin
        .from(table)
        .insert({ name: String(name).trim(), tenant_id: tenantId })
        .select('id')
        .maybeSingle();
      if (data) { map[key] = data.id; return data.id; }
      return null;
    };

    const [categoryId, styleId, fabricId, brandId] = await Promise.all([
      resolveOrCreate(catMap,    'categories',  firstRow.category),
      resolveOrCreate(styleMap,  'styles',      firstRow.style),
      resolveOrCreate(fabricMap, 'fabric_types', firstRow.fabric_type),
      resolveOrCreate(brandMap,  'brands',      firstRow.brand),
    ]);

    const parseTagsArray = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      return String(val).split(/[,;|]/).map(t => t.trim()).filter(Boolean);
    };

    const designPayload = {
      tenant_id:         tenantId,
      design_no:         designNo,
      name:              String(firstRow.name ?? '').trim(),
      description:       firstRow.description  ? String(firstRow.description).trim()  : null,
      department:        firstRow.department   ? String(firstRow.department).toLowerCase().trim() : null,
      category_id:       categoryId,
      style_id:          styleId,
      fabric_type_id:    fabricId,
      brand_id:          brandId,
      price:             isNaN(priceVal) ? 0 : priceVal,
      mrp:               mrpVal != null && !isNaN(mrpVal) ? mrpVal : null,
      work_type:         firstRow.work_type    ? String(firstRow.work_type).trim()    : null,
      occasion:          firstRow.occasion     ? String(firstRow.occasion).trim()     : null,
      collection:        firstRow.collection   ? String(firstRow.collection).trim()   : null,
      design_month_year: firstRow.design_month_year ? String(firstRow.design_month_year).trim() : null,
      tags:              parseTagsArray(firstRow.tags),
      is_active:         true,
    };

    // Upsert design by design_no + tenant_id
    const { data: design, error: designErr } = await supabaseAdmin
      .from('designs')
      .upsert(designPayload, { onConflict: 'tenant_id,design_no' })
      .select('id')
      .single();

    if (designErr || !design) {
      publishErrors.push({ design_no: designNo, error: designErr?.message ?? 'upsert failed' });
      continue;
    }

    // Build color rows — each row in the group is a color variant
    const colorRows = rows
      .filter(r => r.color_name)
      .map(r => {
        const parseBool = (v) => ['true', '1', 'yes'].includes(String(v ?? 'true').toLowerCase());
        const sizeField = (key) => {
          const v = r[key];
          if (v === null || v === undefined || String(v).trim() === '') return null;
          const n = Number(v);
          return isNaN(n) ? null : n;
        };

        return {
          design_id:      design.id,
          tenant_id:      tenantId,
          color_name:     String(r.color_name).trim(),
          color_code:     r.color_code ? String(r.color_code).trim() : null,
          stock_quantity: r.stock_quantity != null ? Number(r.stock_quantity) : 0,
          in_stock:       parseBool(r.in_stock),
          size_S:         sizeField('size_S'),
          size_M:         sizeField('size_M'),
          size_L:         sizeField('size_L'),
          size_XL:        sizeField('size_XL'),
          size_XXL:       sizeField('size_XXL'),
          size_XXXL:      sizeField('size_XXXL'),
        };
      });

    if (colorRows.length > 0) {
      await supabaseAdmin
        .from('design_colors')
        .upsert(colorRows, { onConflict: 'design_id,color_name' });
    }

    publishedCount++;
  }

  await supabaseAdmin
    .from('import_jobs')
    .update({
      status: publishErrors.length === 0 ? 'published' : 'validated',
      published_count: publishedCount,
      error_message: publishErrors.length > 0 ? JSON.stringify(publishErrors.slice(0, 20)) : null,
    })
    .eq('id', req.params.jobId);

  res.json({
    success: true,
    data: {
      published_designs: publishedCount,
      publish_errors: publishErrors,
    },
  });
}));

export default router;
