import { and, eq, sql } from 'drizzle-orm';
import { getDb, schema } from '../_lib/db.js';
import { requireUser } from '../_lib/auth.js';
import { ok, fail, methodNotAllowed } from '../_lib/respond.js';
import { withErrorCapture } from '../_lib/observability.js';
import { profileToRow, rowToClientProfile } from '../_lib/client-profile-row.js';
import { normalizeFoclImport } from '../../src/lib/client-profile.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

async function handler(req, res) {
  const uid = await requireUser(req, res);
  if (!uid) return;
  const db = getDb();
  const { timelines, clientJourneys, clientProfiles } = schema;
  const timelineId = req.query.timelineId;

  const [project] = await db
    .select({ id: timelines.id })
    .from(timelines)
    .where(and(eq(timelines.id, timelineId), eq(timelines.ownerId, uid)));
  if (!project) return fail(res, 404, 'not found', 'NOT_FOUND');

  const [current] = await db
    .select()
    .from(clientProfiles)
    .where(and(eq(clientProfiles.timelineId, timelineId), eq(clientProfiles.ownerId, uid)));

  if (req.method === 'GET') {
    return ok(res, {
      timelineId,
      profile: rowToClientProfile(current),
      profileVersion: current?.version || 0,
    });
  }

  if (req.method === 'PUT') {
    const expectedVersion = Number(req.body?.expectedVersion);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
      return fail(res, 428, 'expectedVersion is required', 'VERSION_REQUIRED');
    }
    const values = profileToRow(req.body?.profile || req.body);
    if (!current) {
      if (expectedVersion !== 0) return fail(res, 412, 'profile changed', 'VERSION_CONFLICT');
      const [created] = await db
        .insert(clientProfiles)
        .values({ timelineId, ownerId: uid, ...values })
        .returning();
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
    return ok(res, {
      timelineId,
      profile: rowToClientProfile(updated),
      profileVersion: updated.version,
    });
  }

  if (req.method === 'POST') {
    const normalized = normalizeFoclImport(req.body?.payload || req.body);
    const hasUsefulData =
      normalized.sourceId ||
      normalized.sourceUrl ||
      normalized.project.couple ||
      normalized.profile.partners.some((partner) => partner.name);
    if (!hasUsefulData) return fail(res, 422, 'FOCL payload contains no recognizable wedding data');

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

  return methodNotAllowed(res, ['GET', 'PUT', 'POST']);
}

export default withErrorCapture(handler);
