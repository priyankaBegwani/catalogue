/**
 * Onboarding routes
 * GET  /api/onboarding/progress        — fetch progress for this tenant
 * POST /api/onboarding/progress        — upsert step progress
 * POST /api/onboarding/assistance      — submit assisted-onboarding request
 * GET  /api/onboarding/import-jobs     — list import jobs for this tenant
 * POST /api/onboarding/import-jobs     — create an import job record
 * PATCH /api/onboarding/import-jobs/:id — update job status/counters
 */
import express from 'express';
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { supabaseAdmin } from '../config.js';
import { authenticateUser, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// ─── WhatsApp utility ────────────────────────────────────────────────────────
// Sends a message via Gupshup if configured. Fails silently — never block user flow.
async function sendWhatsApp(toNumber, message) {
  const apiKey = process.env.GUPSHUP_API_KEY;
  const appName = process.env.GUPSHUP_APP_NAME;
  const srcNumber = process.env.GUPSHUP_SRC_NUMBER; // your WA business number

  if (!apiKey || !appName || !srcNumber || !toNumber) return;

  // Normalise number: strip non-digits, ensure 91 prefix for India
  const cleaned = String(toNumber).replace(/\D/g, '');
  const to = cleaned.startsWith('91') ? cleaned : `91${cleaned}`;

  try {
    const body = new URLSearchParams({
      channel:  'whatsapp',
      source:   srcNumber,
      destination: to,
      message:  JSON.stringify({ type: 'text', text: message }),
      'src.name': appName,
    });

    await fetch(process.env.GUPSHUP_API || 'https://api.gupshup.io/sm/api/v1/msg', {
      method:  'POST',
      headers: { apikey: apiKey, 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
    });
  } catch {
    // non-fatal — WA is best-effort
  }
}

// GET /progress
router.get('/progress', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { data } = await supabaseAdmin
      .from('onboarding_progress')
      .select('*')
      .eq('tenant_id', req.tenantId)
      .maybeSingle();
    res.json({ success: true, data: data ?? null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /progress — upsert
router.post('/progress', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { current_step, completed_steps, start_method, is_complete } = req.body;

    const payload = {
      tenant_id: req.tenantId,
      updated_at: new Date().toISOString(),
    };
    if (current_step   !== undefined) payload.current_step   = current_step;
    if (completed_steps !== undefined) payload.completed_steps = completed_steps;
    if (start_method   !== undefined) payload.start_method   = start_method;
    if (is_complete    !== undefined) payload.is_complete    = is_complete;
    if (is_complete)                  payload.completed_at   = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('onboarding_progress')
      .upsert(payload, { onConflict: 'tenant_id' })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });

    // Sync flag on tenants row for fast lookup
    if (is_complete) {
      await supabaseAdmin
        .from('tenants')
        .update({ onboarding_complete: true })
        .eq('id', req.tenantId);
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /assistance
router.post('/assistance', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const {
      contact_name, whatsapp_number, call_time, catalog_size,
      notes, data_links, uploaded_file_urls,
    } = req.body;

    const { data, error } = await supabaseAdmin
      .from('onboarding_assistance_requests')
      .insert({
        tenant_id:           req.tenantId,
        contact_name:        contact_name        || null,
        whatsapp_number:     whatsapp_number     || null,
        call_time:           call_time           || null,
        catalog_size:        catalog_size        || null,
        notes:               notes               || null,
        data_links:          Array.isArray(data_links)          ? data_links          : [],
        uploaded_file_urls:  Array.isArray(uploaded_file_urls)  ? uploaded_file_urls  : [],
        // keep legacy file_urls empty (superseded by uploaded_file_urls)
        file_urls:           [],
      })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });

    // WhatsApp confirmation — best-effort, never blocks response
    const firstName = (contact_name || '').split(' ')[0];
    const frontendUrl = (process.env.FRONTEND_URL || '').split(',')[0].trim();
    sendWhatsApp(
      whatsapp_number,
      `Hi${firstName ? ` ${firstName}` : ''}! 🙏 We received your catalog setup request.\n\nOur team will contact you within a few hours to get started.\n\nMeanwhile, you can explore your dashboard: ${frontendUrl}`
    );

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /quick-stats — design/party counts for dashboard progress banner
router.get('/quick-stats', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const [{ count: designCount }, { count: partyCount }, { count: teamCount }] = await Promise.all([
      supabaseAdmin.from('designs').select('id', { count: 'exact', head: true }).eq('tenant_id', req.tenantId),
      supabaseAdmin.from('parties').select('id', { count: 'exact', head: true }).eq('tenant_id', req.tenantId),
      supabaseAdmin.from('user_profiles').select('id', { count: 'exact', head: true }).eq('tenant_id', req.tenantId).neq('id', req.profile?.id),
    ]);
    res.json({ success: true, data: { designs: designCount ?? 0, parties: partyCount ?? 0, team: teamCount ?? 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /import-jobs
router.get('/import-jobs', authenticateUser, requireAdmin, async (req, res) => {
  const { data } = await supabaseAdmin
    .from('import_jobs')
    .select('*, import_failures(id, row_index, error_message, row_data)')
    .eq('tenant_id', req.tenantId)
    .order('created_at', { ascending: false })
    .limit(20);
  res.json({ success: true, data: data ?? [] });
});

// POST /import-jobs — create job record
router.post('/import-jobs', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { entity_type, file_name, total_rows, column_mapping } = req.body;
    if (!entity_type) return res.status(400).json({ success: false, message: 'entity_type required' });

    const { data, error } = await supabaseAdmin
      .from('import_jobs')
      .insert({
        tenant_id:      req.tenantId,
        created_by:     req.profile?.id ?? null,
        entity_type,
        file_name:      file_name || null,
        total_rows:     total_rows || 0,
        column_mapping: column_mapping || null,
        status:         'processing',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /import-jobs/:id — update counters + status
router.patch('/import-jobs/:id', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { status, inserted_rows, updated_rows, failed_rows, skipped_rows, error_summary, failures } = req.body;

    const patch = { updated_at: new Date().toISOString() };
    if (status        !== undefined) patch.status        = status;
    if (inserted_rows !== undefined) patch.inserted_rows = inserted_rows;
    if (updated_rows  !== undefined) patch.updated_rows  = updated_rows;
    if (failed_rows   !== undefined) patch.failed_rows   = failed_rows;
    if (skipped_rows  !== undefined) patch.skipped_rows  = skipped_rows;
    if (error_summary !== undefined) patch.error_summary = error_summary;
    if (status === 'complete' || status === 'partial' || status === 'failed') {
      patch.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from('import_jobs')
      .update(patch)
      .eq('id', req.params.id)
      .eq('tenant_id', req.tenantId)
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });

    // Persist individual row failures
    if (Array.isArray(failures) && failures.length > 0) {
      await supabaseAdmin
        .from('import_failures')
        .insert(failures.map(f => ({
          job_id:        req.params.id,
          row_index:     f.row_index,
          row_data:      f.row_data,
          error_message: f.error_message,
        })));
    }

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /assistance-status — user polls their own request status ─────────────
router.get('/assistance-status', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { data } = await supabaseAdmin
      .from('onboarding_assistance_requests')
      .select('id, status, preview_token, preview_token_expires_at, setup_fee_paise, token_advance_paise, razorpay_final_order_id, final_paid_at, published_at, exported_at, created_at, updated_at')
      .eq('tenant_id', req.tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    res.json({ success: true, data: data ?? null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /preview/:token — public, validate token + return tenant catalogue ───
// No auth needed — this is opened by the user from a WhatsApp link
router.get('/preview/:token', async (req, res) => {
  try {
    const { data: request } = await supabaseAdmin
      .from('onboarding_assistance_requests')
      .select('id, tenant_id, status, preview_token_expires_at, setup_fee_paise, token_advance_paise, final_paid_at')
      .eq('preview_token', req.params.token)
      .maybeSingle();

    if (!request) return res.status(404).json({ success: false, message: 'Preview link not found or expired' });
    if (new Date(request.preview_token_expires_at) < new Date()) {
      return res.status(410).json({ success: false, message: 'This preview link has expired' });
    }

    // Log visit
    await supabaseAdmin.from('preview_visits').insert({
      request_id: request.id,
      user_agent: req.headers['user-agent'] ?? null,
    });

    // Fetch tenant branding for preview page header
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id, name, slug')
      .eq('id', request.tenant_id)
      .single();

    // Fetch designs (read-only, no auth needed)
    const { data: designs } = await supabaseAdmin
      .from('designs')
      .select(`
        id, design_no, name, description, department, price, is_active,
        category:design_categories(id, name),
        design_colors(id, color_name, image_urls, in_stock)
      `)
      .eq('tenant_id', request.tenant_id)
      .order('design_no')
      .limit(500);

    const remaining_paise = (request.setup_fee_paise || 99900) - (request.token_advance_paise || 0);

    res.json({
      success: true,
      data: {
        request_id:      request.id,
        status:          request.status,
        tenant,
        designs:         designs ?? [],
        payment_required: remaining_paise > 0 && !request.final_paid_at,
        amount_paise:    remaining_paise,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /preview/:token/approve — user approves preview + requests payment ──
router.post('/preview/:token/approve', async (req, res) => {
  try {
    const { data: request } = await supabaseAdmin
      .from('onboarding_assistance_requests')
      .select('id, tenant_id, setup_fee_paise, token_advance_paise, status, preview_token_expires_at')
      .eq('preview_token', req.params.token)
      .maybeSingle();

    if (!request) return res.status(404).json({ success: false, message: 'Preview link not found' });
    if (new Date(request.preview_token_expires_at) < new Date()) {
      return res.status(410).json({ success: false, message: 'Preview link has expired' });
    }

    const remaining_paise = (request.setup_fee_paise || 99900) - (request.token_advance_paise || 0);

    // If no payment needed, publish immediately
    if (remaining_paise <= 0) {
      await Promise.all([
        supabaseAdmin.from('designs').update({ is_active: true }).eq('tenant_id', request.tenant_id).eq('is_active', false),
        supabaseAdmin.from('tenants').update({ onboarding_complete: true }).eq('id', request.tenant_id),
        supabaseAdmin.from('onboarding_assistance_requests').update({
          status: 'complete',
          preview_approved_at: new Date().toISOString(),
          published_at:        new Date().toISOString(),
          completed_at:        new Date().toISOString(),
          updated_at:          new Date().toISOString(),
        }).eq('id', request.id),
      ]);
      return res.json({ success: true, data: { payment_required: false, published: true } });
    }

    // Create Razorpay order for remaining balance
    const keyId     = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return res.status(500).json({ success: false, message: 'Payment gateway not configured' });
    }

    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const order = await razorpay.orders.create({
      amount:   remaining_paise,
      currency: 'INR',
      notes:    { assistance_request_id: request.id, type: 'final_setup' },
    });

    await supabaseAdmin.from('onboarding_assistance_requests').update({
      razorpay_final_order_id: order.id,
      preview_approved_at:     new Date().toISOString(),
      status:                  'payment_pending',
      updated_at:              new Date().toISOString(),
    }).eq('id', request.id);

    res.json({
      success: true,
      data: {
        payment_required: true,
        order_id:         order.id,
        amount_paise:     remaining_paise,
        currency:         'INR',
        razorpay_key_id:  keyId,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /preview/:token/verify-payment — verify payment + publish ───────────
router.post('/preview/:token/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return res.status(500).json({ success: false, message: 'Payment gateway not configured' });

    // Verify signature
    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    const { data: request } = await supabaseAdmin
      .from('onboarding_assistance_requests')
      .select('id, tenant_id')
      .eq('preview_token', req.params.token)
      .maybeSingle();

    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    // Publish designs + complete onboarding
    await Promise.all([
      supabaseAdmin.from('designs').update({ is_active: true }).eq('tenant_id', request.tenant_id).eq('is_active', false),
      supabaseAdmin.from('tenants').update({ onboarding_complete: true }).eq('id', request.tenant_id),
      supabaseAdmin.from('onboarding_progress').upsert(
        { tenant_id: request.tenant_id, is_complete: true, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { onConflict: 'tenant_id' }
      ),
      supabaseAdmin.from('onboarding_assistance_requests').update({
        status:       'complete',
        final_paid_at: new Date().toISOString(),
        published_at:  new Date().toISOString(),
        completed_at:  new Date().toISOString(),
        updated_at:    new Date().toISOString(),
      }).eq('id', request.id),
    ]);

    res.json({ success: true, data: { published: true } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /setup-request ─────────────────────────────────────────────────────
// Save a new setup request (from the "We Setup For You" form with payment info)
router.post('/setup-request', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const {
      name, whatsapp, best_time, catalog_size, data_description,
      links, files_uploaded, ai_enrichment, amount, payment_status,
    } = req.body;

    if (!name || !whatsapp || !catalog_size) {
      return res.status(400).json({ success: false, message: 'name, whatsapp, and catalog_size are required' });
    }

    const { data, error } = await supabaseAdmin
      .from('setup_requests')
      .insert({
        brand_id:         req.tenantId,
        name:             name             || null,
        whatsapp:         whatsapp         || null,
        best_time:        best_time        || null,
        catalog_size:     catalog_size     || null,
        data_description: data_description || null,
        links:            Array.isArray(links)          ? links          : [],
        files_uploaded:   Array.isArray(files_uploaded) ? files_uploaded : [],
        ai_enrichment:    ai_enrichment === true,
        amount:           Number(amount)  || 0,
        payment_status:   payment_status  || 'pending_payment',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ success: false, message: error.message });

    sendWhatsApp(
      whatsapp,
      `Hi ${(name || '').split(' ')[0] || 'there'}! 🙏 We received your catalog setup request. Our team will contact you within a few hours. Meanwhile, you can explore your dashboard: ${(process.env.FRONTEND_URL || '').split(',')[0].trim()}`
    );

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /setup-request/:id/create-order ────────────────────────────────────
// Create a Razorpay order for the saved setup request
router.post('/setup-request/:id/create-order', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { data: request, error: fetchErr } = await supabaseAdmin
      .from('setup_requests')
      .select('id, amount, payment_status, brand_id')
      .eq('id', req.params.id)
      .eq('brand_id', req.tenantId)
      .maybeSingle();

    if (fetchErr || !request) {
      return res.status(404).json({ success: false, message: 'Setup request not found' });
    }
    if (request.payment_status === 'paid') {
      return res.status(400).json({ success: false, message: 'This request has already been paid' });
    }

    const keyId     = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return res.status(500).json({ success: false, message: 'Payment gateway not configured' });
    }

    const razorpay   = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const amountPaise = Math.round(Number(request.amount) * 100);
    const order      = await razorpay.orders.create({
      amount:   amountPaise,
      currency: 'INR',
      notes:    { setup_request_id: request.id, type: 'setup_request' },
    });

    await supabaseAdmin
      .from('setup_requests')
      .update({ payment_status: 'pending_payment' })
      .eq('id', request.id);

    res.json({
      success: true,
      data: {
        order_id:    order.id,
        amount_paise: amountPaise,
        currency:    'INR',
        key_id:      keyId,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /setup-request/:id/verify-payment ──────────────────────────────────
// Verify Razorpay signature and mark setup request as paid
router.post('/setup-request/:id/verify-payment', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ success: false, message: 'Payment gateway not configured' });
    }

    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed — signature mismatch' });
    }

    const { error } = await supabaseAdmin
      .from('setup_requests')
      .update({ payment_status: 'paid' })
      .eq('id', req.params.id)
      .eq('brand_id', req.tenantId);

    if (error) return res.status(500).json({ success: false, message: error.message });

    res.json({ success: true, data: { paid: true } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
