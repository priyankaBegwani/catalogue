# Local Storage Setup Guide

## Quick Setup

Local storage is the easiest option for development - it requires minimal setup!

### Step 1: Install Dependencies

The local storage feature requires `multer` for handling file uploads:

```bash
cd backend
npm install multer
```

### Step 2: Configure Environment

Update your `.env` file:

```env
STORAGE_TYPE=local
VITE_BACKEND_URL=http://localhost:3001
```

### Step 3: Restart Server

```bash
cd backend
npm run dev
```

That's it! Your images will now be stored locally in `backend/uploads/`.

## How It Works

1. **Upload Flow:**
   - Frontend requests upload URL from backend
   - Backend returns local upload endpoint
   - Frontend uploads file using FormData
   - Backend saves file to `backend/uploads/designs/{design_no}/{color_name}/{timestamp}.{ext}`
   - Backend returns public URL: `http://localhost:3001/uploads/designs/...`

2. **File Serving:**
   - Express serves files statically from `/uploads` route
   - Images accessible at: `http://localhost:3001/uploads/designs/...`

3. **File Structure:**
   ```
   backend/
   └── uploads/
       └── designs/
           └── IND-001/
               └── Red/
                   ├── 1699876543210.jpg
                   └── 1699876543211.jpg
   ```

## Benefits

✅ **Zero Configuration** - No external services needed  
✅ **Fast Development** - Instant file access  
✅ **No Costs** - Completely free  
✅ **Easy Debugging** - Files visible in filesystem  
✅ **Mimics CDN** - Same URL pattern as production  

## Limitations

⚠️ **Not for Production** - Files stored on single server  
⚠️ **Not Scalable** - Doesn't work with multiple servers  
⚠️ **No Backup** - Files can be lost if server resets  
⚠️ **No CDN Benefits** - No global distribution  

## Switching to Cloud Storage

When you're ready to deploy:

1. **For Production:**
   ```env
   STORAGE_TYPE=cdn
   ```
   Configure Wasabi/Cloudflare credentials

2. **For Staging:**
   ```env
   STORAGE_TYPE=supabase
   ```
   Create Supabase bucket

All new uploads will use the new storage automatically!

## Troubleshooting

### Images Not Loading

1. Check if files exist:
   ```bash
   ls backend/uploads/designs/
   ```

2. Verify server is serving static files:
   - Look for: `Serving static files from: ...` in console

3. Check image URL format:
   - Should be: `http://localhost:3001/uploads/designs/...`

### Permission Errors

If you get permission errors creating directories:

```bash
cd backend
mkdir uploads
chmod 755 uploads
```

### Port Conflicts

If port 3001 is in use, update `.env`:

```env
PORT=3002
VITE_BACKEND_URL=http://localhost:3002
```

## File Management

### Viewing Uploaded Files

```bash
cd backend/uploads/designs
ls -R
```

### Clearing Old Files

```bash
# Delete all uploads
rm -rf backend/uploads/designs/*

# Delete specific design
rm -rf backend/uploads/designs/IND-001
```

### Backup Files

```bash
# Create backup
tar -czf uploads-backup.tar.gz backend/uploads/

# Restore backup
tar -xzf uploads-backup.tar.gz
```

## Production Deployment

⚠️ **Important:** Do not use local storage in production!

If you must use filesystem storage in production:

1. Use a persistent volume/disk
2. Set up regular backups
3. Use a CDN in front of your server
4. Consider using NFS for multi-server setups

**Better alternatives:**
- Use `STORAGE_TYPE=cdn` with Wasabi/Cloudflare
- Use `STORAGE_TYPE=supabase` for managed cloud storage
