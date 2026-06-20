// GET /api/public/timeline/:slug → read-only timeline for the couple's link.
// No auth. Returns ONLY client-safe fields (never owner_id, payments, etc.).
import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '../../_lib/db.js';
import { ok, fail, methodNotAllowed } from '../../_lib/respond.js';
import { withErrorCapture } from '../../_lib/observability.js';
import { rowToState } from '../../../src/lib/row-mapper.js';

async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const db = getDb();
  const { timelines, milestoneOverrides } = schema;
  const slug = req.query.slug;

  const [row] = await db
    .select() // whitelisted again below via rowToState — owner_id is never returned
    .from(timelines)
    .where(and(eq(timelines.shareSlug, slug), eq(timelines.shareEnabled, true)));

  if (!row) return fail(res, 404, 'not found');
  if (row.shareExpiresAt && new Date(row.shareExpiresAt) < new Date()) {
    return fail(res, 410, 'link expired');
  }

  const ovRows = await db.select().from(milestoneOverrides).where(eq(milestoneOverrides.timelineId, row.id));

  // rowToState emits only the client `state` shape (couple, dates, toggles,
  // overrides, lang) — no owner_id, status or bookkeeping leaks out.
  const state = rowToState(row, ovRows);
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  return ok(res, { state, lang: row.lang || 'nb' });
}

export default withErrorCapture(handler);
