/**
 * One-Time Token (OTT) — AES-256-GCM signed envelope
 *
 * Encrypts { access_token, refresh_token, exp } with a server-side secret.
 * The resulting base64url string travels in the redirect URL instead of raw tokens.
 *
 * Env var required:
 *   REGISTRATION_SECRET — any long random string (min 32 chars recommended)
 *                         generate with: openssl rand -hex 32
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES   = 12;   // 96-bit IV — correct size for GCM
const TAG_BYTES  = 16;   // 128-bit auth tag
const TTL_MS     = 5 * 60 * 1000; // 5 minutes

function getKey() {
  const secret = process.env.REGISTRATION_SECRET;
  if (!secret) throw new Error('REGISTRATION_SECRET env var is not set');
  // Derive a fixed 32-byte key from the secret string
  return createHash('sha256').update(secret).digest();
}

/**
 * Encrypt access_token + refresh_token into a short-lived URL-safe token.
 * @returns {string} base64url-encoded ciphertext
 */
export function createOTT(accessToken, refreshToken, slug) {
  const payload = JSON.stringify({
    a: accessToken,
    r: refreshToken,
    s: slug,          // tenant slug — so the frontend can resolve the tenant on arrival
    exp: Date.now() + TTL_MS,
  });

  const key = getKey();
  const iv  = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(payload, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag(); // 16 bytes

  // Wire format: iv (12) | tag (16) | ciphertext
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

/**
 * Decrypt and validate an OTT produced by createOTT.
 * Throws if the token is tampered with or expired.
 * @returns {{ accessToken: string, refreshToken: string }}
 */
export function exchangeOTT(ott) {
  let buf;
  try {
    buf = Buffer.from(ott, 'base64url');
  } catch {
    throw new Error('Invalid OTT format');
  }

  if (buf.length <= IV_BYTES + TAG_BYTES) {
    throw new Error('Invalid OTT length');
  }

  const iv        = buf.subarray(0, IV_BYTES);
  const tag       = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const encrypted = buf.subarray(IV_BYTES + TAG_BYTES);

  const key = getKey();
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted;
  try {
    decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    // GCM auth tag mismatch — token was tampered with
    throw new Error('Invalid OTT — decryption failed');
  }

  let payload;
  try {
    payload = JSON.parse(decrypted);
  } catch {
    throw new Error('Invalid OTT payload');
  }

  if (Date.now() > payload.exp) {
    throw new Error('OTT expired');
  }

  return { accessToken: payload.a, refreshToken: payload.r, slug: payload.s ?? null };
}
