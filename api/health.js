// Liveness/readiness check for uptime monitoring. Pings the DB.
import { sql } from 'drizzle-orm';
import { getDb } from './_lib/db.js';

export default async function handler(req, res) {
  try {
    await getDb().execute(sql`select 1`);
    res.status(200).json({ ok: true, db: 'up' });
  } catch {
    res.status(503).json({ ok: false, db: 'down' });
  }
}
