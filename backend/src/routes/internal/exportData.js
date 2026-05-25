/**
 * Internal Tool: Export Tenant Data
 *
 * After assisted onboarding is complete, superadmin (or user after payment)
 * can export a tenant's organized data:
 *   - designs_export.csv  (all design fields)
 *   - design_colors_export.csv (all color/image data)
 *   - photo_manifest.csv  (design_no, color_name, image_url rows)
 *
 * GET  /api/internal/export/:tenant_id/designs  — designs CSV
 * GET  /api/internal/export/:tenant_id/colors   — design_colors CSV
 * GET  /api/internal/export/:tenant_id/photos   — photo manifest CSV
 *
 * Also a user-facing endpoint (token-based, no superadmin needed):
 * GET  /api/onboarding/export/:preview_token    — all three combined as JSON
 *   (frontend builds the downloadable files client-side)
 */

import express from 'express';
import * as XLSX from 'xlsx';
import { supabaseAdmin } from '../../config.js';
import { authenticateUser, requireSuperAdmin } from '../../middleware/auth.js';
import { asyncHandler, AppError } from '../../utils/index.js';

const router = express.Router();

function rowsToCSVBuffer(rows) {
  if (!rows || rows.length === 0) {
    return Buffer.from('No data\n');
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { type: 'buffer', bookType: 'csv' });
}

async function fetchTenantDesigns(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('designs')
    .select(`
      design_no, name, description, department, price, is_active,
      work_type, occasion, collection, tags, available_sizes,
      design_month_year, created_at,
      category:design_categories(name),
      fabric_type:fabric_types(name),
      brand:brands(name),
      style:design_styles(name)
    `)
    .eq('tenant_id', tenantId)
    .order('design_no');

  if (error) throw new AppError(error.message, 500);
  return (data ?? []).map(d => ({
    design_no:        d.design_no,
    name:             d.name,
    description:      d.description ?? '',
    department:       d.department ?? '',
    category:         d.category?.name ?? '',
    fabric_type:      d.fabric_type?.name ?? '',
    brand:            d.brand?.name ?? '',
    style:            d.style?.name ?? '',
    price:            d.price ?? 0,
    work_type:        d.work_type ?? '',
    occasion:         d.occasion ?? '',
    collection:       d.collection ?? '',
    tags:             Array.isArray(d.tags) ? d.tags.join(', ') : '',
    available_sizes:  Array.isArray(d.available_sizes) ? d.available_sizes.join(', ') : '',
    design_month_year: d.design_month_year ?? '',
    is_active:        d.is_active,
    created_at:       d.created_at,
  }));
}

async function fetchTenantColors(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('design_colors')
    .select(`
      color_name, color_code, in_stock, stock_quantity,
      image_urls, is_active,
      design:designs(design_no, name)
    `)
    .eq('tenant_id', tenantId)
    .order('design_id');

  if (error) throw new AppError(error.message, 500);
  return (data ?? []).map(c => ({
    design_no:      c.design?.design_no ?? '',
    design_name:    c.design?.name ?? '',
    color_name:     c.color_name,
    color_code:     c.color_code ?? '',
    in_stock:       c.in_stock,
    stock_quantity: c.stock_quantity ?? '',
    image_count:    Array.isArray(c.image_urls) ? c.image_urls.length : 0,
    is_active:      c.is_active,
  }));
}

async function fetchPhotoManifest(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('design_colors')
    .select(`
      color_name, image_urls,
      design:designs(design_no)
    `)
    .eq('tenant_id', tenantId);

  if (error) throw new AppError(error.message, 500);

  const rows = [];
  for (const c of (data ?? [])) {
    const design_no = c.design?.design_no ?? '';
    for (const url of (c.image_urls ?? [])) {
      rows.push({ design_no, color_name: c.color_name, image_url: url });
    }
  }
  return rows;
}

// ─── GET /:tenant_id/designs ─────────────────────────────────────────────────
router.get('/:tenant_id/designs', authenticateUser, requireSuperAdmin, asyncHandler(async (req, res) => {
  const rows = await fetchTenantDesigns(req.params.tenant_id);
  const buf  = rowsToCSVBuffer(rows);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="designs_${req.params.tenant_id}.csv"`);
  res.send(buf);
}));

// ─── GET /:tenant_id/colors ──────────────────────────────────────────────────
router.get('/:tenant_id/colors', authenticateUser, requireSuperAdmin, asyncHandler(async (req, res) => {
  const rows = await fetchTenantColors(req.params.tenant_id);
  const buf  = rowsToCSVBuffer(rows);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="design_colors_${req.params.tenant_id}.csv"`);
  res.send(buf);
}));

// ─── GET /:tenant_id/photos ──────────────────────────────────────────────────
router.get('/:tenant_id/photos', authenticateUser, requireSuperAdmin, asyncHandler(async (req, res) => {
  const rows = await fetchPhotoManifest(req.params.tenant_id);
  const buf  = rowsToCSVBuffer(rows);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="photo_manifest_${req.params.tenant_id}.csv"`);
  res.send(buf);
}));

// ─── GET /by-token/:preview_token — user-facing export (token-gated) ─────────
// Returns JSON; frontend triggers download. No superadmin needed.
router.get('/by-token/:preview_token', asyncHandler(async (req, res) => {
  const { data: request, error } = await supabaseAdmin
    .from('onboarding_assistance_requests')
    .select('tenant_id, status, preview_token_expires_at, final_paid_at')
    .eq('preview_token', req.params.preview_token)
    .single();

  if (error || !request) throw new AppError('Invalid export token', 404);
  if (!['paid', 'complete'].includes(request.status)) {
    throw new AppError('Export is only available after payment is confirmed', 403);
  }
  if (new Date(request.preview_token_expires_at) < new Date()) {
    throw new AppError('Export link has expired', 410);
  }

  const tenantId = request.tenant_id;
  const [designs, colors, photos] = await Promise.all([
    fetchTenantDesigns(tenantId),
    fetchTenantColors(tenantId),
    fetchPhotoManifest(tenantId),
  ]);

  // Mark exported
  await supabaseAdmin
    .from('onboarding_assistance_requests')
    .update({ exported_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('preview_token', req.params.preview_token);

  res.json({ success: true, data: { designs, colors, photos } });
}));

export { fetchTenantDesigns, fetchTenantColors, fetchPhotoManifest };
export default router;
