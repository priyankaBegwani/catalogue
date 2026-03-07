# Migration Guide: Wasabi to Cloudflare R2

This guide explains how to migrate from Wasabi S3 storage to Cloudflare R2.

## Why Cloudflare R2?

- **Zero egress fees**: No charges for data transfer out
- **S3-compatible API**: Drop-in replacement for S3/Wasabi
- **Global performance**: Cloudflare's edge network
- **Cost-effective**: Lower storage costs than traditional S3

## Changes Made

### 1. Configuration File Renamed
- **Old**: `backend/src/config/wasabi.js`
- **New**: `backend/src/config/r2.js`

The file has been updated to use Cloudflare R2 endpoints while maintaining backward compatibility.

### 2. Environment Variables

#### New R2 Variables (Required)
```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=indie-craft-designs
R2_PUBLIC_URL=https://pub-your-hash.r2.dev
```

#### Optional Variables
```env
# Custom R2 endpoint (if not using default)
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
```

#### Old Wasabi Variables (Deprecated)
```env
WASABI_ENDPOINT=...
WASABI_REGION=...
WASABI_ACCESS_KEY_ID=...
WASABI_SECRET_ACCESS_KEY=...
WASABI_BUCKET_NAME=...
CLOUDFLARE_CDN_URL=...
```

### 3. Code Changes

All imports have been updated:
- `storage.js`: Updated to import from `r2.js`
- `designs.js`: Updated to import from `r2.js`
- `cart.js`: Updated to import from `r2.js`

Legacy exports are maintained for backward compatibility.

## Setup Instructions

### Step 1: Create Cloudflare R2 Bucket

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2** in the sidebar
3. Click **Create bucket**
4. Name your bucket (e.g., `indie-craft-designs`)
5. Choose a location (or use automatic)

### Step 2: Generate R2 API Tokens

1. In R2 dashboard, go to **Manage R2 API Tokens**
2. Click **Create API token**
3. Give it a name (e.g., "Catalogue App")
4. Set permissions: **Object Read & Write**
5. Select your bucket or allow all buckets
6. Click **Create API Token**
7. **Save the credentials** (you won't see them again):
   - Access Key ID
   - Secret Access Key

### Step 3: Enable Public Access (Optional)

For public image delivery without signed URLs:

1. In your bucket settings, go to **Settings**
2. Enable **Public access** or set up a **Custom Domain**
3. Note your public URL:
   - Default: `https://pub-<hash>.r2.dev`
   - Custom: `https://cdn.yourdomain.com`

### Step 4: Update Environment Variables

Update your `.env` file:

```env
# Storage type
STORAGE_TYPE=cdn

# R2 Configuration
R2_ACCOUNT_ID=your_account_id_from_cloudflare
R2_ACCESS_KEY_ID=your_access_key_from_step_2
R2_SECRET_ACCESS_KEY=your_secret_key_from_step_2
R2_BUCKET_NAME=indie-craft-designs
R2_PUBLIC_URL=https://pub-your-hash.r2.dev
```

### Step 5: Migrate Existing Images (Optional)

If you have existing images in Wasabi, you can migrate them:

#### Option A: Using rclone
```bash
# Install rclone
# Configure Wasabi source
rclone config

# Configure R2 destination
rclone config

# Sync data
rclone sync wasabi:indie-craft-designs r2:indie-craft-designs
```

#### Option B: Using AWS CLI
```bash
# Configure Wasabi
aws configure --profile wasabi
# Set endpoint: https://s3.wasabisys.com

# Configure R2
aws configure --profile r2
# Set endpoint: https://<account-id>.r2.cloudflarestorage.com

# Sync
aws s3 sync s3://indie-craft-designs s3://indie-craft-designs \
  --profile wasabi \
  --endpoint-url https://s3.wasabisys.com \
  --source-region us-east-1 | \
aws s3 cp - s3://indie-craft-designs \
  --profile r2 \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com
```

### Step 6: Update Database URLs (If Needed)

If your database contains full Wasabi URLs, you may need to update them:

```sql
-- Example: Update design color image URLs
UPDATE design_colors
SET image_urls = REPLACE(
  image_urls::text,
  'https://s3.wasabisys.com/indie-craft-designs',
  'https://pub-your-hash.r2.dev'
)::jsonb
WHERE image_urls::text LIKE '%wasabisys%';

-- Example: Update WhatsApp image URLs
UPDATE designs
SET whatsapp_image_url = REPLACE(
  whatsapp_image_url,
  'https://s3.wasabisys.com/indie-craft-designs',
  'https://pub-your-hash.r2.dev'
)
WHERE whatsapp_image_url LIKE '%wasabisys%';
```

### Step 7: Test the Migration

1. Restart your backend server
2. Try uploading a new design image
3. Verify the image is stored in R2
4. Check that images load correctly in the frontend

## Key Differences: Wasabi vs R2

| Feature | Wasabi | Cloudflare R2 |
|---------|--------|---------------|
| Endpoint | `s3.wasabisys.com` | `<account-id>.r2.cloudflarestorage.com` |
| Region | Specific (e.g., `us-east-1`) | `auto` |
| ACL Support | Yes (`public-read`) | No (use public buckets) |
| Public URLs | Via CDN or direct | `pub-<hash>.r2.dev` or custom domain |
| Egress Fees | Yes | **No** |

## Troubleshooting

### Images not loading
- Check `R2_PUBLIC_URL` is set correctly
- Verify bucket has public access enabled
- Check browser console for CORS errors

### Upload failing
- Verify R2 credentials are correct
- Check `R2_ACCOUNT_ID` matches your Cloudflare account
- Ensure API token has write permissions

### CORS Issues
Configure CORS in R2 bucket settings:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

## Rollback Plan

If you need to rollback to Wasabi:

1. Keep your old `.env` with Wasabi credentials
2. Rename `r2.js` back to `wasabi.js`
3. Update imports in `storage.js`, `designs.js`, `cart.js`
4. Set `STORAGE_TYPE=cdn` with Wasabi credentials

Or simply use the legacy exports that maintain backward compatibility.

## Cost Comparison

**Wasabi**: ~$6/TB/month + egress fees
**Cloudflare R2**: ~$15/TB/month + **$0 egress**

For applications with high traffic, R2 is typically more cost-effective due to zero egress fees.

## Support

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 API Reference](https://developers.cloudflare.com/r2/api/s3/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
