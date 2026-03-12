import { getSupabase } from '../config.js';

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}

// In-memory cache for Workers (per-request lifecycle)
const cache = new Map();

async function getUserProfile(supabase, userId) {
  const cacheKey = `user_profile:${userId}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !profile) {
    throw new AppError('User profile not found or inactive', 403);
  }

  cache.set(cacheKey, profile);
  return profile;
}

export async function authenticateUser(c, next) {
  try {
    const authHeader = c.req.header('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabase(c.env);

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }

    const profile = await getUserProfile(supabase, user.id);

    c.set('user', user);
    c.set('profile', profile);
    
    await next();
  } catch (error) {
    if (error.statusCode) {
      return c.json({ error: error.message }, error.statusCode);
    }
    console.error('Authentication error:', error);
    return c.json({ error: 'Authentication failed' }, 500);
  }
}

export async function requireAdmin(c, next) {
  const profile = c.get('profile');
  
  if (profile?.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }
  
  await next();
}

export async function optionalAuth(c, next) {
  try {
    const authHeader = c.req.header('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      c.set('user', null);
      c.set('profile', null);
      await next();
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabase(c.env);

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      c.set('user', null);
      c.set('profile', null);
      await next();
      return;
    }

    try {
      const profile = await getUserProfile(supabase, user.id);
      c.set('user', user);
      c.set('profile', profile);
    } catch (profileError) {
      c.set('user', null);
      c.set('profile', null);
    }
    
    await next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    c.set('user', null);
    c.set('profile', null);
    await next();
  }
}
