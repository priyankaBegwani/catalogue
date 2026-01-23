# Quick Fix for CDN "NoSuchBucket" Error

## Problem
Getting error: `NoSuchBucket - The specified bucket does not exist` when accessing images via `https://cdn.indiecraft.in`

## Quick Solution: Disable CDN Temporarily

In your backend `.env` file, comment out or remove the CDN URL:

```env
# CLOUDFLARE_CDN_URL=https://cdn.indiecraft.in
CLOUDFLARE_CDN_URL=
```

This will make the app use Wasabi direct URLs instead:
```
https://s3.us-east-1.wasabisys.com/indie-craft-designs/designs/...
```

**After making this change:**
1. Restart your backend server
2. Upload a new design with images
3. Images should now load correctly

## Permanent Solution: Fix Cloudflare CDN Setup

If you want to use CDN (recommended for production), follow these steps:

### Step 1: Verify Cloudflare DNS CNAME

In your Cloudflare dashboard for `indiecraft.in`:

1. Go to **DNS** → **Records**
2. Find or create a CNAME record:
   - **Type**: CNAME
   - **Name**: `cdn`
   - **Target**: `s3.us-east-1.wasabisys.com` (or your Wasabi region endpoint)
   - **Proxy status**: ✅ Proxied (orange cloud icon)
   - **TTL**: Auto

### Step 2: Add Transform Rule in Cloudflare

The CNAME alone won't work because Cloudflare needs to rewrite the path to include the bucket name.

1. Go to **Rules** → **Transform Rules** → **Modify Request Header**
2. Create a new rule:
   - **Rule name**: Wasabi Bucket Path Rewrite
   - **When incoming requests match**: 
     - Field: `Hostname`
     - Operator: `equals`
     - Value: `cdn.indiecraft.in`
   - **Then**: Rewrite URL
     - **Path**: 
       - Type: `Dynamic`
       - Value: `concat("/indie-craft-designs", http.request.uri.path)`

OR use **Page Rules** (older method):

1. Go to **Rules** → **Page Rules**
2. Create rule:
   - **URL**: `cdn.indiecraft.in/*`
   - **Settings**: 
     - Cache Level: Cache Everything
     - Edge Cache TTL: 1 month
     - Browser Cache TTL: 1 hour

### Step 3: Test the Configuration

After setting up Cloudflare:

1. Wait 2-3 minutes for DNS propagation
2. Test this URL in browser:
   ```
   https://cdn.indiecraft.in/indie-craft-designs/designs/test.jpg
   ```
   (Replace with an actual image path from your Wasabi bucket)

3. If it works, uncomment `CLOUDFLARE_CDN_URL` in `.env`
4. Restart backend server

### Alternative: Use Cloudflare R2 Instead

If you prefer Cloudflare R2 over Wasabi:

1. Create R2 bucket in Cloudflare dashboard
2. Update `.env`:
   ```env
   WASABI_ENDPOINT=https://[your-account-id].r2.cloudflarestorage.com
   WASABI_ACCESS_KEY_ID=your_r2_access_key
   WASABI_SECRET_ACCESS_KEY=your_r2_secret_key
   WASABI_BUCKET_NAME=indie-craft-designs
   CLOUDFLARE_CDN_URL=https://cdn.indiecraft.in
   ```
3. Configure R2 custom domain to point to `cdn.indiecraft.in`

## Recommended Immediate Action

**For now, disable CDN** to get images working:

1. In backend `.env`, set:
   ```env
   CLOUDFLARE_CDN_URL=
   ```

2. Restart backend server

3. Re-upload designs (or update existing image URLs in database)

4. Images will load from Wasabi directly

5. Later, properly configure Cloudflare CDN following steps above
