import { and, eq, sql } from 'drizzle-orm';
import { normalizeFoclImport } from '../../src/lib/client-profile.js';
import { prepareFoclImport, prepareNormalizedFoclImport } from '../../src/lib/focl-sync.js';
import { rowToClientProfile } from './client-profile-row.js';
import { captureVersion, logActivity } from './history.js';
import { resolveNotifications } from './notifications.js';

const PREVIEW_TTL_MS = 30 * 60 * 1000;

export class FoclImportError extends Error {
  constructor(message, code = 'FOCL_IMPORT_FAILED', status = 422) {
    super(message);
    this.name = 'FoclImportError';
    this.code = code;
    this.status = status;
  }
}

async function loadImportTarget(db, schema, ownerId, timelineId) {
  const { timelines, clientProfiles } = schema;
  const [[project], [profile]] = await Promise.all([
    db
      .select()
      .from(timelines)
      .where(and(eq(timelines.id, timelineId), eq(timelines.ownerId, ownerId))),
    db
      .select()
      .from(clientProfiles)
      .where(and(eq(clientProfiles.timelineId, timelineId), eq(clientProfiles.ownerId, ownerId))),
  ]);
  if (!project) throw new FoclImportError('Wedding not found', 'NOT_FOUND', 404);
  return { project, profile };
}

export async function listKachWeddings(db, schema, ownerId) {
  const { timelines, clientProfiles } = schema;
  const rows = await db
    .select({
      id: timelines.id,
      couple: timelines.couple,
      weddingDate: timelines.wdate,
      location: timelines.place,
      status: timelines.status,
      projectVersion: timelines.version,
      profileVersion: clientProfiles.version,
      foclSourceId: clientProfiles.sourceId,
      syncStatus: clientProfiles.syncStatus,
      lastSyncedAt: clientProfiles.lastSyncedAt,
    })
    .from(timelines)
    .leftJoin(
      clientProfiles,
      and(eq(clientProfiles.timelineId, timelines.id), eq(clientProfiles.ownerId, ownerId)),
    )
    .where(eq(timelines.ownerId, ownerId));
  return rows.map((row) => ({
    ...row,
    weddingDate: String(row.weddingDate || ''),
    profileVersion: row.profileVersion || 0,
    syncStatus: row.syncStatus || 'not_connected',
    lastSyncedAt: row.lastSyncedAt ? new Date(row.lastSyncedAt).toISOString() : null,
  }));
}

export async function previewFoclImport(db, schema, { ownerId, timelineId, payload }) {
  const { foclImportSessions } = schema;
  const { project, profile } = await loadImportTarget(db, schema, ownerId, timelineId);
  let prepared;
  try {
    prepared = prepareFoclImport(payload, profile?.data, project);
  } catch (error) {
    throw new FoclImportError(error.message);
  }
  const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS);
  const [session] = await db
    .insert(foclImportSessions)
    .values({
      timelineId,
      ownerId,
      sourceId: prepared.normalized.sourceId || null,
      payload: prepared.normalized,
      changes: prepared.changes,
      expectedProjectVersion: project.version,
      expectedProfileVersion: profile?.version || 0,
      expiresAt,
    })
    .returning();
  return {
    sessionId: session.id,
    expiresAt: expiresAt.toISOString(),
    wedding: { id: project.id, couple: project.couple, weddingDate: String(project.wdate || '') },
    changes: prepared.changes,
    counts: prepared.counts,
  };
}

