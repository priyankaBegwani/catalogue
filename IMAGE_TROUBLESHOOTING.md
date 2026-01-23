# Image Display Troubleshooting Guide

## Problem
Images are being uploaded to Wasabi bucket successfully, but they're not visible on the design pages.

## Root Cause
The `publicUrl` generated in `backend/src/config/wasabi.js` needs to match your Wasabi configuration.

## Solution Steps

### 1. Check Your Environment Variables

Open your backend `.env` file and verify these settings:

```env
# Storage Configuration
STORAGE_TYPE=cdn

# Wasabi Configuration
WASABI_ACCESS_KEY_ID=your_access_key_here
WASABI_SECRET_ACCESS_KEY=your_secret_key_here
WASABI_BUCKET_NAME=indie-craft-designs
WASABI_REGION=us-east-1
WASABI_ENDPOINT=https://s3.us-east-1.wasabisys.com

# Optional: Cloudflare CDN (leave empty if not using)
CLOUDFLARE_CDN_URL=
```

### 2. Verify Wasabi Bucket Policy

Your bucket must allow public read access. In Wasabi console:

1. Go to your bucket → Policies tab
2. Ensure this policy is set:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::indie-craft-designs/*"
    }
  ]
}
```

### 3. Test Image URL Format

After uploading an image, check the console logs for "Generated public URL". It should be:

**Format 1 (with CDN):**
```
https://your-cdn-domain.com/designs/DESIGN-001/Red/1234567890.jpg
```

**Format 2 (without CDN - using Wasabi direct):**
```
https://s3.us-east-1.wasabisys.com/indie-craft-designs/designs/DESIGN-001/Red/1234567890.jpg
```

### 4. Test Image Accessibility

Copy an image URL from your database and paste it in a browser. If it doesn't load:

**Issue A: 403 Forbidden**
- Your bucket policy is not set correctly
- Solution: Update bucket policy as shown in step 2

**Issue B: 404 Not Found**
- The URL format is incorrect
- Solution: Check your WASABI_ENDPOINT matches your region

**Issue C: CORS Error (in browser console)**
- CORS is not configured on the bucket
- Solution: Add CORS policy in Wasabi console

### 5. CORS Configuration (if needed)

If images load directly but not in the app, add CORS policy in Wasabi:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

### 6. Common Wasabi Endpoints by Region

- **US East 1**: `https://s3.us-east-1.wasabisys.com`
- **US East 2**: `https://s3.us-east-2.wasabisys.com`
- **US West 1**: `https://s3.us-west-1.wasabisys.com`
- **EU Central 1**: `https://s3.eu-central-1.wasabisys.com`
- **AP Northeast 1**: `https://s3.ap-northeast-1.wasabisys.com`

Make sure your `WASABI_ENDPOINT` matches your bucket's region.

### 7. Debugging Checklist

- [ ] `STORAGE_TYPE=cdn` is set in backend `.env`
- [ ] Wasabi credentials are correct
- [ ] `WASABI_ENDPOINT` includes the region (e.g., `us-east-1`)
- [ ] Bucket policy allows public read access
- [ ] Image URLs in database start with correct endpoint
- [ ] Images load when URL is pasted in browser
- [ ] Backend logs show "Generated public URL" with correct format
- [ ] No CORS errors in browser console

### 8. Quick Fix for Existing Images

If you have images already uploaded with wrong URLs in the database, you'll need to either:

**Option A: Re-upload images** (Recommended)
- Delete and re-upload designs after fixing the configuration

**Option B: Update database URLs** (Advanced)
- Run SQL to update existing image_urls in design_colors table
- Replace old URL pattern with new URL pattern

### 9. Restart Backend Server

After changing `.env` variables:
```bash
cd backend
# Stop the server (Ctrl+C)
# Start it again
npm run dev
```

## Testing

1. Upload a new design with images
2. Check backend console for "Generated public URL"
3. Copy the URL and test in browser
4. Check if image appears on catalogue page
5. Open browser DevTools → Network tab to see if images are loading

## Still Not Working?

Check browser console for errors:
- Press F12 → Console tab
- Look for 404, 403, or CORS errors
- Share the error message for further help
