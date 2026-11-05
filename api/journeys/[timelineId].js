import { and, eq, sql } from 'drizzle-orm';
import { getDb, schema } from '../_lib/db.js';
import { requireUser } from '../_lib/auth.js';
import { ok, fail, methodNotAllowed } from '../_lib/respond.js';
import { withErrorCapture } from '../_lib/observability.js';
import { journeyToRow, rowToJourney } from '../_lib/journey-row.js';
import { importFocl, updateClientProfile, updatePhotographerReview } from '../_lib/client-actions.js';
import { captureVersion, logActivity, restoreVersion } from '../_lib/history.js';

async function handler(req, res) {
  const uid = await requireUser(req, res);
  if (!uid) return;
  const db = getDb();
  const { timelines, clientJourneys } = schema;
  const timelineId = req.query.timelineId;

  const [project] = await db
    .select({ id: timelines.id })
    .from(timelines)
    .where(and(eq(timelines.id, timelineId), eq(timelines.ownerId, uid)));
  if (!project) return fail(res, 404, 'not found', 'NOT_FOUND');

  const actionContext = { db, uid, timelineId, schema };
  if (req.method === 'PUT' && req.body?.resource === 'client_profile') {
    return updateClientProfile(req, res, actionContext);
  }
  if (req.method === 'POST' && req.body?.action === 'focl_import') {
    return importFocl(req, res, actionContext);
  }
  if (req.method === 'POST' && req.body?.action === 'create_version') {
    const version = await captureVersion(db, schema, {
      timelineId,
      ownerId: uid,
      source: 'manual',
      summary: String(req.body?.summary || 'Manual checkpoint').slice(0, 200),
      force: true,
    });
    await logActivity(db, schema, {
      timelineId,
      ownerId: uid,
      action: 'version.created',
      metadata: { sequence: version?.sequence },
    });
    return ok(res, {
      version: version
        ? {
            id: version.id,
            sequence: version.sequence,
            source: version.source,
            summary: version.summary,
            createdAt: version.createdAt,
          }
        : null,
    });
  }
  if (req.method === 'POST' && req.body?.action === 'restore_version') {
    const version = await restoreVersion(db, schema, {
      timelineId,
      ownerId: uid,
      versionId: String(req.body?.versionId || ''),
    });
    if (!version) return fail(res, 404, 'version not found', 'NOT_FOUND');
    await logActivity(db, schema, {
      timelineId,
      ownerId: uid,
      action: 'version.restored',
      metadata: { sequence: version.sequence },
    });
    return ok(res, { restored: true, sequence: version.sequence });
  }
  if (req.method === 'PATCH') {
    return updatePhotographerReview(req, res, actionContext);
  }

  const [current] = await db
    .select()
    .from(clientJourneys)
    .where(and(eq(clientJourneys.timelineId, timelineId), eq(clientJourneys.ownerId, uid)));

  if (req.method === 'GET') {
    return ok(res, { timelineId, journey: rowToJourney(current), journeyVersion: current?.version || 0 });
  }

  if (req.method === 'PUT') {
    const body = req.body || {};
    const expectedVersion = Number(body.expectedVersion);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
      return fail(res, 428, 'expectedVersion is required', 'VERSION_REQUIRED');
    }
    const values = journeyToRow(body.journey || body);
    await captureVersion(db, schema, {
      timelineId,
      ownerId: uid,
      source: 'journey_update',
      summary: 'Before updating the client journey',
    });

    if (!current) {
      if (expectedVersion !== 0) {
        return fail(res, 412, 'journey changed in another session', 'VERSION_CONFLICT');
      }
      const [created] = await db
        .insert(clientJourneys)
        .values({ timelineId, ownerId: uid, ...values })
        .returning();
      await logActivity(db, schema, { timelineId, ownerId: uid, action: 'journey.updated' });
      return ok(res, { timelineId, journey: rowToJourney(created), journeyVersion: created.version }, 201);
    }

    const [updated] = await db
      .update(clientJourneys)
      .set({ ...values, version: sql`${clientJourneys.version} + 1`, updatedAt: new Date() })
      .where(
        and(
          eq(clientJourneys.timelineId, timelineId),
          eq(clientJourneys.ownerId, uid),
          eq(clientJourneys.version, expectedVersion),
        ),
      )
      .returning();
    if (!updated) return fail(res, 412, 'journey changed in another session', 'VERSION_CONFLICT');
    await logActivity(db, schema, { timelineId, ownerId: uid, action: 'journey.updated' });
    return ok(res, { timelineId, journey: rowToJourney(updated), journeyVersion: updated.version });
  }

  return methodNotAllowed(res, ['GET', 'PUT', 'POST', 'PATCH']);
}

export default withErrorCapture(handler);
