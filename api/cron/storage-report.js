// Weekly storage monitor — reports DB size + per-table row counts and flags when
// the database grows past STORAGE_ALERT_GB so growth is caught early.
// Guarded by CRON_SECRET. (Wiring the alert to Slack/email is a TODO.)
import { sql } from 'drizzle-orm';
import { getDb } from '../_lib/db.js';
import { authorizeCron } from '../_lib/cron.js';
import { ok, fail, methodNotAllowed } from '../_lib/respond.js';

const TABLES = [
  'timelines',
  'milestone_overrides',
  'payments',
  'integration_links',
  'oauth_connections',
  'templates',
  'photographers',
];

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return methodNotAllowed(res, ['POST', 'GET']);
  if (!authorizeCron(req)) return fail(res, 401, 'unauthorized');

  const db = getDb();
  const sizeRow = await db.execute(sql`select pg_database_size(current_database()) as bytes`);
  const bytes = Number(sizeRow.rows?.[0]?.bytes ?? 0);

  const counts = {};
  for (const t of TABLES) {
    try {
      const r = await db.execute(sql`select count(*)::int as n from ${sql.identifier(t)}`);
      counts[t] = Number(r.rows?.[0]?.n ?? 0);
    } catch {
      counts[t] = null; // table may not exist yet
    }
  }

  const gb = bytes / 1024 ** 3;
  const alertGb = Number(process.env.STORAGE_ALERT_GB || 1);
  const alert = gb > alertGb;
  // TODO: when `alert`, notify via Slack/email/Sentry.

  return ok(res, { bytes, gb: Number(gb.toFixed(4)), alertGb, alert, counts });
}
