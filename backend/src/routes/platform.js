import express from 'express';
import { registerTenant, getTenantContext } from '../services/tenantService.js';
import { supabaseAdmin } from '../config.js';

const router = express.Router();

// POST /api/platform/register
// Called by the marketing website after plan selection.
// No auth. Uses its own rate limiting (see server.js).
router.post('/register', async (req, res) => {
  try {
    const { business_name, subdomain, owner_name, email, password, phone, plan } = req.body;

    if (!business_name || !subdomain || !owner_name || !email || !password || !phone || !plan) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const result = await registerTenant({
      businessName: business_name,
      slug: subdomain,
      ownerName: owner_name,
      email,
      password,
      phone,
      planName: plan,
    });

    res.status(201).json({
      success: true,
      data: {
        tenant_id: result.tenantId,
        slug: result.slug,
        app_url: result.appUrl,
        ott: result.ott ?? null,
      },
      message: 'Account created successfully',
    });
  } catch (err) {
    const status = err.statusCode || 500;
    res.status(status).json({ success: false, message: err.message });
  }
});

// GET /api/platform/check-slug?slug=mybrand
// Used for real-time availability check on the registration form
router.get('/check-slug', async (req, res) => {
  const { slug } = req.query;
  if (!slug) return res.status(400).json({ success: false, message: 'slug is required' });

  if (!/^[a-z0-9][a-z0-9-]{2,29}$/.test(slug)) {
    return res.json({ success: true, data: { available: false, reason: 'Invalid format' } });
  }

  const { data } = await supabaseAdmin.from('tenants').select('id').eq('slug', slug).maybeSingle();
  res.json({ success: true, data: { available: !data } });
});

// GET /api/platform/plans
// Used by the marketing site to list plans dynamically
router.get('/plans', async (req, res) => {
  const { data } = await supabaseAdmin.from('plans').select('*').eq('is_active', true).order('price_monthly');
  res.json({ success: true, data });
});

// POST /api/platform/subscription/update
// Platform admin only — called manually or by payment webhook.
// Body: { tenant_id, status: 'active'|'trial'|'cancelled', period?: 'monthly'|'yearly', duration_months?: number }
router.post('/subscription/update', async (req, res) => {
  const secret = req.headers['x-platform-secret'];
  if (!secret || secret !== process.env.PLATFORM_SECRET) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const { tenant_id, status, period, duration_months } = req.body;

  if (!tenant_id || !status) {
    return res.status(400).json({ success: false, message: 'tenant_id and status are required' });
  }

  if (!['active', 'trial', 'past_due', 'cancelled'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const updates = { subscription_status: status };

  if (status === 'active') {
    const months = duration_months || (period === 'yearly' ? 12 : 1);
    updates.subscription_period = period || 'monthly';
    updates.current_period_start = new Date().toISOString();
    updates.current_period_end = new Date(Date.now() + months * 30 * 86400000).toISOString();
    updates.grace_period_ends_at = null; // Clear grace period on activation
  }

  const { error } = await supabaseAdmin
    .from('tenants')
    .update(updates)
    .eq('id', tenant_id);

  if (error) return res.status(500).json({ success: false, message: error.message });

  // Invalidate subscription cache
  const { invalidateSubscriptionCache } = await import('../middleware/checkSubscription.js');
  invalidateSubscriptionCache(tenant_id);

  res.json({ success: true, message: `Tenant subscription updated to ${status}` });
});

export default router;
