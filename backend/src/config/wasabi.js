import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const wasabiClient = new S3Client({
  endpoint: process.env.WASABI_ENDPOINT || 'https://s3.wasabisys.com',
  region: process.env.WASABI_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.WASABI_BUCKET_NAME || 'indie-craft-designs';
const CDN_URL = process.env.CLOUDFLARE_CDN_URL || '';

export async function generateUploadUrl(key, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ACL: 'public-read', // Make object publicly readable
  });

  const signedUrl = await getSignedUrl(wasabiClient, command, { expiresIn: 3600 });

  // Generate public URL
  // CDN URL should include bucket name in path: https://cdn.domain.com/bucket-name/designs/...
  // This allows Cloudflare CNAME to point to s3.region.wasabisys.com and proxy correctly
  const publicUrl = CDN_URL
    ? `${CDN_URL}/${BUCKET_NAME}/${key}`
    : `${process.env.WASABI_ENDPOINT || 'https://s3.wasabisys.com'}/${BUCKET_NAME}/${key}`;

  return {
    uploadUrl: signedUrl,
    publicUrl: publicUrl,
    key: key,
  };
}

export async function deleteFromWasabi(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await wasabiClient.send(command);
}

export async function generateSignedGetUrl(key, expiresIn = 3600) {
  // If CDN is configured and objects are public, use CDN URL directly
  // This is faster and more reliable than signed Wasabi URLs
  if (CDN_URL) {
    // CDN serves public objects, no signing needed
    return `${CDN_URL}/${BUCKET_NAME}/${key}`;
  }
  
  // Fallback to signed Wasabi URL if no CDN
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const signedUrl = await getSignedUrl(wasabiClient, command, { expiresIn });
  return signedUrl;
}

export { wasabiClient, BUCKET_NAME };
