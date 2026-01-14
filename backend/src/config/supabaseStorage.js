import { supabaseAdmin } from '../config.js';

const STORAGE_BUCKET = 'design-images';

/**
 * Upload file to Supabase Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} key - Storage path/key
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Public URL of uploaded file
 */
export async function uploadToSupabase(fileBuffer, key, contentType) {
  try {
    // Upload file to Supabase storage
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(key, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload to Supabase: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(key);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Upload to Supabase error:', error);
    throw error;
  }
}

/**
 * Delete file from Supabase Storage
 * @param {string} key - Storage path/key
 */
export async function deleteFromSupabase(key) {
  try {
    const { error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove([key]);

    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Failed to delete from Supabase: ${error.message}`);
    }
  } catch (error) {
    console.error('Delete from Supabase error:', error);
    throw error;
  }
}

/**
 * Generate a signed upload URL for direct client upload to Supabase
 * @param {string} key - Storage path/key
 * @returns {Promise<{uploadUrl: string, publicUrl: string}>}
 */
export async function generateSupabaseUploadUrl(key) {
  try {
    // Create a signed URL for upload (valid for 1 hour)
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(key);

    if (error) {
      throw new Error(`Failed to generate upload URL: ${error.message}`);
    }

    // Get the public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(key);

    return {
      uploadUrl: data.signedUrl,
      publicUrl: urlData.publicUrl,
      token: data.token,
      key: key,
    };
  } catch (error) {
    console.error('Generate Supabase upload URL error:', error);
    throw error;
  }
}

export { STORAGE_BUCKET };
