import { supabase } from '../config.js';
import { cache } from '../utils/cache.js';
import { AppError } from '../utils/errorHandler.js';

/**
 * Get user profile with caching
 */
const getUserProfile = async (userId, token) => {
  const cacheKey = `user_profile:${userId}`;
  
  return cache.getOrSet(cacheKey, async () => {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*, user_roles(*)')
      .eq('id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !profile) {
      throw new AppError('User profile not found or inactive', 403);
    }

    return profile;
  }, 300); // Cache for 5 minutes
};

export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const profile = await getUserProfile(user.id, token);

    // Tenant isolation check — skip for superadmins (cross-tenant), unset tenantId,
    // or dev default-tenant fallback.
    const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';
    const isDevDefaultFallback =
      process.env.NODE_ENV === 'development' && req.tenantId === DEFAULT_TENANT;

    if (req.tenantId && !isDevDefaultFallback && !profile.is_superadmin && profile.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'User does not belong to this tenant' });
    }

    req.user = user;
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
  // Check new role system only (old role field has been removed)
  const isAdmin = req.profile?.user_roles?.role_name === 'Admin';

  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Superadmin guard — cross-tenant internal tools only.
 * Must be used after authenticateUser. Does NOT require a tenant context.
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.profile?.is_superadmin) {
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  next();
};

/**
 * Check if user has specific permission
 * @param {string} module - Module name (e.g., 'parties', 'orders')
 * @param {string} action - Action name (e.g., 'view', 'create', 'edit')
 */
export const requirePermission = (module, action) => {
  return (req, res, next) => {
    const userRoles = req.profile?.user_roles;
    
    if (!userRoles || !userRoles.permissions) {
      return res.status(403).json({ error: 'Access denied: No permissions found' });
    }

    const modulePermissions = userRoles.permissions[module];
    
    if (!modulePermissions || !modulePermissions[action]) {
      return res.status(403).json({ 
        error: `Access denied: Missing ${action} permission for ${module}` 
      });
    }

    next();
  };
};

/**
 * Check if user has any of the specified permissions
 * @param {Array} permissions - Array of {module, action} objects
 */
export const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    const userRoles = req.profile?.user_roles;
    
    if (!userRoles || !userRoles.permissions) {
      return res.status(403).json({ error: 'Access denied: No permissions found' });
    }

    const hasPermission = permissions.some(({ module, action }) => {
      const modulePermissions = userRoles.permissions[module];
      return modulePermissions && modulePermissions[action];
    });

    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }

    next();
  };
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      req.profile = null;
      return next();
    }

    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      req.user = null;
      req.profile = null;
      return next();
    }

    try {
      const profile = await getUserProfile(user.id, token);
      req.user = user;
      req.profile = profile;
    } catch (profileError) {
      req.user = null;
      req.profile = null;
    }
    
    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    req.user = null;
    req.profile = null;
    next();
  }
};
