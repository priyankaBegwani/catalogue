import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { requirePermission } from '../middleware/auth.js';
import { getTenantContext, invalidateTenantCache } from '../services/tenantService.js';
import { supabaseAdmin } from '../config.js';
import { cache } from '../utils/cache.js';

const router = express.Router();

// GET /api/tenant/resolve  (no auth — called before login to load branding)
router.get('/resolve', async (req, res) => {
  const ctx = await getTenantContext(req.tenantId);
  if (!ctx) return res.status(404).json({ success: false, message: 'Tenant not found' });
  res.json({ success: true, data: ctx });
});

// PUT /api/tenant/branding  (admin only)
router.put('/branding', authenticateUser, requirePermission('settings', 'edit'), async (req, res) => {
  const { business_name, tagline, logo_url, favicon_url, primary_color, secondary_color, accent_color } = req.body;

  const { error } = await supabaseAdmin
    .from('tenant_branding')
    .update({ business_name, tagline, logo_url, favicon_url, primary_color, secondary_color, accent_color })
    .eq('tenant_id', req.tenantId);

  if (error) return res.status(500).json({ success: false, message: error.message });

  invalidateTenantCache(req.tenantId);
  res.json({ success: true, message: 'Branding updated' });
});

// GET /api/tenant/domains
router.get('/domains', authenticateUser, requirePermission('settings', 'view'), async (req, res) => {
  const { data } = await supabaseAdmin
    .from('tenant_domains')
    .select('*')
    .eq('tenant_id', req.tenantId)
    .order('created_at');
  res.json({ success: true, data });
});

// POST /api/tenant/domains  — add a custom domain
router.post('/domains', authenticateUser, requirePermission('settings', 'edit'), async (req, res) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ success: false, message: 'domain is required' });

  // Check plan allows custom domains
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('plans(features)')
    .eq('id', req.tenantId)
    .single();

  if (!tenant?.plans?.features?.custom_domain) {
    return res.status(403).json({ success: false, message: 'Custom domains require the Enterprise plan' });
  }

  const { data, error } = await supabaseAdmin
    .from('tenant_domains')
    .insert({ tenant_id: req.tenantId, domain })
    .select()
    .single();

  if (error) return res.status(409).json({ success: false, message: 'Domain already in use or invalid' });

  res.status(201).json({
    success: true,
    data,
    message: `Add a CNAME record: ${domain} → tenants.${process.env.APP_DOMAIN}. Then verify below.`,
  });
});

// POST /api/tenant/domains/:id/verify
router.post('/domains/:id/verify', authenticateUser, requirePermission('settings', 'edit'), async (req, res) => {
  const { data: domainRow } = await supabaseAdmin
    .from('tenant_domains')
    .select('*')
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .single();

  if (!domainRow) return res.status(404).json({ success: false, message: 'Domain not found' });
  if (domainRow.is_verified) return res.json({ success: true, message: 'Already verified' });

  // Check DNS CNAME points to our platform
  const dns = await import('node:dns/promises');
  try {
    const records = await dns.resolveCname(domainRow.domain);
    const appDomain = process.env.APP_DOMAIN || '';
    const pointsToUs = records.some(r => r.includes(appDomain) || r.includes('tenants.'));

    if (!pointsToUs) {
      return res.status(400).json({ success: false, message: 'CNAME not yet pointing to our platform. DNS changes can take up to 24 hours.' });
    }
  } catch {
    return res.status(400).json({ success: false, message: 'Could not resolve domain. Check your DNS settings.' });
  }

  await supabaseAdmin
    .from('tenant_domains')
    .update({ is_verified: true, verified_at: new Date().toISOString() })
    .eq('id', domainRow.id);

  // Invalidate host cache so the domain is immediately active
  cache.delete(`tenant_host:${domainRow.domain}`);

  res.json({ success: true, message: 'Domain verified successfully' });
});

// DELETE /api/tenant/domains/:id
router.delete('/domains/:id', authenticateUser, requirePermission('settings', 'edit'), async (req, res) => {
  const { data: domainRow } = await supabaseAdmin
    .from('tenant_domains')
    .select('domain')
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .single();

  await supabaseAdmin.from('tenant_domains').delete().eq('id', req.params.id);
  if (domainRow) cache.delete(`tenant_host:${domainRow.domain}`);

  res.json({ success: true, message: 'Domain removed' });
});

