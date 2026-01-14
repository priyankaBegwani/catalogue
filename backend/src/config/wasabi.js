import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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
  });

  const signedUrl = await getSignedUrl(wasabiClient, command, { expiresIn: 3600 });

  const publicUrl = CDN_URL
    ? `${CDN_URL}/${key}`
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

export { wasabiClient, BUCKET_NAME };
