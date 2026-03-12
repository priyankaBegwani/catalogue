# Unified Environment Configuration

This project uses a **single `.env` file** at the root level that is shared across all three components:
- **Backend** (Node.js Express)
- **Workers** (Cloudflare Workers)
- **Frontend** (React + Vite)

## Quick Setup

### 1. Create Root `.env` File

```bash
# From project root
cp .env.example .env
```

### 2. Edit `.env` with Your Values

The `.env` file is already pre-configured with your Supabase and R2 credentials. Just verify:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://kzrhxfjbrbcnzmnthvwz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_SUPABASE_SERVICE_KEY=eyJhbGc...

# Backend Type (for frontend)
VITE_BACKEND_TYPE=workers  # or 'node'

# R2 Storage
R2_BUCKET_NAME=ic-designs
R2_PUBLIC_URL=https://cdn.indiecraft.in
```

### 3. Start Your Services

**Option A: Using Workers Backend (Recommended)**

```bash
# Terminal 1 - Workers Backend
cd workers
npm install
npm run dev  # Automatically syncs .env before starting

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

**Option B: Using Node.js Backend**

```bash
# Terminal 1 - Node.js Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

## How It Works

### Backend (Node.js)
- Loads `.env` from root using `dotenv.config({ path: '../../.env' })`
- Location: `backend/src/config.js`

### Workers (Cloudflare)
- Automatically syncs root `.env` to `workers/.dev.vars` before starting
- Script: `workers/scripts/load-env.js`
- Runs via `predev` hook in `package.json`

### Frontend (Vite)
- Configured to load `.env` from root directory
- Location: `frontend/vite.config.ts`
- Uses `envDir: path.resolve(__dirname, '..')`

## Environment Variables Reference

| Variable | Used By | Description |
|----------|---------|-------------|
| `VITE_SUPABASE_URL` | All | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | All | Supabase anonymous key |
| `VITE_SUPABASE_SERVICE_KEY` | Backend, Workers | Supabase service role key |
| `VITE_BACKEND_TYPE` | Frontend | Backend type: `node` or `workers` |
| `PORT` | Backend | Node.js server port (default: 3001) |
| `VITE_BACKEND_URL` | Frontend | Node.js backend URL |
| `VITE_WORKERS_URL` | Frontend | Workers backend URL |
| `FRONTEND_URL` | Backend, Workers | Frontend URL for CORS |
| `R2_ACCOUNT_ID` | Backend | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Backend | R2 access key |
| `R2_SECRET_ACCESS_KEY` | Backend | R2 secret key |
| `R2_BUCKET_NAME` | Backend | R2 bucket name |
| `R2_PUBLIC_URL` | Backend, Workers | R2 public CDN URL |
| `JWT_SECRET` | Backend | JWT signing secret |
| `VITE_TAWKTO_PROPERTY_ID` | Frontend | Tawk.to property ID |
| `VITE_TAWKTO_WIDGET_ID` | Frontend | Tawk.to widget ID |

## Switching Between Backends

Simply change `VITE_BACKEND_TYPE` in the root `.env`:

```env
# Use Cloudflare Workers
VITE_BACKEND_TYPE=workers

# Use Node.js Express
VITE_BACKEND_TYPE=node
```

Then restart the frontend dev server.

## File Structure

```
catalogue/
├── .env                    # ← Single source of truth
├── .env.example           # ← Template with all variables
├── ENV_SETUP.md           # ← This file
│
├── backend/
│   ├── src/
│   │   └── config.js      # Loads from root .env
│   └── .env.example       # ⚠️  DEPRECATED - Use root .env
│
├── workers/
│   ├── scripts/
│   │   └── load-env.js    # Syncs root .env → .dev.vars
│   ├── .dev.vars          # Auto-generated (gitignored)
│   └── package.json       # predev hook runs sync
│
└── frontend/
    ├── vite.config.ts     # Configured for root .env
    └── .env.example       # ⚠️  DEPRECATED - Use root .env
```

## Important Notes

### ✅ DO
- Edit only the **root `.env`** file
- Run `npm run sync-env` in workers folder if you manually edit `.env`
- Keep `.env` in `.gitignore` (it's already configured)

### ❌ DON'T
- Don't create `.env` files in `backend/`, `workers/`, or `frontend/` folders
- Don't edit `workers/.dev.vars` manually (it's auto-generated)
- Don't commit `.env` to git

## Troubleshooting

### Workers not picking up .env changes

```bash
cd workers
npm run sync-env
npm run dev
```

### Frontend not loading environment variables

1. Check that `frontend/vite.config.ts` has `envDir` configured
2. Restart the Vite dev server
3. Verify variables start with `VITE_` prefix

### Backend can't find .env

1. Verify `.env` exists in project root
2. Check `backend/src/config.js` has correct path: `../../.env`
3. Restart the backend server

## Migration from Old Setup

If you had separate `.env` files in each folder:

1. **Backup** your existing `.env` files
2. **Copy** all values to the root `.env`
3. **Delete** the old `.env` files from subfolders
4. **Restart** all services

## Production Deployment

### Backend (Node.js)
Set environment variables on your hosting platform or use the root `.env` file.

### Workers (Cloudflare)
Set secrets via Wrangler CLI:
```bash
wrangler secret put VITE_SUPABASE_SERVICE_KEY
wrangler secret put R2_PUBLIC_URL
```

### Frontend (Vite)
Build with environment variables:
```bash
VITE_BACKEND_TYPE=workers npm run build
```

Or set them in your CI/CD pipeline.
