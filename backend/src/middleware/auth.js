import { supabase, supabaseAdmin, config } from '../config.js';
import { cache } from '../utils/cache.js';
import { AppError } from '../utils/errorHandler.js';
import { verifyHS256JWT } from '../utils/jwt.js';

/**
 * Resolve a Bearer token to { userId, userEmail }.
 *
 * Fast path  — if SUPABASE_JWT_SECRET is set, verify the HS256 signature locally.
 *              No network call to Supabase.  ~0.3 ms vs. ~80-200 ms for the API.
 * Slow path  — fall back to supabase.auth.getUser(token) when the secret is not
 *              configured or the token uses a different algorithm (e.g. RS256).
 */
async function resolveToken(token) {
  if (config.supabaseJwtSecret) {
    try {
      const claims = verifyHS256JWT(token, config.supabaseJwtSecret);
      return { userId: claims.sub, userEmail: claims.email ?? null };
    } catch {
      // Local verification failed — do NOT fall back; reject immediately.
      // If the secret is configured we trust it fully.
      throw new AppError('Invalid or expired token', 401);
    }
  }

  // No secret configured → call Supabase API (original behaviour)
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new AppError('Invalid or expired token', 401);
  return { userId: user.id, userEmail: user.email ?? null };
}

/**
 * Fetch user profile + roles with a 5-minute cache.
 * Uses supabaseAdmin to bypass RLS — safe because this is server-side only.
 */
const getUserProfile = async (userId) => {
  const cacheKey = `user_profile:${userId}`;
  return cache.getOrSet(cacheKey, async () => {
    const { data: profile, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !profile) {
      throw new AppError('User profile not found or inactive', 403);
    }
    return profile;
  }, 300);
};

export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { userId, userEmail } = await resolveToken(token);
    const profile = await getUserProfile(userId);

    const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';
    const isDevDefaultFallback =
      process.env.NODE_ENV === 'development' && req.tenantId === DEFAULT_TENANT;

    if (req.tenantId && !isDevDefaultFallback && !profile.is_superadmin && profile.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'User does not belong to this tenant' });
    }

    req.user    = { id: userId, email: userEmail, created_at: profile.created_at };
    req.profile = profile;
    next();
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.profile?.user_roles?.role_name !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const requireSuperAdmin = (req, res, next) => {
  if (!req.profile?.is_superadmin) {
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  next();
};

export const requirePermission = (module, action) => (req, res, next) => {
  const perms = req.profile?.user_roles?.permissions;
  if (!perms?.[module]?.[action]) {
    return res.status(403).json({ error: `Access denied: Missing ${action} permission for ${module}` });
  }
  next();
};

export const requireAnyPermission = (permissions) => (req, res, next) => {
  const perms = req.profile?.user_roles?.permissions;
  if (!perms) return res.status(403).json({ error: 'Access denied: No permissions found' });
  const ok = permissions.some(({ module, action }) => perms[module]?.[action]);
  if (!ok) return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
  next();
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null; req.profile = null;
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const { userId, userEmail } = await resolveToken(token);
      const profile = await getUserProfile(userId);
      req.user    = { id: userId, email: userEmail, created_at: profile.created_at };
      req.profile = profile;
    } catch {
      req.user = null; req.profile = null;
    }
    next();
  } catch {
    req.user = null; req.profile = null;
    next();
  }
};
