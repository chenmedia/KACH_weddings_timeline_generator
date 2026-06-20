// PUT /api/overrides/:timelineId → replace the milestone overrides for a timeline.
// (Convenience endpoint; the timelines PUT also handles overrides.)
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '../_lib/db.js';
import { requireUser } from '../_lib/auth.js';
import { ok, fail, methodNotAllowed } from '../_lib/respond.js';
import { withErrorCapture } from '../_lib/observability.js';
import { overridesToRows } from '../../src/lib/row-mapper.js';

async function handler(req, res) {
  const uid = await requireUser(req, res);
  if (!uid) return;
  if (req.method !== 'PUT') return methodNotAllowed(res, ['PUT']);

  const db = getDb();
  const { timelines, milestoneOverrides } = schema;
  const timelineId = req.query.timelineId;

  const [owned] = await db
    .select({ id: timelines.id })
    .from(timelines)
    .where(and(eq(timelines.id, timelineId), eq(timelines.ownerId, uid)));
  if (!owned) return fail(res, 404, 'not found');

  await db.delete(milestoneOverrides).where(eq(milestoneOverrides.timelineId, timelineId));
  const rows = overridesToRows(timelineId, { overrides: (req.body && req.body.overrides) || {} });
  if (rows.length) await db.insert(milestoneOverrides).values(rows);
  return ok(res, { count: rows.length });
}

export default withErrorCapture(handler);
