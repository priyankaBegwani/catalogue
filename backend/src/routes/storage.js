import express from 'express';
import multer from 'multer';
import { authenticateUser, optionalAuth } from '../middleware/auth.js';
import { uploadToR2, deleteFromR2, getPublicUrl } from '../config/r2.js';

const router = express.Router();

// Configure multer for local file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Direct upload endpoint - frontend sends file to backend
router.post('/upload', authenticateUser, upload.single('file'), async (req, res) => {
  try {
    if (req.profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { designNo, colorName } = req.body;
    const fileExt = req.file.originalname.split('.').pop();
    const timestamp = Date.now();
    const sanitizedDesignNo = (designNo || 'unknown').replace(/[^a-zA-Z0-9-]/g, '_');
    const sanitizedColorName = (colorName || 'default').replace(/[^a-zA-Z0-9-]/g, '_');

    const key = `designs/${sanitizedDesignNo}/${sanitizedColorName}/${timestamp}.${fileExt}`;

    // Upload to R2
    const r2Result = await uploadToR2(req.file.buffer, key, req.file.mimetype);

    res.json({
      publicUrl: r2Result.publicUrl,
      key,
      storageType: 'cdn',
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

router.delete('/delete', authenticateUser, async (req, res) => {
  try {
    if (req.profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    const urlParts = imageUrl.split('/');
    const keyStartIndex = urlParts.findIndex(part => part === 'designs');

    if (keyStartIndex === -1) {
      return res.status(400).json({ error: 'Invalid image URL format' });
    }

    const key = urlParts.slice(keyStartIndex).join('/');

    // Delete from R2
    await deleteFromR2(key);

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Get public URL for image retrieval
router.post('/signed-url', optionalAuth, async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    // Extract key from URL
    const urlParts = imageUrl.split('/');
    const keyStartIndex = urlParts.findIndex(part => part === 'designs');
    
    if (keyStartIndex === -1) {
      return res.status(400).json({ error: 'Invalid image URL format' });
    }

    const key = urlParts.slice(keyStartIndex).join('/');

    // Get public URL from R2
    const signedUrl = getPublicUrl(key);

    res.json({ signedUrl });
  } catch (error) {
    console.error('Generate signed URL error:', error);
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
});

// Batch generate signed URLs for multiple images
router.post('/signed-urls-batch', optionalAuth, async (req, res) => {
  try {
    const { imageUrls } = req.body;

    if (!imageUrls || !Array.isArray(imageUrls)) {
      return res.status(400).json({ error: 'imageUrls array is required' });
    }

    const signedUrls = [];

    for (const imageUrl of imageUrls) {
      try {
        // Extract key from URL
        const urlParts = imageUrl.split('/');
        const keyStartIndex = urlParts.findIndex(part => part === 'designs');
        
        if (keyStartIndex !== -1) {
          const key = urlParts.slice(keyStartIndex).join('/');
          const signedUrl = getPublicUrl(key);
          signedUrls.push({ originalUrl: imageUrl, signedUrl });
        } else {
          signedUrls.push({ originalUrl: imageUrl, signedUrl: imageUrl });
        }
      } catch (error) {
        console.error(`Failed to generate signed URL for ${imageUrl}:`, error);
        signedUrls.push({ originalUrl: imageUrl, signedUrl: imageUrl, error: error.message });
      }
    }

    res.json({ signedUrls });
  } catch (error) {
    console.error('Batch signed URL error:', error);
    res.status(500).json({ error: 'Failed to generate signed URLs' });
  }
});

export default router;
