import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Cloudflare R2 Configuration
// R2 is S3-compatible, so we use the AWS SDK
const r2Client = new S3Client({
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: 'auto', // R2 uses 'auto' for region
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'indie-craft-designs';
// R2 Public URL: https://pub-<hash>.r2.dev or custom domain
const PUBLIC_URL = process.env.R2_PUBLIC_URL || '';

// Direct upload to R2 - backend handles the upload
export async function uploadToR2(buffer, key, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await r2Client.send(command);

  // Return public URL using CDN
  const publicUrl = PUBLIC_URL
    ? `${PUBLIC_URL}/${key}`
    : `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET_NAME}/${key}`;

  return {
    publicUrl,
    key,
  };
}

export async function deleteFromR2(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

// Get public URL for an image (no signing needed with public bucket)
export function getPublicUrl(key) {
  // Return public CDN URL
  return PUBLIC_URL
    ? `${PUBLIC_URL}/${key}`
    : `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET_NAME}/${key}`;
}

export { r2Client, BUCKET_NAME };
