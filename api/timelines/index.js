// GET  /api/timelines        → list the current photographer's timelines (summary)
// POST /api/timelines        → create a timeline from a posted `state` object
import { and, desc, eq } from 'drizzle-orm';
import { getDb, schema } from '../_lib/db.js';
import { requireUser } from '../_lib/auth.js';
import { ok, fail, methodNotAllowed, genSlug } from '../_lib/respond.js';
import { withErrorCapture } from '../_lib/observability.js';
import { stateToRow, overridesToRows, rowToState } from '../../src/lib/row-mapper.js';
import { captureVersion, logActivity } from '../_lib/history.js';
import { journeyToRow } from '../_lib/journey-row.js';
import {
  applyWorkflowTemplate,
  workflowTemplateFromRow,
} from '../../src/features/journey/workflow-templates.js';
import { defaultJourney } from '../../src/features/journey/model.js';

async function handler(req, res) {
  const uid = await requireUser(req, res);
  if (!uid) return;
  const db = getDb();
  const { timelines, milestoneOverrides, templates, clientJourneys } = schema;

  if (req.method === 'GET') {
    const rows = await db
      .select({
        id: timelines.id,
        couple: timelines.couple,
        wdate: timelines.wdate,
        status: timelines.status,
        shareSlug: timelines.shareSlug,
        updatedAt: timelines.updatedAt,
      })
      .from(timelines)
      .where(eq(timelines.ownerId, uid))
      .orderBy(desc(timelines.wdate));
    return ok(res, { timelines: rows });
  }

  if (req.method === 'POST') {
    let state = req.body || {};
    if (!state.wdate) return fail(res, 400, 'wdate is required');
    const [defaultTemplate] = await db
      .select()
      .from(templates)
      .where(and(eq(templates.ownerId, uid), eq(templates.isDefault, true)))
      .limit(1);
    let initialJourney = null;
    if (defaultTemplate) {
      const applied = applyWorkflowTemplate(
        state,
        defaultJourney(),
        workflowTemplateFromRow(defaultTemplate),
      );
      state = applied.project;
      initialJourney = applied.journey;
    }
    const row = stateToRow(state);
    const [created] = await db
      .insert(timelines)
      .values({
        ...row,
        ownerId: uid,
        templateId: defaultTemplate?.id || null,
        shareSlug: genSlug(),
        lang: state.lang || 'nb',
      })
      .returning();
    const ovRows = overridesToRows(created.id, state);
    if (ovRows.length) await db.insert(milestoneOverrides).values(ovRows);
    if (initialJourney) {
      await db
        .insert(clientJourneys)
        .values({ timelineId: created.id, ownerId: uid, ...journeyToRow(initialJourney) });
    }
    await captureVersion(db, schema, {
      timelineId: created.id,
      ownerId: uid,
      source: 'created',
      summary: 'Initial version',
      force: true,
    });
    await logActivity(db, schema, {
      timelineId: created.id,
      ownerId: uid,
      action: 'project.created',
    });
    return ok(
      res,
      {
        id: created.id,
        ...rowToState(created, ovRows),
        templateId: created.templateId,
        projectVersion: created.version,
      },
      201,
    );
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}

export default withErrorCapture(handler);
