import { and, desc, eq, sql } from 'drizzle-orm';
import { rowToJourney, journeyToRow } from './journey-row.js';
import { rowToClientProfile } from './client-profile-row.js';
import { overridesToRows, rowToState, stateToRow } from '../../src/lib/row-mapper.js';

export async function logActivity(
  db,
  schema,
  { timelineId, ownerId, actorType = 'owner', actorName = null, action, itemKey = null, metadata = {} },
) {
  if (actorType !== 'couple') {
    const [latest] = await db
      .select()
      .from(schema.weddingActivityEvents)
      .where(
        and(
          eq(schema.weddingActivityEvents.timelineId, timelineId),
          eq(schema.weddingActivityEvents.ownerId, ownerId),
          eq(schema.weddingActivityEvents.action, action),
        ),
      )
      .orderBy(desc(schema.weddingActivityEvents.createdAt))
      .limit(1);
    const age = latest?.createdAt ? Date.now() - new Date(latest.createdAt).getTime() : Infinity;
    if (latest && age < 2 * 60 * 1000) {
      await db
        .update(schema.weddingActivityEvents)
        .set({ metadata, itemKey, createdAt: new Date() })
        .where(eq(schema.weddingActivityEvents.id, latest.id));
      return latest;
    }
  }
  await db.insert(schema.weddingActivityEvents).values({
    timelineId,
    ownerId,
    actorType,
    actorName,
    action,
    itemKey,
    metadata,
  });
}

async function weddingSnapshot(db, schema, timelineId, ownerId) {
  const { timelines, milestoneOverrides, clientJourneys, clientProfiles } = schema;
  const [[project], overrides, [journey], [profile]] = await Promise.all([
    db
      .select()
      .from(timelines)
      .where(and(eq(timelines.id, timelineId), eq(timelines.ownerId, ownerId))),
    db.select().from(milestoneOverrides).where(eq(milestoneOverrides.timelineId, timelineId)),
    db
      .select()
      .from(clientJourneys)
      .where(and(eq(clientJourneys.timelineId, timelineId), eq(clientJourneys.ownerId, ownerId))),
    db
      .select()
      .from(clientProfiles)
      .where(and(eq(clientProfiles.timelineId, timelineId), eq(clientProfiles.ownerId, ownerId))),
  ]);
  if (!project) return null;
  return {
    project: { ...rowToState(project, overrides), status: project.status || 'lead' },
    journey: rowToJourney(journey),
    profile: rowToClientProfile(profile),
  };
}

export async function captureVersion(
  db,
  schema,
  { timelineId, ownerId, source = 'automatic', summary = null, force = false },
) {
  const snapshot = await weddingSnapshot(db, schema, timelineId, ownerId);
  if (!snapshot) return null;
  const [latest] = await db
    .select()
    .from(schema.weddingVersions)
    .where(eq(schema.weddingVersions.timelineId, timelineId))
    .orderBy(desc(schema.weddingVersions.sequence))
    .limit(1);
  if (!force && latest && JSON.stringify(latest.snapshot) === JSON.stringify(snapshot)) return latest;
  const latestAge = latest?.createdAt ? Date.now() - new Date(latest.createdAt).getTime() : Infinity;
  if (!force && latest?.source === source && latestAge < 5 * 60 * 1000) return latest;
  const sequence = (latest?.sequence || 0) + 1;
  const [created] = await db
    .insert(schema.weddingVersions)
    .values({ timelineId, ownerId, sequence, source, summary, snapshot })
    .returning();
  return created;
}

export async function listHistory(db, schema, timelineId, ownerId) {
  const [activity, versions] = await Promise.all([
    db
      .select()
      .from(schema.weddingActivityEvents)
      .where(
        and(
          eq(schema.weddingActivityEvents.timelineId, timelineId),
          eq(schema.weddingActivityEvents.ownerId, ownerId),
        ),
      )
      .orderBy(desc(schema.weddingActivityEvents.createdAt))
      .limit(80),
    db
      .select({
        id: schema.weddingVersions.id,
        sequence: schema.weddingVersions.sequence,
        source: schema.weddingVersions.source,
        summary: schema.weddingVersions.summary,
        createdAt: schema.weddingVersions.createdAt,
      })
      .from(schema.weddingVersions)
      .where(
        and(eq(schema.weddingVersions.timelineId, timelineId), eq(schema.weddingVersions.ownerId, ownerId)),
      )
      .orderBy(desc(schema.weddingVersions.sequence))
      .limit(40),
  ]);
  return { activity, versions };
}

export async function restoreVersion(db, schema, { timelineId, ownerId, versionId }) {
  const { weddingVersions, timelines, milestoneOverrides, clientJourneys, clientProfiles } = schema;
  const [version] = await db
    .select()
    .from(weddingVersions)
    .where(
      and(
        eq(weddingVersions.id, versionId),
        eq(weddingVersions.timelineId, timelineId),
        eq(weddingVersions.ownerId, ownerId),
      ),
    );
  if (!version?.snapshot?.project) return null;

  await captureVersion(db, schema, {
    timelineId,
    ownerId,
    source: 'before_restore',
    summary: `Before restoring version ${version.sequence}`,
    force: true,
  });

  const snapshot = version.snapshot;
  await db
    .update(timelines)
    .set({
      ...stateToRow(snapshot.project),
      status: snapshot.project.status || 'lead',
      updatedAt: new Date(),
      version: sql`${timelines.version} + 1`,
    })
    .where(and(eq(timelines.id, timelineId), eq(timelines.ownerId, ownerId)));

  await db.delete(milestoneOverrides).where(eq(milestoneOverrides.timelineId, timelineId));
  const overrideRows = overridesToRows(timelineId, snapshot.project);
  if (overrideRows.length) await db.insert(milestoneOverrides).values(overrideRows);

  const journeyValues = journeyToRow(snapshot.journey || {});
  await db
    .insert(clientJourneys)
    .values({ timelineId, ownerId, ...journeyValues })
    .onConflictDoUpdate({
      target: clientJourneys.timelineId,
      set: {
        ...journeyValues,
        version: sql`${clientJourneys.version} + 1`,
        updatedAt: new Date(),
      },
    });

  const profile = snapshot.profile || {};
  await db
    .insert(clientProfiles)
    .values({
      timelineId,
      ownerId,
      data: profile.data || {},
      source: profile.source || 'manual',
      sourceId: profile.sourceId || null,
      sourceUrl: profile.sourceUrl || null,
      syncStatus: profile.syncStatus || 'not_connected',
      lastSyncedAt: profile.lastSyncedAt || null,
    })
    .onConflictDoUpdate({
      target: clientProfiles.timelineId,
      set: {
        data: profile.data || {},
        source: profile.source || 'manual',
        sourceId: profile.sourceId || null,
        sourceUrl: profile.sourceUrl || null,
        syncStatus: profile.syncStatus || 'not_connected',
        lastSyncedAt: profile.lastSyncedAt || null,
        version: sql`${clientProfiles.version} + 1`,
        updatedAt: new Date(),
      },
    });

  return version;
}
