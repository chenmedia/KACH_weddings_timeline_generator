import { and, desc, eq } from 'drizzle-orm';
import { getDb, schema } from '../_lib/db.js';
import { requireUser } from '../_lib/auth.js';
import { ok, fail, methodNotAllowed } from '../_lib/respond.js';
import { withErrorCapture } from '../_lib/observability.js';

function reviewPayload(review, comments) {
  return {
    status: review?.status || 'open',
    decidedBy: review?.decidedBy || '',
    decidedAt: review?.decidedAt || null,
    comments: comments || [],
  };
}

async function handler(req, res) {
  const uid = await requireUser(req, res);
  if (!uid) return;
  const db = getDb();
  const { timelines, timelineReviews, timelineComments } = schema;
  const timelineId = req.query.timelineId;
  const [project] = await db
    .select({ id: timelines.id })
    .from(timelines)
    .where(and(eq(timelines.id, timelineId), eq(timelines.ownerId, uid)));
  if (!project) return fail(res, 404, 'not found', 'NOT_FOUND');

  if (req.method === 'PATCH') {
    const commentId = String(req.body?.commentId || '');
    const status = req.body?.status === 'resolved' ? 'resolved' : 'open';
    if (commentId) {
      const [updated] = await db
        .update(timelineComments)
        .set({ status, resolvedAt: status === 'resolved' ? new Date() : null })
        .where(and(eq(timelineComments.id, commentId), eq(timelineComments.timelineId, timelineId)))
        .returning({ id: timelineComments.id });
      if (!updated) return fail(res, 404, 'comment not found', 'NOT_FOUND');
    } else if (req.body?.resetReview) {
      await db
        .insert(timelineReviews)
        .values({ timelineId, status: 'open' })
        .onConflictDoUpdate({
          target: timelineReviews.timelineId,
          set: { status: 'open', decidedBy: null, decidedAt: null, updatedAt: new Date() },
        });
    } else {
      return fail(res, 422, 'commentId or resetReview is required');
    }
  } else if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET', 'PATCH']);
  }

  const [[review], comments] = await Promise.all([
    db.select().from(timelineReviews).where(eq(timelineReviews.timelineId, timelineId)),
    db
      .select()
      .from(timelineComments)
      .where(eq(timelineComments.timelineId, timelineId))
      .orderBy(desc(timelineComments.createdAt)),
  ]);
  return ok(res, { timelineId, review: reviewPayload(review, comments) });
}

export default withErrorCapture(handler);
