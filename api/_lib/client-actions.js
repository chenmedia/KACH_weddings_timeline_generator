import { and, desc, eq, sql } from 'drizzle-orm';
import { profileToRow, rowToClientProfile } from './client-profile-row.js';
import { ok, fail } from './respond.js';
import { captureVersion, logActivity } from './history.js';
import { applyFoclPayload, FoclImportError } from './focl-import.js';

export async function updateClientProfile(req, res, { db, uid, timelineId, schema }) {
  const { clientProfiles } = schema;
  const [current] = await db
    .select()
    .from(clientProfiles)
    .where(and(eq(clientProfiles.timelineId, timelineId), eq(clientProfiles.ownerId, uid)));
  const expectedVersion = Number(req.body?.expectedVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
    return fail(res, 428, 'expectedVersion is required', 'VERSION_REQUIRED');
  }
  const values = profileToRow(req.body?.profile || req.body);
  await captureVersion(db, schema, {
    timelineId,
    ownerId: uid,
    source: 'client_profile_update',
    summary: 'Before updating the client card',
  });
  if (!current) {
    if (expectedVersion !== 0) return fail(res, 412, 'profile changed', 'VERSION_CONFLICT');
    const [created] = await db
      .insert(clientProfiles)
      .values({ timelineId, ownerId: uid, ...values })
      .returning();
    await logActivity(db, schema, {
      timelineId,
      ownerId: uid,
      action: 'client_profile.updated',
    });
    return ok(
      res,
      { timelineId, profile: rowToClientProfile(created), profileVersion: created.version },
      201,
    );
  }
  const [updated] = await db
    .update(clientProfiles)
    .set({ ...values, version: sql`${clientProfiles.version} + 1`, updatedAt: new Date() })
    .where(
      and(
        eq(clientProfiles.timelineId, timelineId),
        eq(clientProfiles.ownerId, uid),
        eq(clientProfiles.version, expectedVersion),
      ),
    )
    .returning();
  if (!updated) return fail(res, 412, 'profile changed', 'VERSION_CONFLICT');
  await logActivity(db, schema, {
    timelineId,
    ownerId: uid,
    action: 'client_profile.updated',
  });
  return ok(res, {
    timelineId,
    profile: rowToClientProfile(updated),
    profileVersion: updated.version,
  });
}

export async function importFocl(req, res, { db, uid, timelineId, schema }) {
  try {
    return ok(
      res,
      await applyFoclPayload(db, schema, {
        ownerId: uid,
        timelineId,
        payload: req.body?.payload || req.body,
      }),
    );
  } catch (error) {
    if (error instanceof FoclImportError) {
      return fail(res, error.status, error.message, error.code);
    }
    throw error;
  }
}

export async function updatePhotographerReview(req, res, { db, uid, timelineId, schema }) {
  const { timelineReviews, timelineComments } = schema;
  const commentId = String(req.body?.commentId || '');
  const status = req.body?.status === 'resolved' ? 'resolved' : 'open';
  if (commentId) {
    const [updated] = await db
      .update(timelineComments)
      .set({ status, resolvedAt: status === 'resolved' ? new Date() : null })
      .where(and(eq(timelineComments.id, commentId), eq(timelineComments.timelineId, timelineId)))
      .returning({ id: timelineComments.id });
    if (!updated) return fail(res, 404, 'comment not found', 'NOT_FOUND');
    await logActivity(db, schema, {
      timelineId,
      ownerId: uid,
      action: status === 'resolved' ? 'review.comment_resolved' : 'review.comment_reopened',
      metadata: { commentId },
    });
  } else if (req.body?.resetReview) {
    await db
      .insert(timelineReviews)
      .values({ timelineId, status: 'open' })
      .onConflictDoUpdate({
        target: timelineReviews.timelineId,
        set: { status: 'open', decidedBy: null, decidedAt: null, updatedAt: new Date() },
      });
    await logActivity(db, schema, {
      timelineId,
      ownerId: uid,
      action: 'review.reopened',
    });
  } else {
    return fail(res, 422, 'commentId or resetReview is required');
  }

  const [[review], comments] = await Promise.all([
    db.select().from(timelineReviews).where(eq(timelineReviews.timelineId, timelineId)),
    db
      .select()
      .from(timelineComments)
      .where(eq(timelineComments.timelineId, timelineId))
      .orderBy(desc(timelineComments.createdAt)),
  ]);
  return ok(res, {
    timelineId,
    review: {
      status: review?.status || 'open',
      decidedBy: review?.decidedBy || '',
      decidedAt: review?.decidedAt || null,
      comments,
    },
  });
}
