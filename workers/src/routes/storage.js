import { Hono } from 'hono';
import { authenticateUser, optionalAuth, requireAdmin } from '../middleware/auth.js';
import { uploadToR2, deleteFromR2, getPublicUrl } from '../lib/r2.js';

const storage = new Hono();

// Direct upload endpoint - frontend sends file to backend
storage.post('/upload', authenticateUser, requireAdmin, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file');

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    const designNo = formData.get('designNo');
    const colorName = formData.get('colorName');
    
    const fileName = file.name;
    const fileExt = fileName.split('.').pop();
    const timestamp = Date.now();
    const sanitizedDesignNo = (designNo || 'unknown').replace(/[^a-zA-Z0-9-]/g, '_');
    const sanitizedColorName = (colorName || 'default').replace(/[^a-zA-Z0-9-]/g, '_');

    const key = `designs/${sanitizedDesignNo}/${sanitizedColorName}/${timestamp}.${fileExt}`;

    // Upload to R2
    const buffer = await file.arrayBuffer();
    const r2Result = await uploadToR2(c.env, buffer, key, file.type);

    return c.json({
      publicUrl: r2Result.publicUrl,
      key,
      storageType: 'cdn',
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ error: 'Failed to upload file' }, 500);
  }
});

storage.delete('/delete', authenticateUser, requireAdmin, async (c) => {
  try {
    const { imageUrl } = await c.req.json();

    if (!imageUrl) {
      return c.json({ error: 'imageUrl is required' }, 400);
    }

    const urlParts = imageUrl.split('/');
    const keyStartIndex = urlParts.findIndex(part => part === 'designs');

    if (keyStartIndex === -1) {
      return c.json({ error: 'Invalid image URL format' }, 400);
    }

    const key = urlParts.slice(keyStartIndex).join('/');

    // Delete from R2
    await deleteFromR2(c.env, key);

    return c.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete image error:', error);
    return c.json({ error: 'Failed to delete image' }, 500);
  }
});

// Get public URL for image retrieval
storage.post('/signed-url', optionalAuth, async (c) => {
  try {
    const { imageUrl } = await c.req.json();

    if (!imageUrl) {
      return c.json({ error: 'imageUrl is required' }, 400);
    }

    // Extract key from URL
    const urlParts = imageUrl.split('/');
    const keyStartIndex = urlParts.findIndex(part => part === 'designs');
    
    if (keyStartIndex === -1) {
      return c.json({ error: 'Invalid image URL format' }, 400);
    }

    const key = urlParts.slice(keyStartIndex).join('/');

    // Get public URL from R2
    const signedUrl = getPublicUrl(c.env, key);

    return c.json({ signedUrl });
  } catch (error) {
    console.error('Generate signed URL error:', error);
    return c.json({ error: 'Failed to generate signed URL' }, 500);
  }
});

// Batch generate signed URLs for multiple images
storage.post('/signed-urls-batch', optionalAuth, async (c) => {
  try {
    const { imageUrls } = await c.req.json();

    if (!imageUrls || !Array.isArray(imageUrls)) {
      return c.json({ error: 'imageUrls array is required' }, 400);
    }

    const signedUrls = [];

    for (const imageUrl of imageUrls) {
      try {
        // Extract key from URL
        const urlParts = imageUrl.split('/');
        const keyStartIndex = urlParts.findIndex(part => part === 'designs');
        
        if (keyStartIndex !== -1) {
          const key = urlParts.slice(keyStartIndex).join('/');
          const signedUrl = getPublicUrl(c.env, key);
          signedUrls.push({ originalUrl: imageUrl, signedUrl });
        } else {
          signedUrls.push({ originalUrl: imageUrl, signedUrl: imageUrl });
        }
      } catch (error) {
        console.error(`Failed to generate signed URL for ${imageUrl}:`, error);
        signedUrls.push({ originalUrl: imageUrl, signedUrl: imageUrl, error: error.message });
      }
    }

    return c.json({ signedUrls });
  } catch (error) {
    console.error('Batch signed URL error:', error);
    return c.json({ error: 'Failed to generate signed URLs' }, 500);
  }
});

export default storage;
