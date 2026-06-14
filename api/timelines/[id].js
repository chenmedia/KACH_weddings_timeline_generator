// GET    /api/timelines/:id  → one timeline as a `state` object (+ id)
// PUT    /api/timelines/:id  → replace inputs + overrides
// DELETE /api/timelines/:id  → delete (cascades to overrides/payments/links)
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '../_lib/db.js';
import { requireUser } from '../_lib/auth.js';
import { ok, fail, methodNotAllowed } from '../_lib/respond.js';
import { stateToRow, overridesToRows, rowToState } from '../../src/lib/row-mapper.js';

export default async function handler(req, res) {
  const uid = await requireUser(req, res);
  if (!uid) return;
  const db = getDb();
  const { timelines, milestoneOverrides } = schema;
  const id = req.query.id;

  // Ownership check up front — used by every method.
  const [row] = await db
    .select()
    .from(timelines)
    .where(and(eq(timelines.id, id), eq(timelines.ownerId, uid)));
  if (!row) return fail(res, 404, 'not found');

  if (req.method === 'GET') {
    const ovRows = await db.select().from(milestoneOverrides).where(eq(milestoneOverrides.timelineId, id));
    return ok(res, { id, ...rowToState(row, ovRows) });
  }

  if (req.method === 'PUT') {
    const state = req.body || {};
    await db
      .update(timelines)
      .set({ ...stateToRow(state), updatedAt: new Date() })
      .where(eq(timelines.id, id));
    // Replace overrides wholesale (simple + correct for the editor UI).
    await db.delete(milestoneOverrides).where(eq(milestoneOverrides.timelineId, id));
    const ovRows = overridesToRows(id, state);
    if (ovRows.length) await db.insert(milestoneOverrides).values(ovRows);
    return ok(res, { id, ...rowToState({ ...row, ...stateToRow(state) }, ovRows) });
  }

  if (req.method === 'DELETE') {
    await db.delete(timelines).where(eq(timelines.id, id));
    return ok(res, { deleted: true });
  }

  return methodNotAllowed(res, ['GET', 'PUT', 'DELETE']);
}
