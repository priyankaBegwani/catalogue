import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Storage directory for local files
const STORAGE_DIR = path.join(__dirname, '../../uploads');

/**
 * Ensure storage directory exists
 */
async function ensureStorageDir() {
  try {
    await fs.access(STORAGE_DIR);
  } catch {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
}

/**
 * Generate a local storage path and public URL
 * @param {string} key - Storage path/key (e.g., designs/IND-001/Red/123456.jpg)
 * @returns {Promise<{uploadPath: string, publicUrl: string}>}
 */
export async function generateLocalStoragePath(key) {
  await ensureStorageDir();
  
  const filePath = path.join(STORAGE_DIR, key);
  const fileDir = path.dirname(filePath);
  
  // Ensure directory exists
  await fs.mkdir(fileDir, { recursive: true });
  
  // Generate public URL (served by Express static middleware)
  const publicUrl = `${process.env.VITE_BACKEND_URL || 'http://localhost:3001'}/uploads/${key}`;
  
  return {
    uploadPath: filePath,
    publicUrl,
    key,
  };
}

/**
 * Save file to local storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} key - Storage path/key
 * @returns {Promise<string>} Public URL of saved file
 */
export async function saveToLocalStorage(fileBuffer, key) {
  try {
    const { uploadPath, publicUrl } = await generateLocalStoragePath(key);
    
    // Write file to disk
    await fs.writeFile(uploadPath, fileBuffer);
    
    return publicUrl;
  } catch (error) {
    console.error('Save to local storage error:', error);
    throw new Error(`Failed to save file locally: ${error.message}`);
  }
}

/**
 * Delete file from local storage
 * @param {string} key - Storage path/key
 */
export async function deleteFromLocalStorage(key) {
  try {
    const filePath = path.join(STORAGE_DIR, key);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return; // File doesn't exist, consider it deleted
    }
    
    // Delete file
    await fs.unlink(filePath);
    
    // Try to clean up empty directories
    try {
      const fileDir = path.dirname(filePath);
      const files = await fs.readdir(fileDir);
      if (files.length === 0) {
        await fs.rmdir(fileDir);
        
        // Try to remove parent directory if empty
        const parentDir = path.dirname(fileDir);
        const parentFiles = await fs.readdir(parentDir);
        if (parentFiles.length === 0) {
          await fs.rmdir(parentDir);
        }
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  } catch (error) {
    console.error('Delete from local storage error:', error);
    throw new Error(`Failed to delete file locally: ${error.message}`);
  }
}

/**
 * Get file from local storage
 * @param {string} key - Storage path/key
 * @returns {Promise<Buffer>} File buffer
 */
export async function getFromLocalStorage(key) {
  try {
    const filePath = path.join(STORAGE_DIR, key);
    return await fs.readFile(filePath);
  } catch (error) {
    console.error('Get from local storage error:', error);
    throw new Error(`Failed to read file locally: ${error.message}`);
  }
}

/**
 * Check if file exists in local storage
 * @param {string} key - Storage path/key
 * @returns {Promise<boolean>}
 */
export async function fileExistsInLocalStorage(key) {
  try {
    const filePath = path.join(STORAGE_DIR, key);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export { STORAGE_DIR };
