/**
 * Backend Configuration
 * 
 * Easy switching between Node.js Express backend and Cloudflare Workers backend
 * 
 * To switch backends:
 * 1. Change BACKEND_TYPE in .env file (or set default below)
 * 2. Set the appropriate BACKEND_URL
 * 
 * Backend Types:
 * - 'node': Express.js backend (default for local development)
 * - 'workers': Cloudflare Workers backend (recommended for production)
 */

export type BackendType = 'node' | 'workers';

interface BackendConfig {
  type: BackendType;
  url: string;
}

// Get backend type from environment or use default
const getBackendType = (): BackendType => {
  const envType = import.meta.env.VITE_BACKEND_TYPE as BackendType;
  return envType || 'node'; // Default to Node.js backend
};

// Get backend URL from environment or use defaults
const getBackendUrl = (type: BackendType): string => {
  // If explicit URL is set, use it
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  // Otherwise use defaults based on type
  switch (type) {
    case 'workers':
      // Default Workers URL (update after deployment)
      return import.meta.env.VITE_WORKERS_URL || 'http://localhost:8787';
    case 'node':
    default:
      // Default Node.js backend URL
      return 'http://localhost:3001';
  }
};

// Create backend configuration
const backendType = getBackendType();
const backendUrl = getBackendUrl(backendType);

export const backendConfig: BackendConfig = {
  type: backendType,
  url: backendUrl,
};

// Export API URL for backward compatibility
export const API_URL = backendConfig.url;

// Helper to check if using Workers backend
export const isWorkersBackend = () => backendConfig.type === 'workers';

// Helper to check if using Node backend
export const isNodeBackend = () => backendConfig.type === 'node';

// Log current backend configuration (only in development)
if (import.meta.env.DEV) {
  console.log('🔧 Backend Configuration:', {
    type: backendConfig.type,
    url: backendConfig.url,
  });
}
