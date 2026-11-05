import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb, schema } from '../../_lib/db.js';
import { ok, fail, methodNotAllowed } from '../../_lib/respond.js';
import { withErrorCapture } from '../../_lib/observability.js';

const ITEM_KEY = /^[a-zA-Z0-9_-]{1,80}$/;

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function sharedTimeline(db, slug, timelines) {
  const [row] = await db
    .select({ id: timelines.id, shareExpiresAt: timelines.shareExpiresAt })
    .from(timelines)
    .where(and(eq(timelines.shareSlug, slug), eq(timelines.shareEnabled, true)));
  if (!row || (row.shareExpiresAt && new Date(row.shareExpiresAt) < new Date())) return null;
  return row;
}

async function response(db, timelineId, timelineReviews, timelineComments) {
  const [[review], comments] = await Promise.all([
    db.select().from(timelineReviews).where(eq(timelineReviews.timelineId, timelineId)),
    db
      .select({
        id: timelineComments.id,
        itemKey: timelineComments.itemKey,
        authorName: timelineComments.authorName,
        body: timelineComments.body,
        kind: timelineComments.kind,
        status: timelineComments.status,
        createdAt: timelineComments.createdAt,
      })
      .from(timelineComments)
      .where(eq(timelineComments.timelineId, timelineId))
      .orderBy(desc(timelineComments.createdAt)),
  ]);
  return {
    status: review?.status || 'open',
    decidedBy: review?.decidedBy || '',
    decidedAt: review?.decidedAt || null,
    comments,
  };
}

async function handler(req, res) {
  const db = getDb();
  const { timelines, timelineReviews, timelineComments } = schema;
  const row = await sharedTimeline(db, req.query.slug, timelines);
  if (!row) return fail(res, 404, 'not found');
  res.setHeader('Cache-Control', 'private, no-store');

  if (req.method === 'GET') {
    return ok(res, { review: await response(db, row.id, timelineReviews, timelineComments) });
  }
  if (req.method !== 'POST') return methodNotAllowed(res, ['GET', 'POST']);

  const action = req.body?.action;
  const authorName = clean(req.body?.authorName, 120);
  if (!authorName) return fail(res, 422, 'name is required');

  if (action === 'comment') {
    const body = clean(req.body?.body, 2000);
    const kind = req.body?.kind === 'change_request' ? 'change_request' : 'comment';
    const itemKey = ITEM_KEY.test(req.body?.itemKey || '') ? req.body.itemKey : null;
    if (!body) return fail(res, 422, 'comment is required');
    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(timelineComments)
      .where(eq(timelineComments.timelineId, row.id));
    if (count >= 200) return fail(res, 429, 'comment limit reached');
    await db.insert(timelineComments).values({
      timelineId: row.id,
      itemKey,
      authorName,
      body,
      kind,
    });
    if (kind === 'change_request') {
      await db
        .insert(timelineReviews)
        .values({
          timelineId: row.id,
          status: 'changes_requested',
          decidedBy: authorName,
          decidedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: timelineReviews.timelineId,
          set: {
            status: 'changes_requested',
            decidedBy: authorName,
            decidedAt: new Date(),
            updatedAt: new Date(),
          },
        });
    }
  } else if (action === 'decision') {
    const status = req.body?.status;
    if (!['approved', 'changes_requested'].includes(status)) {
      return fail(res, 422, 'valid review status is required');
    }
    await db
      .insert(timelineReviews)
      .values({ timelineId: row.id, status, decidedBy: authorName, decidedAt: new Date() })
      .onConflictDoUpdate({
        target: timelineReviews.timelineId,
        set: { status, decidedBy: authorName, decidedAt: new Date(), updatedAt: new Date() },
      });
  } else {
    return fail(res, 422, 'valid action is required');
  }

  return ok(res, { review: await response(db, row.id, timelineReviews, timelineComments) }, 201);
}

export default withErrorCapture(handler);
