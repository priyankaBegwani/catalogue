# Backend Configuration Guide

This frontend application supports two backend options:

1. **Node.js Express Backend** (`backend/`) - Traditional server
2. **Cloudflare Workers Backend** (`workers/`) - Edge-deployed serverless

## Quick Start

### Option 1: Use Cloudflare Workers (Recommended for Production)

1. **Create `.env` file in `frontend/` directory:**

```env
# Backend Configuration
VITE_BACKEND_TYPE=workers
VITE_WORKERS_URL=https://your-worker.your-subdomain.workers.dev

# OR use explicit URL
# VITE_BACKEND_URL=https://your-worker.your-subdomain.workers.dev

# Supabase Configuration
VITE_SUPABASE_URL=https://kzrhxfjbrbcnzmnthvwz.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

2. **Deploy the Workers backend:**

```bash
cd workers
npm install
npm run deploy
```

3. **Update the Workers URL in `.env` with your deployed URL**

4. **Start the frontend:**

```bash
cd frontend
npm run dev
```

### Option 2: Use Node.js Backend (Local Development)

1. **Create `.env` file in `frontend/` directory:**

```env
# Backend Configuration
VITE_BACKEND_TYPE=node
# VITE_BACKEND_URL=http://localhost:3001  # Optional, this is the default

# Supabase Configuration
VITE_SUPABASE_URL=https://kzrhxfjbrbcnzmnthvwz.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

2. **Start the Node.js backend:**

```bash
cd backend
npm install
npm run dev
```

3. **Start the frontend:**

```bash
cd frontend
npm run dev
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_BACKEND_TYPE` | Backend type: `node` or `workers` | `workers` |
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGc...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_BACKEND_URL` | Explicit backend URL (overrides type-based defaults) | - |
| `VITE_WORKERS_URL` | Workers backend URL | `http://localhost:8787` |

## Configuration File

The backend configuration is managed in `src/config/backend.ts`:

```typescript
// Automatically selects backend based on VITE_BACKEND_TYPE
import { API_URL, backendConfig, isWorkersBackend } from '@/config/backend';

// Use API_URL in your API calls
fetch(`${API_URL}/api/designs`);

// Check which backend is active
if (isWorkersBackend()) {
  console.log('Using Cloudflare Workers backend');
}
```

## Switching Backends

### During Development

Simply change `VITE_BACKEND_TYPE` in your `.env` file and restart the dev server:

```env
# Switch to Workers
VITE_BACKEND_TYPE=workers

# Switch to Node.js
VITE_BACKEND_TYPE=node
```

### For Production Build

Set the environment variable before building:

```bash
# Build for Workers backend
VITE_BACKEND_TYPE=workers npm run build

# Build for Node.js backend
VITE_BACKEND_TYPE=node npm run build
```

## Backend URLs

### Development

- **Node.js Backend**: `http://localhost:3001`
- **Workers Backend**: `http://localhost:8787`

### Production

- **Node.js Backend**: Your deployed server URL
- **Workers Backend**: `https://your-worker.your-subdomain.workers.dev`

## Troubleshooting

### Backend not responding

1. Check that the backend is running:
   - Node.js: `cd backend && npm run dev`
   - Workers: `cd workers && npm run dev`

2. Verify the URL in `.env` matches your backend

3. Check browser console for configuration logs (development mode only)

### CORS errors

Both backends have CORS enabled. If you encounter CORS errors:

1. Ensure the backend is running
2. Check that `VITE_BACKEND_URL` is correct
3. For Workers, verify CORS settings in `workers/src/index.js`

### API endpoints not found

Both backends implement the same API routes. If endpoints are missing:

1. Verify you're using the latest version of both backends
2. Check the backend logs for errors
3. Ensure all routes are properly mounted

## API Compatibility

Both backends implement identical API endpoints:

- `/api/auth/*` - Authentication
- `/api/users/*` - User management
- `/api/designs/*` - Design catalog
- `/api/cart/*` - Shopping cart
- `/api/wishlist/*` - Wishlist
- `/api/orders/*` - Order management
- `/api/parties/*` - Party management
- `/api/transport/*` - Transport options
- `/api/locations/*` - Locations
- `/api/admin/*` - Admin operations
- `/api/brands/*` - Brand management
- `/api/storage/*` - File uploads

## Performance Comparison

| Feature | Node.js Backend | Workers Backend |
|---------|----------------|-----------------|
| Cold Start | ~1-2s | <10ms |
| Global Distribution | Single region | 300+ locations |
| Scaling | Manual/Auto (server) | Automatic (edge) |
| Cost | Server costs | Pay-per-request |
| Deployment | Traditional hosting | Cloudflare Workers |

## Recommendations

- **Local Development**: Use Node.js backend for easier debugging
- **Production**: Use Cloudflare Workers for better performance and global reach
- **Testing**: Test with both backends before production deployment
