# Wasabi + Cloudflare CDN Storage Setup

This application uses Wasabi S3-compatible storage with Cloudflare CDN for storing and delivering design images.

## Prerequisites

1. **Wasabi Account**: Sign up at [wasabi.com](https://wasabi.com)
2. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com) (optional but recommended)

## Setup Instructions

### 1. Create Wasabi Bucket

1. Log in to your Wasabi console
2. Navigate to **Buckets** and click **Create Bucket**
3. Configure the bucket:
   - **Bucket Name**: `indie-craft-designs` (or your preferred name)
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
   - **Bucket Versioning**: Disabled
   - **Bucket Logging**: Optional
4. Click **Create Bucket**

### 2. Set Bucket Policy (Public Read)

To allow public read access to images via CDN:

1. Select your bucket
2. Go to **Policies** tab
3. Add this policy (replace `indie-craft-designs` with your bucket name):

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

### 3. Create Wasabi Access Keys

1. Go to **Access Keys** in Wasabi console
2. Click **Create New Access Key**
3. Note down:
   - **Access Key ID**
   - **Secret Access Key**
4. Update your `.env` file:

```env
WASABI_ACCESS_KEY_ID=your_access_key_id_here
WASABI_SECRET_ACCESS_KEY=your_secret_access_key_here
WASABI_BUCKET_NAME=indie-craft-designs
WASABI_REGION=us-east-1
WASABI_ENDPOINT=https://s3.us-east-1.wasabisys.com
```

### 4. Configure Cloudflare CDN (Optional but Recommended)

Using Cloudflare CDN provides:
- Faster global delivery
- DDoS protection
- SSL/TLS encryption
- Caching and bandwidth savings

#### Option A: Using Cloudflare with Custom Domain

1. Add a CNAME record in Cloudflare DNS:
   - **Type**: CNAME
   - **Name**: `cdn` (or your preferred subdomain)
   - **Target**: `s3.us-east-1.wasabisys.com`
   - **Proxy status**: Proxied (orange cloud)

2. Enable these Cloudflare settings:
   - **SSL/TLS**: Full
   - **Cache Level**: Standard
   - **Browser Cache TTL**: 1 hour or more

3. Update your `.env`:

```env
CLOUDFLARE_CDN_URL=https://cdn.yourdomain.com
```

#### Option B: Using Cloudflare R2 (Alternative)

If you prefer Cloudflare R2 instead of Wasabi:

1. Create an R2 bucket in Cloudflare
2. Generate R2 API tokens
3. Update `.env` with R2 credentials:

```env
WASABI_ENDPOINT=https://[account-id].r2.cloudflarestorage.com
WASABI_ACCESS_KEY_ID=your_r2_access_key
WASABI_SECRET_ACCESS_KEY=your_r2_secret_key
WASABI_BUCKET_NAME=indie-craft-designs
```

### 5. CORS Configuration

If you need to enable CORS for direct browser uploads, add this to your Wasabi bucket:

```json
[
  {
    "AllowedOrigins": ["https://yourdomain.com"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

## Image Upload Flow

1. Admin selects images in the design form
2. Frontend requests pre-signed upload URLs from backend
3. Backend generates signed URLs using Wasabi credentials
4. Frontend uploads images directly to Wasabi using signed URLs
5. Backend saves the public URL (CDN URL if configured) to database
6. Images are served via Cloudflare CDN for optimal performance

## URL Structure

- **Without CDN**: `https://s3.us-east-1.wasabisys.com/indie-craft-designs/designs/IND-001/Navy-Blue/1234567890.jpg`
- **With CDN**: `https://cdn.yourdomain.com/designs/IND-001/Navy-Blue/1234567890.jpg`

## Cost Optimization

### Wasabi Pricing
- Storage: ~$5.99/TB/month
- No egress fees (major cost savings vs AWS S3)
- Minimum storage duration: 90 days

### Cloudflare Pricing
- Free tier: Unlimited bandwidth
- Pro plan: $20/month for additional features

## Security Best Practices

1. **Never expose Wasabi credentials in frontend code**
2. Use pre-signed URLs with expiration (default: 1 hour)
3. Implement proper authentication on upload endpoints
4. Use HTTPS for all image URLs
5. Regular key rotation (quarterly recommended)
6. Enable Cloudflare DDoS protection
7. Set appropriate bucket policies (public read only)

## Monitoring

- **Wasabi Console**: Monitor storage usage and bandwidth
- **Cloudflare Analytics**: Track CDN performance and cache hit rates
- **Application Logs**: Monitor upload success/failure rates

## Troubleshooting

### Upload Fails

- Check Wasabi credentials in `.env`
- Verify bucket exists and is accessible
- Check CORS configuration if uploading from browser
- Ensure signed URL hasn't expired

### Images Not Loading

- Verify bucket policy allows public read
- Check CLOUDFLARE_CDN_URL is correct
- Test direct Wasabi URL first, then CDN URL
- Clear Cloudflare cache if recently uploaded

### Slow Image Loading

- Enable Cloudflare CDN
- Increase cache TTL
- Use image optimization (WebP format)
- Enable Cloudflare Polish for automatic optimization
