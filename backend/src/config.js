import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

export const config = {
  supabaseUrl: process.env.VITE_SUPABASE_URL,
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.VITE_SUPABASE_SERVICE_KEY,
  port: process.env.PORT || 3001,
  // Storage type: 'cdn', 'supabase', or 'local'
  // - 'cdn': Use Wasabi/Cloudflare CDN (production)
  // - 'supabase': Use Supabase Storage (fallback)
  // - 'local': Use local filesystem (development/testing)
  storageType: process.env.STORAGE_TYPE || 'local'
};

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
export const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
