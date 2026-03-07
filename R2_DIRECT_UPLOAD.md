# R2 Direct Upload Architecture

## Overview

The application now uses a **backend-proxied upload** approach instead of presigned URLs. All file operations go through the backend API, which directly interacts with Cloudflare R2.

---

## Architecture Changes

### **Old Flow (Presigned URLs)**
```
Frontend → Backend (get presigned URL) → Frontend uploads directly to R2
```

### **New Flow (Backend Proxy)**
```
Frontend → Backend (uploads file) → Backend uploads to R2 → Returns public URL
```

---

## Benefits

✅ **Better Security** - R2 credentials never exposed to frontend  
✅ **Simpler Frontend** - No need to handle S3 presigned URL logic  
✅ **Better Control** - Backend validates files before upload  
✅ **Public CDN** - Uses R2 public URL with custom domain  
✅ **No Signing** - Public bucket means no signed URLs needed  

---

## API Endpoints

### **1. Upload Image**

**Endpoint:** `POST /api/storage/upload`

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data
```

**Body (FormData):**
```javascript
{
  file: <File>,           // The image file
  designNo: "IND-001",    // Design number
  colorName: "Red"        // Color name
}
```

**Response:**
```json
{
  "publicUrl": "https://cdn.yourdomain.com/designs/IND-001/Red/1234567890.jpg",
  "key": "designs/IND-001/Red/1234567890.jpg",
  "storageType": "cdn",
  "message": "File uploaded successfully"
}
```

---

### **2. Delete Image**

**Endpoint:** `POST /api/storage/delete`

**Body:**
```json
{
  "imageUrl": "https://cdn.yourdomain.com/designs/IND-001/Red/1234567890.jpg"
}
```

**Response:**
```json
{
  "message": "Image deleted successfully"
}
```

---

### **3. Get Public URL**

**Endpoint:** `POST /api/storage/signed-url`

**Body:**
```json
{
  "imageUrl": "https://cdn.yourdomain.com/designs/IND-001/Red/1234567890.jpg"
}
```

**Response:**
```json
{
  "signedUrl": "https://cdn.yourdomain.com/designs/IND-001/Red/1234567890.jpg"
}
```

*Note: For R2 with public bucket, this returns the same public URL (no signing needed)*

---

## Backend Implementation

### **r2.js Functions**

```javascript
// Direct upload to R2
uploadToR2(buffer, key, contentType)
  → Returns: { publicUrl, key }

// Delete from R2
deleteFromR2(key)
  → Returns: void

// Get public URL (no signing)
getPublicUrl(key)
  → Returns: publicUrl string
```

---

## Frontend Usage

### **Upload Example**

```javascript
// Create FormData
const formData = new FormData();
formData.append('file', imageFile);
formData.append('designNo', 'IND-001');
formData.append('colorName', 'Red');

// Upload to backend
const response = await fetch('/api/storage/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const { publicUrl } = await response.json();
// Use publicUrl in your application
```

---

## Configuration

### **Environment Variables**

```env
# Storage Type
STORAGE_TYPE=cdn

# R2 Configuration
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=indie-craft-designs
R2_PUBLIC_URL=https://cdn.yourdomain.com

# Optional: Custom R2 endpoint
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
```

---

## R2 Bucket Setup

### **1. Enable Public Access**

In Cloudflare Dashboard:
1. Go to R2 → Your Bucket → Settings
2. Enable **Public Access**
3. Note the public URL: `https://pub-<hash>.r2.dev`

### **2. Custom Domain (Recommended)**

1. Go to R2 → Your Bucket → Settings → Custom Domains
2. Add your domain: `cdn.yourdomain.com`
3. Cloudflare will automatically configure DNS
4. Use this in `R2_PUBLIC_URL`

---

## How It Works

### **Upload Flow**

1. **Frontend** sends file via FormData to `/api/storage/upload`
2. **Backend** receives file in memory (multer)
3. **Backend** generates unique key: `designs/{designNo}/{colorName}/{timestamp}.{ext}`
4. **Backend** uploads to R2 using `uploadToR2(buffer, key, contentType)`
5. **R2** stores file and makes it publicly accessible
6. **Backend** returns public CDN URL
7. **Frontend** saves URL to database

### **Retrieval Flow**

1. **Frontend** requests design/cart data
2. **Backend** fetches from database (URLs already stored)
3. **Backend** calls `getPublicUrl(key)` to ensure correct CDN URL
4. **Backend** returns public URLs to frontend
5. **Frontend** displays images directly (no signing needed)

---

## Security

### **What's Secure**

✅ R2 credentials stored only on backend  
✅ Admin authentication required for uploads  
✅ File validation on backend  
✅ Public URLs only for uploaded images  

### **What's Public**

⚠️ Image URLs are public (anyone with URL can view)  
⚠️ Suitable for product images, not sensitive data  

---

## Migration Notes

### **Breaking Changes**

**Old Code:**
```javascript
// Get presigned upload URL
const { uploadUrl, publicUrl } = await api.getUploadUrl(fileName, contentType);

// Upload directly to R2
await fetch(uploadUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': contentType }
});
```

**New Code:**
```javascript
// Upload via backend
const formData = new FormData();
formData.append('file', file);
formData.append('designNo', designNo);
formData.append('colorName', colorName);

const { publicUrl } = await api.uploadImage(formData);
```

---

## Troubleshooting

### **Upload Fails**

**Check:**
- R2 credentials are correct in `.env`
- `STORAGE_TYPE=cdn` is set
- File size is within limits (default 50MB)
- Admin authentication token is valid

### **Images Not Loading**

**Check:**
- `R2_PUBLIC_URL` is set correctly
- R2 bucket has public access enabled
- Custom domain is configured in R2 settings
- URLs in database match CDN URL format

### **CORS Errors**

**Solution:**
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

---

## Performance

- **Upload Speed**: Depends on backend server location
- **Retrieval Speed**: Fast (public CDN, no signing overhead)
- **Bandwidth**: Zero egress fees with R2
- **Caching**: Cloudflare CDN automatically caches images

---

## Summary

The new architecture provides:
- ✅ Simpler frontend code
- ✅ Better security (credentials on backend only)
- ✅ Direct backend control over uploads
- ✅ Public CDN URLs (no signing needed)
- ✅ Zero egress fees with Cloudflare R2
