/**
 * Internal: Assisted Onboarding Request Inbox
 *
 * Superadmin views, manages, and progresses all assisted setup requests.
 *
 * GET    /api/internal/assistance          — list all requests (filterable by status)
 * GET    /api/internal/assistance/:id      — single request detail
 * PATCH  /api/internal/assistance/:id      — update status / notes / assign
 * POST   /api/internal/assistance/:id/preview-token — generate preview link for user
 * POST   /api/internal/assistance/:id/advance-order — create Razorpay advance order
 * POST   /api/internal/assistance/:id/final-order   — create Razorpay final payment order
 * POST   /api/internal/assistance/:id/publish       — flip designs live after payment
 */

import express from 'express';
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { supabaseAdmin } from '../../config.js';
import { authenticateUser, requireSuperAdmin } from '../../middleware/auth.js';
import { asyncHandler, AppError } from '../../utils/index.js';

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL?.split(',')[0].trim() ?? '';

function getRazorpay() {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new AppError('Razorpay keys not configured', 500);
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// ─── GET / — list all requests ───────────────────────────────────────────────
router.get('/', authenticateUser, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  let query = supabaseAdmin
    .from('onboarding_assistance_requests')
    .select(`
      *,
      tenant:tenants(id, name, slug)
    `)
    .order('created_at', { ascending: false })
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new AppError(error.message, 500);
  res.json({ success: true, data: data ?? [] });
}));

// ─── GET /:id — single request ───────────────────────────────────────────────
router.get('/:id', authenticateUser, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('onboarding_assistance_requests')
    .select(`
      *,
      tenant:tenants(id, name, slug, onboarding_complete)
    `)
    .eq('id', req.params.id)
    .single();

  if (error || !data) throw new AppError('Request not found', 404);

  // Fetch preview visits count
  const { count: visitCount } = await supabaseAdmin
    .from('preview_visits')
    .select('id', { count: 'exact', head: true })
    .eq('request_id', req.params.id);

  res.json({ success: true, data: { ...data, preview_visit_count: visitCount ?? 0 } });
}));

// ─── PATCH /:id — update status / notes / assign ─────────────────────────────
router.patch('/:id', authenticateUser, requireSuperAdmin, asyncHandler(async (req, res) => {
  const allowed = ['status', 'superadmin_notes', 'assigned_to', 'setup_fee_paise'];
  const patch = { updated_at: new Date().toISOString() };

  for (const key of allowed) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }

  // Validate status transitions
  const VALID_STATUSES = ['pending','in_progress','preview_ready','changes_requested','payment_pending','paid','complete'];
  if (patch.status && !VALID_STATUSES.includes(patch.status)) {
    throw new AppError(`Invalid status: ${patch.status}`, 400);
  }

  if (patch.status === 'complete') patch.completed_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('onboarding_assistance_requests')
    .update(patch)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) throw new AppError(error.message, 500);
  res.json({ success: true, data });
}));

// ─── POST /:id/preview-token — generate preview link ─────────────────────────
// Called by superadmin when they've finished setting up the tenant's data.
// Sets status → preview_ready and returns a shareable URL for the user.
router.post('/:id/preview-token', authenticateUser, requireSuperAdmin, asyncHandler(async (req, res) => {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const { data: request, error } = await supabaseAdmin
    .from('onboarding_assistance_requests')
    .update({
      preview_token:            token,
      preview_token_expires_at: expires.toISOString(),
      status:                   'preview_ready',
      updated_at:               new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .select('id, tenant_id, setup_fee_paise')
    .single();

  if (error || !request) throw new AppError('Request not found', 404);

  const previewUrl = `${FRONTEND_URL}/preview/${token}`;

  res.json({
    success: true,
    data: {
      preview_token: token,
      preview_url:   previewUrl,
      expires_at:    expires.toISOString(),
    },
  });
}));

// ─── POST /:id/advance-order — create small advance Razorpay order ───────────
// Optionally collect token advance from user at form submission time
// Body: { amount_paise } (e.g. 19900 for ₹199)
router.post('/:id/advance-order', authenticateUser, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { amount_paise = 19900 } = req.body; // default ₹199

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount:   amount_paise,
    currency: 'INR',
    notes:    { assistance_request_id: req.params.id, type: 'advance' },
  });

  await supabaseAdmin
    .from('onboarding_assistance_requests')
    .update({ razorpay_advance_order_id: order.id, token_advance_paise: amount_paise, updated_at: new Date().toISOString() })
    .eq('id', req.params.id);

  res.json({ success: true, data: { order_id: order.id, amount_paise, currency: 'INR' } });
}));

// ─── POST /:id/final-order — create final setup fee Razorpay order ───────────
// Called after user approves preview. User pays this to unlock publish + export.
router.post('/:id/final-order', authenticateUser, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { data: request } = await supabaseAdmin
    .from('onboarding_assistance_requests')
    .select('setup_fee_paise, token_advance_paise')
    .eq('id', req.params.id)
    .single();

  if (!request) throw new AppError('Request not found', 404);

  // Final amount = setup fee minus any advance already paid
  const amount_paise = (request.setup_fee_paise || 99900) - (request.token_advance_paise || 0);
  if (amount_paise <= 0) throw new AppError('No remaining balance due', 400);

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount:   amount_paise,
    currency: 'INR',
    notes:    { assistance_request_id: req.params.id, type: 'final_setup' },
  });

  await supabaseAdmin
    .from('onboarding_assistance_requests')
    .update({
      razorpay_final_order_id: order.id,
      status:                  'payment_pending',
      updated_at:              new Date().toISOString(),
    })
    .eq('id', req.params.id);

  res.json({ success: true, data: { order_id: order.id, amount_paise, currency: 'INR' } });
}));

// ─── POST /:id/publish — flip designs live after payment confirmed ────────────
router.post('/:id/publish', authenticateUser, requireSuperAdmin, asyncHandler(async (req, res) => {
  const { data: request } = await supabaseAdmin
    .from('onboarding_assistance_requests')
    .select('tenant_id, status')
    .eq('id', req.params.id)
    .single();

  if (!request) throw new AppError('Request not found', 404);
  if (!['paid', 'complete'].includes(request.status)) {
    throw new AppError('Payment must be confirmed before publishing', 400);
  }

  const tenantId = request.tenant_id;

  // Flip all inactive designs for this tenant to active
  const { count } = await supabaseAdmin
    .from('designs')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('is_active', false)
    .select('id', { count: 'exact', head: true });

  // Mark tenant onboarding as complete
  await Promise.all([
    supabaseAdmin.from('tenants').update({ onboarding_complete: true }).eq('id', tenantId),
    supabaseAdmin.from('onboarding_progress')
      .upsert({ tenant_id: tenantId, is_complete: true, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'tenant_id' }),
    supabaseAdmin.from('onboarding_assistance_requests')
      .update({ status: 'complete', published_at: new Date().toISOString(), completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', req.params.id),
  ]);

  res.json({ success: true, data: { designs_published: count ?? 0 } });
}));

export default router;
