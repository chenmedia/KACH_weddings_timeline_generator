import { and, desc, eq } from 'drizzle-orm';
import { getDb, schema } from '../../_lib/db.js';
import { requireUser } from '../../_lib/auth.js';
import { ok, fail, methodNotAllowed } from '../../_lib/respond.js';
import { withErrorCapture } from '../../_lib/observability.js';
import { rowToJourney } from '../../_lib/journey-row.js';
import { rowToClientProfile } from '../../_lib/client-profile-row.js';
import { rowToState } from '../../../src/lib/row-mapper.js';
import { getMilestones } from '../../../src/lib/milestones.js';
import nb from '../../../src/locales/nb.js';
import en from '../../../src/locales/en.js';

async function handler(req, res) {
  const uid = await requireUser(req, res);
  if (!uid) return;
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const db = getDb();
  const { timelines, milestoneOverrides, clientJourneys, clientProfiles, timelineReviews, timelineComments } =
    schema;
  const timelineId = req.query.timelineId;
  const [row] = await db
    .select()
    .from(timelines)
    .where(and(eq(timelines.id, timelineId), eq(timelines.ownerId, uid)));
  if (!row) return fail(res, 404, 'not found', 'NOT_FOUND');

  const [overrideRows, journeyRows, profileRows, reviewRows, commentRows] = await Promise.all([
    db.select().from(milestoneOverrides).where(eq(milestoneOverrides.timelineId, timelineId)),
    db
      .select()
      .from(clientJourneys)
      .where(and(eq(clientJourneys.timelineId, timelineId), eq(clientJourneys.ownerId, uid))),
    db
      .select()
      .from(clientProfiles)
      .where(and(eq(clientProfiles.timelineId, timelineId), eq(clientProfiles.ownerId, uid))),
    db.select().from(timelineReviews).where(eq(timelineReviews.timelineId, timelineId)),
    db
      .select()
      .from(timelineComments)
      .where(eq(timelineComments.timelineId, timelineId))
      .orderBy(desc(timelineComments.createdAt)),
  ]);
  const project = {
    ...rowToState(row, overrideRows),
    shareSlug: row.shareSlug,
    shareEnabled: row.shareEnabled,
    shareExpiresAt: row.shareExpiresAt,
    viewCount: row.viewCount || 0,
    lastViewedAt: row.lastViewedAt,
  };
  const journeyRow = journeyRows[0];
  const locale = req.query.locale === 'en' ? en : nb;
  return ok(res, {
    project: { id: timelineId, ...project, status: row.status || 'lead' },
    projectVersion: row.version,
    milestones: getMilestones(project, locale),
    journey: rowToJourney(journeyRow),
    journeyVersion: journeyRow?.version || 0,
    profile: rowToClientProfile(profileRows[0]),
    profileVersion: profileRows[0]?.version || 0,
    review: {
      status: reviewRows[0]?.status || 'open',
      decidedBy: reviewRows[0]?.decidedBy || '',
      decidedAt: reviewRows[0]?.decidedAt || null,
      comments: commentRows,
    },
  });
}

export default withErrorCapture(handler);
