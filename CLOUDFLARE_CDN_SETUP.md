# Cloudflare CDN Setup for Wasabi Storage

## Your Configuration

- **Wasabi Region**: ap-southeast-1
- **Wasabi Endpoint**: `s3.ap-southeast-1.wasabisys.com`
- **Bucket Name**: `ic-catalogue`
- **CDN Domain**: `cdn.indiecraft.in`

## Required .env Configuration

```env
# Storage Type
STORAGE_TYPE=cdn

# Wasabi Configuration
WASABI_ACCESS_KEY_ID=your_access_key
WASABI_SECRET_ACCESS_KEY=your_secret_key
WASABI_BUCKET_NAME=ic-catalogue
WASABI_REGION=ap-southeast-1
WASABI_ENDPOINT=https://s3.ap-southeast-1.wasabisys.com

# Cloudflare CDN
CLOUDFLARE_CDN_URL=https://cdn.indiecraft.in
```

## Cloudflare DNS Configuration

In your Cloudflare dashboard for `indiecraft.in`:

### CNAME Record

**IMPORTANT**: CNAME records cannot include paths. You can only point to the hostname.

- **Type**: CNAME
- **Name**: `cdn`
- **Target**: `s3.ap-southeast-1.wasabisys.com` (NOT `s3.ap-southeast-1.wasabisys.com/ic-catalogue/`)
- **Proxy status**: ✅ Proxied (orange cloud)
- **TTL**: Auto

## How It Works

1. **Upload**: Image is uploaded to Wasabi bucket `ic-catalogue`

2. **URL Generated**: 
   ```
   https://cdn.indiecraft.in/ic-catalogue/designs/ind004/white/1768909120549.jpg
   ```

3. **DNS Resolution**: 
   - Browser requests `cdn.indiecraft.in`
   - Cloudflare CNAME points to `s3.ap-southeast-1.wasabisys.com`
   - Cloudflare proxies the request

4. **Wasabi Receives**:
   ```
   GET /ic-catalogue/designs/ind004/white/1768909120549.jpg
   Host: s3.ap-southeast-1.wasabisys.com
   ```

5. **Wasabi Returns**: Image from bucket `ic-catalogue`

## Wasabi Bucket Configuration

### 1. Bucket Policy (Public Read Access)

In Wasabi console, set this policy for bucket `ic-catalogue`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::ic-catalogue/*"
    }
  ]
}
```

### 2. CORS Configuration

Add CORS policy to allow browser access:

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

## Cloudflare Settings (Optional but Recommended)

### Cache Rules

1. Go to **Caching** → **Configuration**
2. Create a cache rule for `cdn.indiecraft.in/*`:
   - **Cache Level**: Cache Everything
   - **Edge Cache TTL**: 1 month
   - **Browser Cache TTL**: 4 hours

### Security Settings

1. **SSL/TLS**: Full (not Full Strict, as Wasabi uses standard certs)
2. **Always Use HTTPS**: On
3. **Automatic HTTPS Rewrites**: On

## Testing

### Step 1: Test Direct Wasabi Access

First, verify Wasabi works directly:

```
https://s3.ap-southeast-1.wasabisys.com/ic-catalogue/designs/ind004/white/1768909120549.jpg
```

If this doesn't work:
- Check bucket policy allows public read
- Verify the file exists in Wasabi console
- Check bucket name is correct

### Step 2: Test CDN Access

Once direct access works, test via CDN:

```
https://cdn.indiecraft.in/ic-catalogue/designs/ind004/white/1768909120549.jpg
```

If this doesn't work:
- Wait 2-3 minutes for DNS propagation
- Check CNAME record in Cloudflare DNS
- Verify CNAME is proxied (orange cloud)
- Check browser console for errors

### Step 3: Upload New Design

1. Restart backend server
2. Upload a new design with images
3. Check console logs for "Generated public URL"
4. Should see: `https://cdn.indiecraft.in/ic-catalogue/designs/...`
5. Verify image loads on catalogue page

## Troubleshooting

### Error: NoSuchBucket

**Cause**: CNAME is not configured correctly or DNS hasn't propagated

**Solution**:
1. Verify CNAME record points to `s3.ap-southeast-1.wasabisys.com` (no path)
2. Ensure CNAME is proxied (orange cloud)
3. Wait 2-3 minutes for DNS changes
4. Clear browser cache

### Error: 403 Forbidden

**Cause**: Bucket policy doesn't allow public read

**Solution**:
1. Update bucket policy in Wasabi console
2. Ensure policy allows `s3:GetObject` for all principals

### Error: CORS Policy

**Cause**: CORS not configured on Wasabi bucket

**Solution**:
1. Add CORS policy in Wasabi console
2. Allow origins: `*` or your specific domain

### Images Load Directly but Not via CDN

**Cause**: Cloudflare caching or SSL issue

**Solution**:
1. Purge Cloudflare cache
2. Set SSL/TLS to "Full" (not Full Strict)
3. Disable "Rocket Loader" if enabled

## Current Status After Fix

After the code change in `wasabi.js`, URLs will now be generated as:

```
https://cdn.indiecraft.in/ic-catalogue/designs/ind004/white/1768909120549.jpg
```

This matches the format that Cloudflare can proxy to Wasabi correctly.

**Next Steps**:
1. Restart backend server
2. Upload a new design
3. Verify the generated URL includes `/ic-catalogue/` in the path
4. Test if image loads