export async function applyFoclPayload(
  db,
  schema,
  { ownerId, timelineId, payload, expectedProjectVersion, expectedProfileVersion },
) {
  const { timelines, clientJourneys, clientProfiles } = schema;
  const { project: currentProject, profile: currentProfile } = await loadImportTarget(
    db,
    schema,
    ownerId,
    timelineId,
  );
  if (Number.isInteger(expectedProjectVersion) && currentProject.version !== expectedProjectVersion) {
    throw new FoclImportError(
      'The wedding changed after the FOCL preview. Create a new preview.',
      'VERSION_CONFLICT',
      409,
    );
  }
  if (Number.isInteger(expectedProfileVersion) && (currentProfile?.version || 0) !== expectedProfileVersion) {
    throw new FoclImportError(
      'The client card changed after the FOCL preview. Create a new preview.',
      'VERSION_CONFLICT',
      409,
    );
  }

  const normalized = payload?.profile && payload?.project ? payload : normalizeFoclImport(payload);
  let prepared;
  try {
    prepared = prepareNormalizedFoclImport(normalized, currentProfile?.data, currentProject);
  } catch (error) {
    throw new FoclImportError(error.message);
  }
  await captureVersion(db, schema, {
    timelineId,
    ownerId,
    source: 'focl_import',
    summary: 'Before importing from FOCL',
    force: true,
  });

  const now = new Date();
  const projectPatch = {
    couple: prepared.project.couple,
    wdate: prepared.project.wdate,
    bdate: prepared.project.bdate || null,
    place: prepared.project.place || null,
    updatedAt: now,
    version: sql`${timelines.version} + 1`,
  };
  const projectConditions = [eq(timelines.id, timelineId), eq(timelines.ownerId, ownerId)];
  if (Number.isInteger(expectedProjectVersion)) {
    projectConditions.push(eq(timelines.version, expectedProjectVersion));
  }
  const projectUpdate = db
    .update(timelines)
    .set(projectPatch)
    .where(and(...projectConditions))
    .returning({
      couple: timelines.couple,
      wdate: timelines.wdate,
      bdate: timelines.bdate,
      place: timelines.place,
      projectVersion: timelines.version,
    });

  let profileUpdate;
  if (currentProfile) {
    const profileConditions = [
      eq(clientProfiles.timelineId, timelineId),
      eq(clientProfiles.ownerId, ownerId),
    ];
    if (Number.isInteger(expectedProfileVersion)) {
      profileConditions.push(eq(clientProfiles.version, expectedProfileVersion));
    }
    profileUpdate = db
      .update(clientProfiles)
      .set({
        data: prepared.profile,
        source: 'focl-chatgpt',
        sourceId: normalized.sourceId || currentProfile.sourceId,
        sourceUrl: normalized.sourceUrl || currentProfile.sourceUrl,
        syncStatus: 'synced',
        lastSyncedAt: now,
        version: sql`${clientProfiles.version} + 1`,
        updatedAt: now,
      })
      .where(and(...profileConditions))
      .returning();
  } else {
    profileUpdate = db
      .insert(clientProfiles)
      .values({
        timelineId,
        ownerId,
        data: prepared.profile,
        source: 'focl-chatgpt',
        sourceId: normalized.sourceId || null,
        sourceUrl: normalized.sourceUrl || null,
        syncStatus: 'synced',
        lastSyncedAt: now,
      })
      .returning();
  }
  // Neon HTTP does not expose callback transactions, but Drizzle batch uses
  // Neon's transactional batch API. The project and client card therefore
  // either pass both optimistic version checks or neither write is committed.
  const [[updatedProject], [savedProfile]] = await db.batch([projectUpdate, profileUpdate]);
  if (!updatedProject) {
    throw new FoclImportError('Wedding changed during import', 'VERSION_CONFLICT', 409);
  }
  if (!savedProfile) {
    throw new FoclImportError('Client card changed during import', 'VERSION_CONFLICT', 409);
  }

  if (normalized.sourceUrl) {
    await db
      .insert(clientJourneys)
      .values({ timelineId, ownerId, foclUrl: normalized.sourceUrl })
      .onConflictDoUpdate({
        target: clientJourneys.timelineId,
        set: { foclUrl: normalized.sourceUrl, updatedAt: now },
      });
  }
  await logActivity(db, schema, {
    timelineId,
    ownerId,
    actorType: 'system',
    actorName: 'FOCL via ChatGPT',
    action: 'focl.imported',
    metadata: prepared.counts,
  });
  await resolveNotifications(db, schema, { ownerId, timelineId, kind: 'sync.failed' });

  return {
    timelineId,
    profile: rowToClientProfile(savedProfile),
    profileVersion: savedProfile.version,
    project: updatedProject,
    imported: prepared.counts,
    changes: prepared.changes,
  };
}

export async function applyFoclImportSession(db, schema, { ownerId, sessionId }) {
  const { foclImportSessions } = schema;
  const [session] = await db
    .select()
    .from(foclImportSessions)
    .where(and(eq(foclImportSessions.id, sessionId), eq(foclImportSessions.ownerId, ownerId)));
  if (!session) throw new FoclImportError('Import preview not found', 'NOT_FOUND', 404);
  if (session.status !== 'pending') {
    throw new FoclImportError('Import preview has already been used', 'SESSION_USED', 409);
  }
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    await db
      .update(foclImportSessions)
      .set({ status: 'expired', payload: {} })
      .where(eq(foclImportSessions.id, session.id));
    throw new FoclImportError('Import preview has expired', 'SESSION_EXPIRED', 410);
  }

  const result = await applyFoclPayload(db, schema, {
    ownerId,
    timelineId: session.timelineId,
    payload: session.payload,
    expectedProjectVersion: session.expectedProjectVersion,
    expectedProfileVersion: session.expectedProfileVersion,
  });
  await db
    .update(foclImportSessions)
    .set({ status: 'applied', appliedAt: new Date(), payload: {} })
    .where(and(eq(foclImportSessions.id, session.id), eq(foclImportSessions.status, 'pending')));
  return { ...result, sessionId: session.id };
}
