/**
 * Local JWT utilities — HS256 verification without a Supabase API call.
 *
 * verifyHS256JWT : validates signature + expiry, returns parsed claims
 * decodeJWTPayload: base64url-decodes payload with NO signature check
 *                   (only use when you already trust the token — e.g. inside OTT exchange)
 */

import { createHmac, timingSafeEqual } from 'crypto';

function b64urlToBytes(b64url) {
  // Convert base64url → standard base64 then decode
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64, 'base64');
}

export function decodeJWTPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');
  return JSON.parse(b64urlToBytes(parts[1]).toString('utf8'));
}

/**
 * Verify an HS256 JWT locally.
 * Throws on invalid signature, wrong algorithm, or expired token.
 * Returns the decoded claims on success.
 */
export function verifyHS256JWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

  const [headerB64, payloadB64, signatureB64] = parts;

  // Decode and check algorithm
  const header = JSON.parse(b64urlToBytes(headerB64).toString('utf8'));
  if (header.alg !== 'HS256') {
    throw new Error(`Unsupported JWT algorithm: ${header.alg}`);
  }

  // Recompute expected HMAC-SHA256 over "header.payload"
  const expected = createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest();

  const actual = b64urlToBytes(signatureB64);

  // Constant-time comparison to prevent timing attacks
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new Error('Invalid JWT signature');
  }

  const claims = JSON.parse(b64urlToBytes(payloadB64).toString('utf8'));

  // Check expiry
  if (claims.exp && Math.floor(Date.now() / 1000) > claims.exp) {
    throw new Error('JWT expired');
  }

  return claims;
}
