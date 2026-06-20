// Scheduled retention + cleanup so storage stays bounded (and as the GDPR
// retention control). Guarded by CRON_SECRET. Deletes cascade to child rows.
//
// - Removes timelines whose wedding is older than RETENTION_MONTHS.
// - Disables expired share links.
// (Anonymise-instead-of-delete and stale-draft pruning are TODO refinements.)
import { and, lt, eq } from 'drizzle-orm';
import { getDb, schema } from '../_lib/db.js';
import { authorizeCron } from '../_lib/cron.js';
import { ok, fail, methodNotAllowed } from '../_lib/respond.js';
import { withErrorCapture } from '../_lib/observability.js';

async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') return methodNotAllowed(res, ['POST', 'GET']);
  if (!authorizeCron(req)) return fail(res, 401, 'unauthorized');

  const months = Number(process.env.RETENTION_MONTHS || 36);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const db = getDb();
  const { timelines } = schema;

  const purged = await db.delete(timelines).where(lt(timelines.wdate, cutoffStr)).returning({
    id: timelines.id,
  });

  const now = new Date();
  const expired = await db
    .update(timelines)
    .set({ shareEnabled: false })
    .where(and(eq(timelines.shareEnabled, true), lt(timelines.shareExpiresAt, now)))
    .returning({ id: timelines.id });

  return ok(res, { purged: purged.length, sharesDisabled: expired.length, cutoff: cutoffStr });
}

export default withErrorCapture(handler);
