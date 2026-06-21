// GET    /api/timelines/:id  → one timeline as a `state` object (+ id)
// PUT    /api/timelines/:id  → replace inputs + overrides
// DELETE /api/timelines/:id  → delete (cascades to overrides/payments/links)
import { and, eq } from 'drizzle-orm';
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
  const id = req.query.id;

  // Ownership check up front — used by every method.
  const [row] = await db
    .select()
    .from(timelines)
    .where(and(eq(timelines.id, id), eq(timelines.ownerId, uid)));
  if (!row) return fail(res, 404, 'not found');

  if (req.method === 'GET') {
    const ovRows = await db.select().from(milestoneOverrides).where(eq(milestoneOverrides.timelineId, id));
    return ok(res, {
      id,
      ...rowToState(row, ovRows),
      shareSlug: row.shareSlug,
      shareEnabled: row.shareEnabled,
      shareExpiresAt: row.shareExpiresAt,
      viewCount: row.viewCount || 0,
      lastViewedAt: row.lastViewedAt,
    });
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

  if (req.method === 'PATCH') {
    // Partial patch of the couple's read-only share link: toggle on/off (mint a
    // slug on first enable), set/clear an expiry, or revoke (rotate the slug so
    // the old URL dies permanently).
    const body = req.body || {};
    let slug = row.shareSlug;
    let enabled = row.shareEnabled;
    let expiresAt = row.shareExpiresAt;
    const patch = { updatedAt: new Date() };

    if (body.rotateSlug) {
      // Revoke: new slug, disabled, no expiry — the previous /c/:slug stops working.
      slug = genSlug();
      enabled = false;
      expiresAt = null;
      Object.assign(patch, { shareSlug: slug, shareEnabled: false, shareExpiresAt: null });
    } else {
      if ('shareEnabled' in body) {
        enabled = !!body.shareEnabled;
        patch.shareEnabled = enabled;
        if (enabled && !slug) {
          slug = genSlug();
          patch.shareSlug = slug;
        }
      }
      if ('shareExpiresAt' in body) {
        const v = body.shareExpiresAt;
        if (v === null || v === '') {
          expiresAt = null;
          patch.shareExpiresAt = null;
        } else {
          const d = new Date(v);
          if (isNaN(d.getTime()) || d.getTime() <= Date.now()) {
            return fail(res, 400, 'shareExpiresAt must be a future date');
          }
          expiresAt = d;
          patch.shareExpiresAt = d;
        }
      }
    }

    await db.update(timelines).set(patch).where(eq(timelines.id, id));
    return ok(res, { shareSlug: slug, shareEnabled: enabled, shareExpiresAt: expiresAt });
  }

  return methodNotAllowed(res, ['GET', 'PUT', 'PATCH', 'DELETE']);
}

export default withErrorCapture(handler);