// PUT /api/tenant/subdomain  — change subdomain
router.put('/subdomain', authenticateUser, requirePermission('settings', 'edit'), async (req, res) => {
  const { slug } = req.body;

  if (!/^[a-z0-9][a-z0-9-]{2,29}$/.test(slug)) {
    return res.status(400).json({ success: false, message: 'Invalid subdomain format' });
  }

  const { data: conflict } = await supabaseAdmin
    .from('tenants').select('id').eq('slug', slug).maybeSingle();
  if (conflict) return res.status(409).json({ success: false, message: 'Subdomain already taken' });

  // Invalidate old slug from cache before update
  const { data: current } = await supabaseAdmin
    .from('tenants').select('slug').eq('id', req.tenantId).single();
  const oldHost = `${current.slug}.${process.env.APP_DOMAIN}`;
  cache.delete(`tenant_host:${oldHost}`);

  await supabaseAdmin.from('tenants').update({ slug }).eq('id', req.tenantId);
  invalidateTenantCache(req.tenantId);

  const newAppUrl = `https://${slug}.${process.env.APP_DOMAIN}`;
  res.json({ success: true, data: { new_url: newAppUrl }, message: 'Subdomain updated. Please bookmark your new URL.' });
});

// GET /api/tenant/settings
router.get('/settings', authenticateUser, requirePermission('settings', 'view'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('tenant_settings')
    .select('*')
    .eq('tenant_id', req.tenantId)
    .single();

  if (error) return res.status(500).json({ success: false, message: error.message });
  res.json({ success: true, data });
});

// PUT /api/tenant/settings
router.put('/settings', authenticateUser, requirePermission('settings', 'edit'), async (req, res) => {
  const {
    whatsapp_number,
    tawk_property_id,
    tawk_widget_id,
    show_price_to_customers,
    pricing_active_model,
    pricing_volume_tiers,
    pricing_relationship_tiers,
  } = req.body;

  // Only include fields that were actually sent
  const updates = {};
  if (whatsapp_number !== undefined) updates.whatsapp_number = whatsapp_number || null;
  if (tawk_property_id !== undefined) updates.tawk_property_id = tawk_property_id || null;
  if (tawk_widget_id !== undefined) updates.tawk_widget_id = tawk_widget_id || null;
  if (show_price_to_customers !== undefined) updates.show_price_to_customers = Boolean(show_price_to_customers);
  if (pricing_active_model !== undefined) {
    if (!['volume', 'relationship', 'hybrid'].includes(pricing_active_model)) {
      return res.status(400).json({ success: false, message: 'Invalid pricing_active_model' });
    }
    updates.pricing_active_model = pricing_active_model;
  }
  if (pricing_volume_tiers !== undefined) updates.pricing_volume_tiers = pricing_volume_tiers;
  if (pricing_relationship_tiers !== undefined) updates.pricing_relationship_tiers = pricing_relationship_tiers;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ success: false, message: 'No valid fields provided' });
  }

  const { error } = await supabaseAdmin
    .from('tenant_settings')
    .update(updates)
    .eq('tenant_id', req.tenantId);

  if (error) return res.status(500).json({ success: false, message: error.message });

  cache.delete(`tenant_ctx:${req.tenantId}`);
  res.json({ success: true, message: 'Settings updated' });
});

// GET /api/tenant/subscription
// Accessible even when subscription is expired (frontend reads this to show status)
router.get('/subscription', authenticateUser, async (req, res) => {
  const { data: tenant, error } = await supabaseAdmin
    .from('tenants')
    .select('subscription_status, subscription_period, trial_ends_at, current_period_start, current_period_end, grace_period_ends_at, is_active')
    .eq('id', req.tenantId)
    .single();

  if (error || !tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

  const now = new Date();

  // Compute days remaining
  let daysRemaining = null;
  let effectiveEnd = null;

  if (tenant.subscription_status === 'trial' && tenant.trial_ends_at) {
    effectiveEnd = new Date(tenant.trial_ends_at);
    daysRemaining = Math.max(0, Math.ceil((effectiveEnd - now) / 86400000));
  } else if (tenant.subscription_status === 'active' && tenant.current_period_end) {
    effectiveEnd = new Date(tenant.current_period_end);
    daysRemaining = Math.max(0, Math.ceil((effectiveEnd - now) / 86400000));
  }

  const graceEnd = tenant.grace_period_ends_at
    ? new Date(tenant.grace_period_ends_at)
    : effectiveEnd
      ? new Date(effectiveEnd.getTime() + 3 * 86400000)
      : null;

  const isExpired = effectiveEnd ? effectiveEnd < now && (!graceEnd || graceEnd < now) : false;
  const inGrace  = effectiveEnd ? effectiveEnd < now && graceEnd && graceEnd > now : false;

  res.json({
    success: true,
    data: {
      subscription_status: tenant.subscription_status,
      subscription_period: tenant.subscription_period,
      trial_ends_at: tenant.trial_ends_at,
      current_period_start: tenant.current_period_start,
      current_period_end: tenant.current_period_end,
      grace_period_ends_at: graceEnd?.toISOString() ?? null,
      days_remaining: daysRemaining,
      is_expired: isExpired,
      in_grace_period: inGrace,
    },
  });
});

export default router;
