import { and, desc, eq, sql } from 'drizzle-orm';
import { normalizeFoclImport } from '../../src/lib/client-profile.js';
import { profileToRow, rowToClientProfile } from './client-profile-row.js';
import { ok, fail } from './respond.js';
import { captureVersion, logActivity } from './history.js';
import { createNotification, resolveNotifications } from './notifications.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

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

export async function importFocl(req, res, { db, uid, timelineId, couple, schema }) {
  const { timelines, clientJourneys, clientProfiles } = schema;
  const [current] = await db
    .select()
    .from(clientProfiles)
    .where(and(eq(clientProfiles.timelineId, timelineId), eq(clientProfiles.ownerId, uid)));
  const normalized = normalizeFoclImport(req.body?.payload || req.body);
  const hasUsefulData =
    normalized.sourceId ||
    normalized.sourceUrl ||
    normalized.project.couple ||
    normalized.profile.partners.some((partner) => partner.name);
  if (!hasUsefulData) {
    await createNotification(db, schema, {
      ownerId: uid,
      timelineId,
      kind: 'sync.failed',
      dedupeKey: `sync.failed:${timelineId}:${new Date().toISOString().slice(0, 13)}`,
      payload: { couple: couple || '', provider: 'FOCL', targetTab: 'client' },
      reopen: true,
    });
    return fail(res, 422, 'FOCL payload contains no recognizable wedding data');
  }

  await captureVersion(db, schema, {
    timelineId,
    ownerId: uid,
    source: 'focl_import',
    summary: 'Before importing from FOCL',
  });

  const now = new Date();
  let savedProfile;
  if (current) {
    [savedProfile] = await db
      .update(clientProfiles)
      .set({
        data: normalized.profile,
        source: 'focl-chatgpt',
        sourceId: normalized.sourceId || current.sourceId,
        sourceUrl: normalized.sourceUrl || current.sourceUrl,
        syncStatus: 'synced',
        lastSyncedAt: now,
        version: sql`${clientProfiles.version} + 1`,
        updatedAt: now,
      })
      .where(and(eq(clientProfiles.timelineId, timelineId), eq(clientProfiles.ownerId, uid)))
      .returning();
  } else {
    [savedProfile] = await db
      .insert(clientProfiles)
      .values({
        timelineId,
        ownerId: uid,
        data: normalized.profile,
        source: 'focl-chatgpt',
        sourceId: normalized.sourceId || null,
        sourceUrl: normalized.sourceUrl || null,
        syncStatus: 'synced',
        lastSyncedAt: now,
      })
      .returning();
  }

  const projectPatch = { updatedAt: now, version: sql`${timelines.version} + 1` };
  if (normalized.project.couple) projectPatch.couple = normalized.project.couple;
  if (ISO_DATE.test(normalized.project.wdate)) projectPatch.wdate = normalized.project.wdate;
  if (ISO_DATE.test(normalized.project.bdate)) projectPatch.bdate = normalized.project.bdate;
  if (normalized.project.place) projectPatch.place = normalized.project.place;
  const [updatedProject] = await db
    .update(timelines)
    .set(projectPatch)
    .where(and(eq(timelines.id, timelineId), eq(timelines.ownerId, uid)))
    .returning({
      couple: timelines.couple,
      wdate: timelines.wdate,
      bdate: timelines.bdate,
      place: timelines.place,
      projectVersion: timelines.version,
    });

  if (normalized.sourceUrl) {
    await db
      .insert(clientJourneys)
      .values({ timelineId, ownerId: uid, foclUrl: normalized.sourceUrl })
      .onConflictDoUpdate({
        target: clientJourneys.timelineId,
        set: { foclUrl: normalized.sourceUrl, updatedAt: now },
      });
  }

  await logActivity(db, schema, {
    timelineId,
    ownerId: uid,
    action: 'focl.imported',
    metadata: {
      partners: normalized.profile.partners.length,
      vendors: normalized.profile.vendors.length,
      timelineItems: normalized.profile.foclTimeline.length,
    },
  });
  await resolveNotifications(db, schema, {
    ownerId: uid,
    timelineId,
    kind: 'sync.failed',
  });

  return ok(res, {
    timelineId,
    profile: rowToClientProfile(savedProfile),
    profileVersion: savedProfile.version,
    project: updatedProject,
    imported: {
      partners: normalized.profile.partners.length,
      vendors: normalized.profile.vendors.length,
      timelineItems: normalized.profile.foclTimeline.length,
    },
  });
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
