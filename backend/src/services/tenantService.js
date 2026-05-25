import { supabaseAdmin } from '../config.js';
import { cache } from '../utils/cache.js';
import { AppError } from '../utils/errorHandler.js';

// The 6 default roles to seed for every new tenant
const DEFAULT_ROLES = ['Admin','Staff','Wholesaler','Distributor','Sales','Retailer','Guest'];

/**
 * Called once from the marketing site registration.
 * Creates tenant + branding + seeds roles + creates owner admin user.
 * Returns { tenantId, slug, appUrl, session }
 */
export async function registerTenant({ businessName, slug, ownerName, email, password, phone, planName }) {
  // 1. Validate slug format
  if (!/^[a-z0-9][a-z0-9-]{2,29}$/.test(slug)) {
    throw new AppError('Subdomain must be 3-30 lowercase letters, numbers, or hyphens and cannot start with a hyphen', 400);
  }

  // 2. Check slug uniqueness
  const { data: existing } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existing) throw new AppError('This subdomain is already taken', 409);

  // 3. Resolve plan
  const { data: plan } = await supabaseAdmin
    .from('plans')
    .select('id')
    .eq('name', planName)
    .eq('is_active', true)
    .maybeSingle();

  if (!plan) throw new AppError('Invalid plan selected', 400);

  // 4. Create tenant record
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 30);

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .insert({
      slug,
      name: businessName,
      plan_id: plan.id,
      owner_email: email,
      owner_phone: phone,
      subscription_status: 'trial',
      trial_ends_at: trialEnd.toISOString(),
    })
    .select('id, slug')
    .single();

  if (tenantError) throw new AppError('Failed to create tenant: ' + tenantError.message, 500);

  const tenantId = tenant.id;

  // 5. Create branding + settings rows (defaults only — brand configures later)
  await Promise.all([
    supabaseAdmin.from('tenant_branding').insert({
      tenant_id: tenantId,
      business_name: businessName,
    }),
    supabaseAdmin.from('tenant_settings').insert({
      tenant_id: tenantId,
    }),
  ]);

  // 6. Seed tenant roles (copy global role templates, bind to this tenant)
  const { data: templateRoles } = await supabaseAdmin
    .from('user_roles')
    .select('role_name, role_description, permissions, is_system_role')
    .eq('tenant_id', '00000000-0000-0000-0000-000000000001') // default tenant's roles are the templates
    .in('role_name', DEFAULT_ROLES);

  const tenantRoles = templateRoles.map(r => ({ ...r, tenant_id: tenantId }));
  const { data: seededRoles } = await supabaseAdmin
    .from('user_roles')
    .insert(tenantRoles)
    .select('id, role_name');

  const adminRole = seededRoles.find(r => r.role_name === 'Admin');
  if (!adminRole) throw new AppError('Failed to seed tenant roles', 500);

  // 7. Create the owner's Supabase auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,           // skip email verification for B2B onboarding
    user_metadata: {
      full_name: ownerName,
      tenant_id: tenantId,          // trigger reads this to set profile.tenant_id
      role_id: adminRole.id,        // trigger sets this immediately; step 8 is a safety net
    },
    app_metadata: {
      tenant_id: tenantId,          // embedded in JWT — RLS reads this
    },
  });

  if (authError) {
    // Rollback: clean up tenant if user creation fails
    await supabaseAdmin.from('tenants').delete().eq('id', tenantId);
    throw new AppError('Failed to create user account: ' + authError.message, 500);
  }

  const userId = authData.user.id;

  // 8. Update the auto-created profile with role_id, phone, and ensure is_active = true
  await supabaseAdmin
    .from('user_profiles')
    .update({
      role_id: adminRole.id,
      phone_number: phone,
      tenant_id: tenantId,
      is_active: true,               // required — auth middleware checks this
    })
    .eq('id', userId);

  // 9. Build the app URL for redirect
  const appUrl = `https://${slug}.${process.env.APP_DOMAIN}`;

  return { tenantId, slug, appUrl };
}

/**
 * Resolve tenant from hostname. Used by resolveTenant middleware.
 */
export async function resolveTenantByHost(host) {
  // Strip port if present (dev environments)
  const cleanHost = host.split(':')[0];

  // 1. Custom domain lookup
  const { data: domainRow } = await supabaseAdmin
    .from('tenant_domains')
    .select('tenant_id')
    .eq('domain', cleanHost)
    .eq('is_verified', true)
    .maybeSingle();

  if (domainRow) return domainRow.tenant_id;

  // 2. Subdomain lookup
  const appDomain = process.env.APP_DOMAIN || '';
  if (appDomain && cleanHost.endsWith(`.${appDomain}`)) {
    const slug = cleanHost.replace(`.${appDomain}`, '');
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (tenant) return tenant.id;
  }

  // 3. Dev fallback — if APP_DOMAIN not set, use the default tenant
  if (process.env.NODE_ENV === 'development' && !appDomain) {
    return '00000000-0000-0000-0000-000000000001';
  }

  return null;
}

/**
 * Get tenant branding + features for the frontend.
 * Called from GET /api/tenant/resolve — no auth needed.
 */
export async function getTenantContext(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select(`
      id, slug, name, subscription_status, trial_ends_at, current_period_end, onboarding_complete,
      tenant_branding (business_name, logo_url, favicon_url, primary_color, secondary_color, accent_color, tagline),
      tenant_settings (whatsapp_number, tawk_property_id, tawk_widget_id, show_price_to_customers, pricing_active_model, pricing_volume_tiers, pricing_relationship_tiers),
      plans (name, features, max_products, max_users, max_retailers)
    `)
    .eq('id', tenantId)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Invalidate all cached tenant data for a tenant (call after branding/domain updates).
 */
export function invalidateTenantCache(tenantId) {
  cache.delete(`tenant_ctx:${tenantId}`);
  // Also invalidate feature cache if you add one later
}
