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
      .select('*')
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
  if (req.profile?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
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
