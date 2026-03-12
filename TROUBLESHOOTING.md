# Troubleshooting Guide

## Categories/Styles Not Loading in Add Design Page

### Symptoms
- Category, Style, Fabric Type, or Brand dropdowns are empty
- Console shows `Failed to load categories` or similar errors
- API calls return `ERR_CONNECTION_REFUSED`

### Solution Steps

#### 1. Check Backend Configuration

**Verify your `.env` file:**
```bash
# Open root .env file
cat .env

# Should show:
VITE_BACKEND_TYPE=workers
VITE_WORKERS_URL=http://localhost:8787
```

**If using Workers backend, ensure it's NOT set to Node.js URL:**
```env
# ❌ WRONG - This will try to connect to Node.js
VITE_BACKEND_URL=http://localhost:3001

# ✅ CORRECT - Comment it out or set to Workers URL
# VITE_BACKEND_URL=http://localhost:3001
VITE_BACKEND_URL=http://localhost:8787
```

#### 2. Start the Workers Backend

```bash
cd workers
npm run dev
```

**Expected output:**
```
✅ Successfully synced .dev.vars from root .env
⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

**If you see errors:**
- `EPERM` error: Close other terminal windows and try again
- `sync-env` fails: Check that root `.env` file exists
- Port already in use: Kill the process using port 8787

#### 3. Verify Workers is Running

Open browser and navigate to:
```
http://localhost:8787/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-08T00:49:00.000Z"
}
```

#### 4. Test API Endpoints Directly

**Test categories endpoint:**
```bash
curl http://localhost:8787/api/designs/categories
```

**Expected response:**
```json
[
  {
    "id": "uuid",
    "name": "Category Name",
    "slug": "category-slug",
    ...
  }
]
```

**If you get an error:**
- Check `.dev.vars` file exists in `workers/` folder
- Run `npm run sync-env` in workers folder
- Verify Supabase credentials in root `.env`

#### 5. Check Frontend Configuration

**Open browser console (F12) when loading Add Design page:**

You should see:
```
🔧 Backend Configuration: { type: 'workers', url: 'http://localhost:8787' }
Loading categories...
Categories loaded: [...]
Loading fabric types...
Fabric types loaded: [...]
Loading brands...
Brands loaded: [...]
```

**If you see wrong URL:**
- Check root `.env` file
- Restart frontend dev server: `npm run dev`
- Clear browser cache

#### 6. Common Issues

**Issue: `ERR_CONNECTION_REFUSED`**
- **Cause:** Workers backend not running
- **Solution:** Start workers with `cd workers && npm run dev`

**Issue: Empty arrays returned `[]`**
- **Cause:** No data in Supabase tables
- **Solution:** Add categories/styles/fabric types in Supabase dashboard

**Issue: `401 Unauthorized` or `403 Forbidden`**
- **Cause:** Authentication issues
- **Solution:** These endpoints use `optionalAuth`, should work without login. Check Workers logs.

**Issue: CORS errors**
- **Cause:** CORS not properly configured
- **Solution:** Already fixed in Workers `src/index.js` with proper CORS headers

**Issue: `Failed to fetch`**
- **Cause:** Network error or wrong URL
- **Solution:** 
  1. Check browser console for actual URL being called
  2. Verify it matches Workers URL (`:8787`)
  3. Test URL directly in browser

## Quick Diagnostic Commands

```bash
# 1. Check if Workers is running
curl http://localhost:8787/health

# 2. Check categories endpoint
curl http://localhost:8787/api/designs/categories

# 3. Check styles endpoint
curl http://localhost:8787/api/designs/styles

# 4. Check fabric types endpoint
curl http://localhost:8787/api/designs/fabric-types

# 5. Check brands endpoint
curl http://localhost:8787/api/brands

# 6. View Workers logs
cd workers
npm run tail
```

## Environment Variable Checklist

Root `.env` file should have:
```env
✅ VITE_SUPABASE_URL=https://...
✅ VITE_SUPABASE_ANON_KEY=eyJ...
✅ VITE_SUPABASE_SERVICE_KEY=eyJ...
✅ VITE_BACKEND_TYPE=workers
✅ VITE_WORKERS_URL=http://localhost:8787
❌ VITE_BACKEND_URL (should be commented out or set to :8787)
```

## Still Not Working?

1. **Restart everything:**
   ```bash
   # Stop all servers (Ctrl+C)
   
   # Start Workers
   cd workers
   npm run dev
   
   # In new terminal, start Frontend
   cd frontend
   npm run dev
   ```

2. **Check browser console for detailed errors**

3. **Verify Supabase connection:**
   - Login to Supabase dashboard
   - Check if tables exist: `design_categories`, `design_styles`, `fabric_types`, `brands`
   - Verify data exists in these tables

4. **Check Workers .dev.vars:**
   ```bash
   cat workers/.dev.vars
   ```
   Should contain synced values from root `.env`

5. **Manual sync if needed:**
   ```bash
   cd workers
   npm run sync-env
   npm run dev
   ```
