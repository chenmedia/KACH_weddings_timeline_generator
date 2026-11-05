import { and, eq } from 'drizzle-orm';
import { getDb, schema } from '../../_lib/db.js';
import { requireUser } from '../../_lib/auth.js';
import { ok, fail, methodNotAllowed } from '../../_lib/respond.js';
import { withErrorCapture } from '../../_lib/observability.js';
import { rowToJourney } from '../../_lib/journey-row.js';
import { rowToState } from '../../../src/lib/row-mapper.js';
import { getMilestones } from '../../../src/lib/milestones.js';
import nb from '../../../src/locales/nb.js';
import en from '../../../src/locales/en.js';

async function handler(req, res) {
  const uid = await requireUser(req, res);
  if (!uid) return;
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const db = getDb();
  const { timelines, milestoneOverrides, clientJourneys } = schema;
  const timelineId = req.query.timelineId;
  const [row] = await db
    .select()
    .from(timelines)
    .where(and(eq(timelines.id, timelineId), eq(timelines.ownerId, uid)));
  if (!row) return fail(res, 404, 'not found', 'NOT_FOUND');

  const [overrideRows, journeyRows] = await Promise.all([
    db.select().from(milestoneOverrides).where(eq(milestoneOverrides.timelineId, timelineId)),
    db
      .select()
      .from(clientJourneys)
      .where(and(eq(clientJourneys.timelineId, timelineId), eq(clientJourneys.ownerId, uid))),
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
  });
}

export default withErrorCapture(handler);
