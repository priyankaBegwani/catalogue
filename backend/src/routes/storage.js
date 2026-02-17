import express from 'express';
import multer from 'multer';
import { authenticateUser, optionalAuth } from '../middleware/auth.js';
import { generateUploadUrl, deleteFromWasabi, generateSignedGetUrl } from '../config/wasabi.js';
import { generateSupabaseUploadUrl, deleteFromSupabase } from '../config/supabaseStorage.js';
import { generateLocalStoragePath, saveToLocalStorage, deleteFromLocalStorage } from '../config/localStorage.js';
import { config } from '../config.js';

const router = express.Router();

// Configure multer for local file uploads
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload-url', authenticateUser, async (req, res) => {
  try {
    if (req.profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { fileName, contentType, designNo, colorName } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({ error: 'fileName and contentType are required' });
    }

    const fileExt = fileName.split('.').pop();
    const timestamp = Date.now();
    const sanitizedDesignNo = (designNo || 'unknown').replace(/[^a-zA-Z0-9-]/g, '_');
    const sanitizedColorName = (colorName || 'default').replace(/[^a-zA-Z0-9-]/g, '_');

    const key = `designs/${sanitizedDesignNo}/${sanitizedColorName}/${timestamp}.${fileExt}`;

    let uploadUrl, publicUrl, token;

    // Select storage based on configuration
    switch (config.storageType) {
      case 'cdn':
        const cdnResult = await generateUploadUrl(key, contentType);
        uploadUrl = cdnResult.uploadUrl;
        publicUrl = cdnResult.publicUrl;
        break;

      case 'supabase':
        const supabaseResult = await generateSupabaseUploadUrl(key);
        uploadUrl = supabaseResult.uploadUrl;
        publicUrl = supabaseResult.publicUrl;
        token = supabaseResult.token;
        break;

      case 'local':
        const localResult = await generateLocalStoragePath(key);
        // For local storage, we'll use a direct upload endpoint
        uploadUrl = `${process.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/storage/upload-local`;
        publicUrl = localResult.publicUrl;
        break;

      default:
        throw new Error(`Invalid storage type: ${config.storageType}`);
    }

    res.json({
      uploadUrl,
      publicUrl,
      key,
      token,
      storageType: config.storageType,
    });
  } catch (error) {
    console.error('Generate upload URL error:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
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

    // Select storage based on configuration
    switch (config.storageType) {
      case 'cdn':
        await deleteFromWasabi(key);
        break;

      case 'supabase':
        await deleteFromSupabase(key);
        break;

      case 'local':
        await deleteFromLocalStorage(key);
        break;

      default:
        throw new Error(`Invalid storage type: ${config.storageType}`);
    }

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Direct upload endpoint for local storage
router.post('/upload-local', authenticateUser, upload.single('file'), async (req, res) => {
  try {
    if (req.profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'Storage key is required' });
    }

    // Save file to local storage
    const publicUrl = await saveToLocalStorage(req.file.buffer, key);

    res.json({
      publicUrl,
      key,
      message: 'File uploaded successfully',
    });
  } catch (error) {
    console.error('Local upload error:', error);
    res.status(500).json({ error: 'Failed to upload file locally' });
  }
});

// Generate signed URLs for image retrieval
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

    let signedUrl;

    // Generate signed URL based on storage type
    switch (config.storageType) {
      case 'cdn':
        signedUrl = await generateSignedGetUrl(key, 3600); // 1 hour expiry
        break;
      
      case 'supabase':
        // For Supabase, return the original URL as it handles auth differently
        signedUrl = imageUrl;
        break;
      
      case 'local':
        // For local storage, return the original URL
        signedUrl = imageUrl;
        break;
      
      default:
        return res.status(400).json({ error: 'Invalid storage type' });
    }

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
          
          let signedUrl;
          
          switch (config.storageType) {
            case 'cdn':
              signedUrl = await generateSignedGetUrl(key, 3600);
              break;
            case 'supabase':
            case 'local':
              signedUrl = imageUrl;
              break;
            default:
              signedUrl = imageUrl;
          }
          
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
