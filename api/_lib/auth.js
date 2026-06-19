// Clerk-based auth for the serverless handlers. The browser sends the Clerk
// session JWT as `Authorization: Bearer <token>`; we verify it server-side and
// derive the owner id. Centralised here so every handler enforces it the same way.
import { verifyToken } from '@clerk/backend';

/** @returns {Promise<string|null>} Clerk user id, or null if unauthenticated */
export async function getUserId(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    return payload.sub || null;
  } catch {
    return null;
  }
}

/** Resolve the user id or send 401. Returns null when it has already responded. */
export async function requireUser(req, res) {
  const uid = await getUserId(req);
  if (!uid) {
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  return uid;
}
