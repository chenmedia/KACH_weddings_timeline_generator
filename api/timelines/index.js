// GET  /api/timelines        → list the current photographer's timelines (summary)
// POST /api/timelines        → create a timeline from a posted `state` object
import { desc, eq } from 'drizzle-orm';
import { getDb, schema } from '../_lib/db.js';
import { requireUser } from '../_lib/auth.js';
import { ok, fail, methodNotAllowed, genSlug } from '../_lib/respond.js';
import { withErrorCapture } from '../_lib/observability.js';
import { stateToRow, overridesToRows, rowToState } from '../../src/lib/row-mapper.js';

async function handler(req, res) {
  const uid = await requireUser(req, res);
  if (!uid) return;
  const db = getDb();
  const { timelines, milestoneOverrides } = schema;

  if (req.method === 'GET') {
    const rows = await db
      .select({
        id: timelines.id,
        couple: timelines.couple,
        wdate: timelines.wdate,
        status: timelines.status,
        shareSlug: timelines.shareSlug,
        updatedAt: timelines.updatedAt,
      })
      .from(timelines)
      .where(eq(timelines.ownerId, uid))
      .orderBy(desc(timelines.wdate));
    return ok(res, { timelines: rows });
  }

  if (req.method === 'POST') {
    const state = req.body || {};
    if (!state.wdate) return fail(res, 400, 'wdate is required');
    const row = stateToRow(state);
    const [created] = await db
      .insert(timelines)
      .values({ ...row, ownerId: uid, shareSlug: genSlug(), lang: state.lang || 'nb' })
      .returning();
    const ovRows = overridesToRows(created.id, state);
    if (ovRows.length) await db.insert(milestoneOverrides).values(ovRows);
    return ok(res, { id: created.id, ...rowToState(created, ovRows) }, 201);
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}

export default withErrorCapture(handler);
