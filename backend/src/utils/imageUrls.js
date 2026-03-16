/**
 * Shared image URL conversion utility.
 * Extracts the R2 key from a stored URL and returns the public CDN URL.
 */
import { getPublicUrl } from '../config/r2.js';

/**
 * Convert stored image URLs to public CDN URLs.
 * Pure synchronous — getPublicUrl is not async.
 */
export function convertToSignedUrls(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) return imageUrls;

  return imageUrls.map(imageUrl => {
    try {
      const urlParts = imageUrl.split('/');
      const keyStartIndex = urlParts.findIndex(part => part === 'designs');

      if (keyStartIndex !== -1) {
        const key = urlParts.slice(keyStartIndex).join('/');
        return getPublicUrl(key);
      }
      return imageUrl;
    } catch (error) {
      console.error(`Failed to generate signed URL for ${imageUrl}:`, error);
      return imageUrl;
    }
  });
}

/**
 * Extract R2 key from a stored image URL.
 * Returns null if the URL does not contain a valid key.
 */
export function extractR2Key(imageUrl) {
  const urlParts = imageUrl.split('/');
  const keyStartIndex = urlParts.findIndex(part => part === 'designs');
  if (keyStartIndex === -1) return null;
  return urlParts.slice(keyStartIndex).join('/');
}
