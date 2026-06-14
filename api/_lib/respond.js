// Consistent JSON responses + small helpers for the serverless handlers.
import { randomBytes } from 'node:crypto';

export function ok(res, data, status = 200) {
  res.status(status).json(data);
}

export function fail(res, status, message) {
  res.status(status).json({ error: message });
}

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  res.status(405).json({ error: 'method not allowed' });
}

// Unguessable URL-safe share slug (~22 base62 chars ≈ 128 bits).
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
export function genSlug(len = 22) {
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}
