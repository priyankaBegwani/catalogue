# Image Storage Configuration

This application supports three image storage methods that can be toggled via a configuration flag:

1. **Local Storage** - Files stored on server filesystem (development/testing)
2. **Supabase Storage** - Cloud storage via Supabase (fallback/production)
3. **CDN Storage** (Wasabi + Cloudflare CDN) - High-performance CDN (production)

## Configuration

### Environment Variable

Add the following to your `.env` file:

```env
# Image Storage Configuration
# Options: 'local', 'supabase', or 'cdn'
STORAGE_TYPE=local
```

### Storage Options

#### Option 1: CDN Storage (Wasabi + Cloudflare)

**When to use:** When your CDN is properly configured and working

**Required Environment Variables:**
```env
STORAGE_TYPE=cdn
WASABI_ENDPOINT=https://s3.wasabisys.com
WASABI_REGION=us-east-1
WASABI_ACCESS_KEY_ID=your_access_key
WASABI_SECRET_ACCESS_KEY=your_secret_key
WASABI_BUCKET_NAME=indie-craft-designs
CLOUDFLARE_CDN_URL=https://your-cdn-url.com
```

**Pros:**
- Fast global content delivery via CDN
- Lower latency for users worldwide
- Separate storage from database

**Cons:**
- Requires additional service setup
- May have costs associated with CDN usage

#### Option 2: Local Storage (Filesystem)

**When to use:** Development, testing, or when you don't want external dependencies

**Required Environment Variables:**
```env
STORAGE_TYPE=local
VITE_BACKEND_URL=http://localhost:3001
```

**Setup:**
- No additional setup required!
- Files are automatically stored in `backend/uploads/` directory
- Directory structure is created automatically
- Images served via Express static middleware

**Pros:**
- Zero external dependencies
- No service configuration needed
- Perfect for development and testing
- Mimics CDN behavior with local URLs
- Fast for local development
- No costs

**Cons:**
- Not suitable for production with multiple servers
- Files stored on server disk (not scalable)
- No CDN benefits
- Files lost if server is reset (unless persisted)

**File Location:**
```
backend/uploads/
  └── designs/
      └── {design_no}/
          └── {color_name}/
              └── {timestamp}.{ext}
```

**URL Format:**
```
http://localhost:3001/uploads/designs/IND-001/Red/1699876543210.jpg
```

#### Option 3: Supabase Storage

**When to use:** When CDN is not working or during development

**Required Environment Variables:**
```env
STORAGE_TYPE=supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_SERVICE_KEY=your_service_key
```

**Required Setup:**
1. Create a storage bucket named `design-images` in your Supabase project
2. Set the bucket to public or configure appropriate policies
3. Ensure your service key has storage permissions

**Pros:**
- Integrated with existing Supabase setup
- No additional service configuration needed
- Simpler for development

**Cons:**
- May have slower delivery compared to CDN
- Storage limits based on Supabase plan

## Supabase Storage Bucket Setup

### Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** section
3. Click **New Bucket**
4. Name it: `design-images`
5. Set as **Public bucket** (or configure policies)

### Step 2: Configure Storage Policies (if not public)

If you didn't make the bucket public, add these policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'design-images');

-- Allow public read access
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'design-images');

-- Allow authenticated users to delete
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'design-images');
```

## How It Works

### Upload Flow

1. **Frontend** requests upload URL from backend
2. **Backend** checks `USE_CDN` flag:
   - If `true`: Generates Wasabi signed URL
   - If `false`: Generates Supabase signed URL
3. **Frontend** uploads file directly to the storage service
4. **Backend** returns public URL for the uploaded file

### File Organization

Files are organized in the following structure:
```
designs/
  ├── {design_no}/
  │   ├── {color_name}/
  │   │   ├── {timestamp}.jpg
  │   │   ├── {timestamp}.png
  │   │   └── ...
```

Example: `designs/IND-001/Red/1699876543210.jpg`

## Switching Between Storage Methods

### Quick Start (Development):

Use local storage - no setup needed!
```env
STORAGE_TYPE=local
```

### To Switch to Local Storage:

1. Update `.env` file:
   ```env
   STORAGE_TYPE=local
   ```
2. Restart your backend server
3. All new uploads will be stored in `backend/uploads/`

### To Switch to Supabase Storage:

1. Ensure Supabase bucket is created
2. Update `.env` file:
   ```env
   STORAGE_TYPE=supabase
   ```
3. Restart your backend server
4. All new uploads will use Supabase Storage

### To Switch to CDN Storage:

1. Ensure CDN credentials are configured in `.env`
2. Update `.env` file:
   ```env
   STORAGE_TYPE=cdn
   ```
3. Restart your backend server
4. All new uploads will use CDN

**Note:** Existing images will remain in their original storage location. Only new uploads will use the configured method.

## Troubleshooting

### Images Not Displaying

1. **Check storage type in console:**
   - Open browser console when uploading
   - Look for: `"Uploading to cdn storage"` or `"Uploading to supabase storage"`

2. **Verify environment variables:**
   ```bash
   # In backend directory
   node -e "console.log(require('dotenv').config())"
   ```

3. **Check Supabase bucket:**
   - Ensure bucket exists and is named `design-images`
   - Verify bucket is public or has correct policies
   - Check if files are actually uploaded in Supabase dashboard

4. **Check CDN configuration:**
   - Verify Wasabi credentials are correct
   - Test CDN URL is accessible
   - Check bucket permissions

### Upload Failures

1. **Supabase Storage:**
   - Check service key has storage permissions
   - Verify bucket policies allow uploads
   - Check file size limits (default 50MB)

2. **CDN Storage:**
   - Verify Wasabi credentials
   - Check bucket exists
   - Ensure CORS is configured on Wasabi bucket

## Development vs Production

### Development
```env
STORAGE_TYPE=local  # Use local storage for simplicity (recommended)
# OR
STORAGE_TYPE=supabase  # Use Supabase if testing cloud storage
```

### Production
```env
STORAGE_TYPE=cdn   # Use CDN for best performance (recommended)
# OR
STORAGE_TYPE=supabase  # Use Supabase as fallback if CDN issues
```

**Recommendation:**
- **Local Development:** `STORAGE_TYPE=local` (fastest, no setup)
- **Staging/Testing:** `STORAGE_TYPE=supabase` (cloud testing)
- **Production:** `STORAGE_TYPE=cdn` (best performance)

## Migration Guide

If you need to migrate existing images from one storage to another:

1. Export image URLs from database
2. Download images from current storage
3. Switch storage configuration
4. Re-upload images using new storage
5. Update database URLs

*Note: An automated migration script can be created if needed.*
