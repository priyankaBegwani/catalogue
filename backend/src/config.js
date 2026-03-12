import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory (two levels up from backend/src)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  supabaseUrl: process.env.VITE_SUPABASE_URL,
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY,
  supabaseServiceKey: process.env.VITE_SUPABASE_SERVICE_KEY,
  port: process.env.PORT || 3001
};

export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
export const supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
