import { desc, eq, sql } from 'drizzle-orm';
import { ok, fail } from './respond.js';
import { logActivity } from './history.js';

const ITEM_KEY = /^[a-zA-Z0-9_-]{1,80}$/;

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export async function readPublicReview(db, timelineId, schema) {
  const { timelineReviews, timelineComments } = schema;
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

export async function submitPublicReview(req, res, { db, timelineId, ownerId, schema }) {
  const { timelineReviews, timelineComments } = schema;
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
      .where(eq(timelineComments.timelineId, timelineId));
    if (count >= 200) return fail(res, 429, 'comment limit reached');
    await db.insert(timelineComments).values({ timelineId, itemKey, authorName, body, kind });
    await logActivity(db, schema, {
      timelineId,
      ownerId,
      actorType: 'couple',
      actorName: authorName,
      action: kind === 'change_request' ? 'review.changes_requested' : 'review.comment_added',
      itemKey,
    });
    if (kind === 'change_request') {
      await db
        .insert(timelineReviews)
        .values({ timelineId, status: 'changes_requested', decidedBy: authorName, decidedAt: new Date() })
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
      .values({ timelineId, status, decidedBy: authorName, decidedAt: new Date() })
      .onConflictDoUpdate({
        target: timelineReviews.timelineId,
        set: { status, decidedBy: authorName, decidedAt: new Date(), updatedAt: new Date() },
      });
    await logActivity(db, schema, {
      timelineId,
      ownerId,
      actorType: 'couple',
      actorName: authorName,
      action: status === 'approved' ? 'review.approved' : 'review.changes_requested',
    });
  } else {
    return fail(res, 422, 'valid action is required');
  }

  return ok(res, { review: await readPublicReview(db, timelineId, schema) }, 201);
}
