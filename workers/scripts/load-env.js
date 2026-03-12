/**
 * Load environment variables from root .env file for Cloudflare Workers
 * This script reads the root .env file and creates a .dev.vars file for wrangler
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootEnvPath = path.resolve(__dirname, '../../.env');
const devVarsPath = path.resolve(__dirname, '../.dev.vars');

// Variables to sync to .dev.vars
const varsToSync = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_SERVICE_KEY',
  'R2_PUBLIC_URL',
  'FRONTEND_URL',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_ENDPOINT'
];

try {
  // Read root .env file
  if (!fs.existsSync(rootEnvPath)) {
    console.error('❌ Root .env file not found. Please create it from .env.example');
    process.exit(1);
  }

  const envContent = fs.readFileSync(rootEnvPath, 'utf-8');
  const envVars = {};

  // Parse .env file
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      if (key && value) {
        envVars[key.trim()] = value;
      }
    }
  });

  // Create .dev.vars content with only Workers-needed variables
  let devVarsContent = '# Auto-generated from root .env file\n';
  devVarsContent += '# DO NOT EDIT MANUALLY - Edit root .env instead and run: npm run sync-env\n\n';

  WORKERS_VARS.forEach(varName => {
    if (envVars[varName]) {
      devVarsContent += `${varName}=${envVars[varName]}\n`;
    } else {
      console.warn(`⚠️  Warning: ${varName} not found in root .env`);
    }
  });

  // Write .dev.vars file
  fs.writeFileSync(devVarsPath, devVarsContent);
  console.log('✅ Successfully synced .dev.vars from root .env');
  console.log(`   Variables synced: ${WORKERS_VARS.join(', ')}`);

} catch (error) {
  console.error('❌ Error syncing environment variables:', error.message);
  process.exit(1);
}
