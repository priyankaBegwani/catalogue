import { supabaseAdmin } from '../config.js';
import { cache } from '../utils/cache.js';

// Routes always accessible regardless of subscription status
// (auth, platform registration, tenant branding/resolve, export, health)
// Note: req.path is relative to the /api mount point, so /api/tenant/resolve → /tenant/resolve
const ALWAYS_ALLOWED_PATTERNS = [
  /^\/auth\//,
  /^\/platform\//,
  /^\/tenant\/resolve/,
  /^\/tenant\/subscription/,
  /^\/export\//,
  /^\/health/,
  /^\/webhook\//,
];

// Routes accessible for data export only when subscription is expired
const EXPORT_ALLOWED_PATTERNS = [
  /^\/export\//,
];

function isAlwaysAllowed(path) {
  return ALWAYS_ALLOWED_PATTERNS.some(p => p.test(path));
}

function isExportRoute(path) {
  return EXPORT_ALLOWED_PATTERNS.some(p => p.test(path));
}

/**
 * Returns the live subscription status for a tenant.
 * Cached for 60 seconds — short enough to pick up manual activations quickly.
 */
async function fetchSubscriptionStatus(tenantId) {
  const cacheKey = `subscription:${tenantId}`;

  return cache.getOrSet(cacheKey, async () => {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('subscription_status, trial_ends_at, current_period_end, grace_period_ends_at, is_active')
      .eq('id', tenantId)
      .single();

    if (!tenant || !tenant.is_active) {
      return { status: 'inactive', isActive: false, inGrace: false, daysRemaining: 0 };
    }

    const now = new Date();

    // Helper: days remaining until a timestamp
    const daysUntil = (ts) => ts ? Math.max(0, Math.ceil((new Date(ts) - now) / 86400000)) : null;

    // ------------------------------------------------------------------
    // TRIAL
    // ------------------------------------------------------------------
    if (tenant.subscription_status === 'trial') {
      if (!tenant.trial_ends_at) {
        // No expiry set — unlimited trial (shouldn't happen but safe fallback)
        return { status: 'trial', isActive: true, inGrace: false, daysRemaining: null };
      }

      const trialEnd = new Date(tenant.trial_ends_at);

      if (trialEnd > now) {
        return { status: 'trial', isActive: true, inGrace: false, daysRemaining: daysUntil(tenant.trial_ends_at) };
      }

      // Trial ended — check 3-day grace period
      const graceEnd = tenant.grace_period_ends_at
        ? new Date(tenant.grace_period_ends_at)
        : new Date(trialEnd.getTime() + 3 * 86400000); // 3 days after trial end

      if (graceEnd > now) {
        return { status: 'trial_grace', isActive: true, inGrace: true, daysRemaining: 0 };
      }

      return { status: 'trial_expired', isActive: false, inGrace: false, daysRemaining: 0 };
    }

    // ------------------------------------------------------------------
    // ACTIVE SUBSCRIPTION (monthly / yearly)
    // ------------------------------------------------------------------
    if (tenant.subscription_status === 'active') {
      if (!tenant.current_period_end) {
        // Lifetime / no expiry
        return { status: 'active', isActive: true, inGrace: false, daysRemaining: null };
      }

      const periodEnd = new Date(tenant.current_period_end);

      if (periodEnd > now) {
        return { status: 'active', isActive: true, inGrace: false, daysRemaining: daysUntil(tenant.current_period_end) };
      }

      // Period ended — grace period
      const graceEnd = tenant.grace_period_ends_at
        ? new Date(tenant.grace_period_ends_at)
        : new Date(periodEnd.getTime() + 3 * 86400000);

      if (graceEnd > now) {
        return { status: 'subscription_grace', isActive: true, inGrace: true, daysRemaining: 0 };
      }

      return { status: 'expired', isActive: false, inGrace: false, daysRemaining: 0 };
    }

    // ------------------------------------------------------------------
    // PAST DUE
    // ------------------------------------------------------------------
    if (tenant.subscription_status === 'past_due') {
      const graceEnd = tenant.grace_period_ends_at ? new Date(tenant.grace_period_ends_at) : null;
      if (graceEnd && graceEnd > now) {
        return { status: 'past_due_grace', isActive: true, inGrace: true, daysRemaining: 0 };
      }
      return { status: 'past_due_expired', isActive: false, inGrace: false, daysRemaining: 0 };
    }

    // CANCELLED / UNKNOWN
    return { status: tenant.subscription_status, isActive: false, inGrace: false, daysRemaining: 0 };
  }, 60);
}

/**
 * Invalidate subscription cache for a tenant (call after payment / status update).
 */
export function invalidateSubscriptionCache(tenantId) {
  cache.delete(`subscription:${tenantId}`);
}

/**
 * Express middleware — enforces subscription status on every API request.
 * Must run AFTER resolveTenant and BEFORE route handlers.
 *
 * Expired tenants:
 *   - /api/export/* allowed (authenticated data export)
 *   - /api/auth/*, /api/tenant/subscription, /api/platform/* always allowed
 *   - Everything else → 402 Payment Required
 */
export const checkSubscription = async (req, res, next) => {
  try {
    const tenantId = req.tenantId;

    // No tenant resolved yet (shouldn't happen if placed after resolveTenant)
    if (!tenantId) return next();

    // Routes that bypass subscription checks entirely
    if (isAlwaysAllowed(req.path)) return next();

    const status = await fetchSubscriptionStatus(tenantId);
    req.subscriptionStatus = status;

    if (status.isActive) return next();

    // Frozen — only export routes pass through
    if (isExportRoute(req.path)) return next();

    return res.status(402).json({
      error: 'Account frozen',
      code: 'SUBSCRIPTION_EXPIRED',
      message: 'Your subscription has expired. Please renew to continue, or export your data.',
      subscriptionStatus: status.status,
    });
  } catch (err) {
    next(err);
  }
};
