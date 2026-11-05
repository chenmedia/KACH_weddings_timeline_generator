import { and, desc, eq, inArray } from 'drizzle-orm';
import { getDb, schema } from '../_lib/db.js';
import { requireUser } from '../_lib/auth.js';
import { ok, methodNotAllowed } from '../_lib/respond.js';
import { withErrorCapture } from '../_lib/observability.js';
import { rowToJourney } from '../_lib/journey-row.js';
import { rowToState } from '../../src/lib/row-mapper.js';
import { getMilestones } from '../../src/lib/milestones.js';
import { journeySummary } from '../../src/features/journey/model.js';
import nb from '../../src/locales/nb.js';
import { toISO } from '../../src/lib/dates.js';

function urgencyRank(value) {
  return value === 'overdue' ? 0 : value === 'today' ? 1 : value === 'upcoming' ? 2 : 3;
}

async function handler(req, res) {
  const uid = await requireUser(req, res);
  if (!uid) return;
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const db = getDb();
  const { timelines, milestoneOverrides, clientJourneys } = schema;
  const rows = await db
    .select()
    .from(timelines)
    .where(eq(timelines.ownerId, uid))
    .orderBy(desc(timelines.wdate));
  if (!rows.length) {
    return ok(res, {
      summary: { weddingCount: 0, needsAttentionCount: 0, nextWeddingDate: '' },
      weddings: [],
    });
  }

  const ids = rows.map((row) => row.id);
  const [overrideRows, journeyRows] = await Promise.all([
    db.select().from(milestoneOverrides).where(inArray(milestoneOverrides.timelineId, ids)),
    db
      .select()
      .from(clientJourneys)
      .where(and(inArray(clientJourneys.timelineId, ids), eq(clientJourneys.ownerId, uid))),
  ]);
  const overridesByTimeline = groupBy(overrideRows, (row) => row.timelineId);
  const journeyByTimeline = new Map(journeyRows.map((row) => [row.timelineId, row]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = toISO(today);

  const weddings = rows.map((row) => {
    const project = rowToState(row, overridesByTimeline.get(row.id) || []);
    const milestones = getMilestones(project, nb);
    const summary = journeySummary(project, milestones, rowToJourney(journeyByTimeline.get(row.id)), today);
    return {
      id: row.id,
      couple: row.couple || '',
      weddingDate: project.wdate,
      location: project.place,
      status: row.status || 'lead',
      ...summary,
    };
  });
  weddings.sort((a, b) => {
    const rank = urgencyRank(a.nextActionTiming) - urgencyRank(b.nextActionTiming);
    if (rank) return rank;
    const actionDate = (a.nextActionDate || '9999-12-31').localeCompare(b.nextActionDate || '9999-12-31');
    return actionDate || (a.weddingDate || '').localeCompare(b.weddingDate || '');
  });
  const nextWeddingDate =
    rows
      .map((row) => String(row.wdate || '').slice(0, 10))
      .filter((date) => date >= todayISO)
      .sort()[0] || '';

  return ok(res, {
    summary: {
      weddingCount: weddings.length,
      needsAttentionCount: weddings.filter((item) => ['overdue', 'today'].includes(item.nextActionTiming))
        .length,
      nextWeddingDate,
    },
    weddings,
  });
}

function groupBy(values, key) {
  const map = new Map();
  for (const value of values) {
    const group = key(value);
    map.set(group, [...(map.get(group) || []), value]);
  }
  return map;
}

export default withErrorCapture(handler);
