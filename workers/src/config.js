import { createClient } from '@supabase/supabase-js';

export function getConfig(env) {
  return {
    supabaseUrl: env.VITE_SUPABASE_URL,
    supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY,
    supabaseServiceKey: env.VITE_SUPABASE_SERVICE_KEY,
    r2PublicUrl: env.R2_PUBLIC_URL
  };
}

export function getSupabase(env) {
  const config = getConfig(env);
  return createClient(config.supabaseUrl, config.supabaseAnonKey);
}

export function getSupabaseAdmin(env) {
  const config = getConfig(env);
  return createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Create Supabase client with user's auth token (enforces RLS)
export function getSupabaseWithAuth(env, userToken) {
  const config = getConfig(env);
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
