// R2 operations using AWS S3 SDK (same as Node backend)
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Create S3 client for R2
function getR2Client(env) {
  return new S3Client({
    endpoint: env.R2_ENDPOINT || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    region: 'auto',
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID || '',
      secretAccessKey: env.R2_SECRET_ACCESS_KEY || '',
    },
  });
}

export async function uploadToR2(env, buffer, key, contentType) {
  const r2Client = getR2Client(env);
  const bucketName = env.R2_BUCKET_NAME || 'ic-designs';
  
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await r2Client.send(command);

  const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;

  return {
    publicUrl,
    key
  };
}

export async function deleteFromR2(env, key) {
  const r2Client = getR2Client(env);
  const bucketName = env.R2_BUCKET_NAME || 'ic-designs';
  
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await r2Client.send(command);
}

export function getPublicUrl(env, key) {
  return `${env.R2_PUBLIC_URL}/${key}`;
}
