import { and, desc, eq, ne, sql } from 'drizzle-orm';
import { getDb, schema } from '../_lib/db.js';
import { requireUser } from '../_lib/auth.js';
import { ok, fail, methodNotAllowed } from '../_lib/respond.js';
import { withErrorCapture } from '../_lib/observability.js';
import { captureVersion, logActivity } from '../_lib/history.js';
import { journeyToRow, rowToJourney } from '../_lib/journey-row.js';
import { rowToState } from '../../src/lib/row-mapper.js';
import {
  applyWorkflowTemplate,
  sanitizeWorkflowTemplate,
  workflowTemplateFromRow,
  workflowTemplateToRow,
} from '../../src/features/journey/workflow-templates.js';

async function handler(req, res) {
  const uid = await requireUser(req, res);
  if (!uid) return;
  const db = getDb();
  const { templates, timelines, clientJourneys } = schema;
  const id = req.query.id;
  const [row] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, id), eq(templates.ownerId, uid)));
  if (!row) return fail(res, 404, 'template not found', 'NOT_FOUND');

  if (req.method === 'PUT') {
    const template = sanitizeWorkflowTemplate({ ...req.body, id });
    if (!template.name) return fail(res, 422, 'template name is required');
    const makeDefault = template.isDefault || row.isDefault;
    if (makeDefault) {
      await db
        .update(templates)
        .set({ isDefault: false })
        .where(and(eq(templates.ownerId, uid), ne(templates.id, id)));
    }
    const [updated] = await db
      .update(templates)
      .set(workflowTemplateToRow({ ...template, isDefault: makeDefault }))
      .where(and(eq(templates.id, id), eq(templates.ownerId, uid)))
      .returning();
    return ok(res, { template: workflowTemplateFromRow(updated) });
  }

  if (req.method === 'DELETE') {
    await db.delete(templates).where(and(eq(templates.id, id), eq(templates.ownerId, uid)));
    if (row.isDefault) {
      const [next] = await db
        .select({ id: templates.id })
        .from(templates)
        .where(eq(templates.ownerId, uid))
        .orderBy(desc(templates.updatedAt))
        .limit(1);
      if (next) await db.update(templates).set({ isDefault: true }).where(eq(templates.id, next.id));
    }
    return ok(res, { deleted: true });
  }

  if (req.method === 'POST' && req.body?.action === 'apply') {
    const timelineId = String(req.body?.timelineId || '');
    const [project] = await db
      .select()
      .from(timelines)
      .where(and(eq(timelines.id, timelineId), eq(timelines.ownerId, uid)));
    if (!project) return fail(res, 404, 'timeline not found', 'NOT_FOUND');
    const [journeyRow] = await db
      .select()
      .from(clientJourneys)
      .where(and(eq(clientJourneys.timelineId, timelineId), eq(clientJourneys.ownerId, uid)));
    await captureVersion(db, schema, {
      timelineId,
      ownerId: uid,
      source: 'workflow_template',
      summary: `Before applying ${row.name}`,
      force: true,
    });
    const template = workflowTemplateFromRow(row);
    const applied = applyWorkflowTemplate(rowToState(project, []), rowToJourney(journeyRow), template);
    await db
      .update(timelines)
      .set({
        templateId: row.id,
        delw: Number(applied.project.delw),
        sendDays: Number(applied.project.sendDays),
        termDays: Number(applied.project.termDays),
        tEngage: applied.project.tEngage,
        tAlbum: applied.project.tAlbum,
        updatedAt: new Date(),
        version: sql`${timelines.version} + 1`,
      })
      .where(and(eq(timelines.id, timelineId), eq(timelines.ownerId, uid)));
    const journeyValues = journeyToRow(applied.journey);
    await db
      .insert(clientJourneys)
      .values({ timelineId, ownerId: uid, ...journeyValues })
      .onConflictDoUpdate({
        target: clientJourneys.timelineId,
        set: {
          ...journeyValues,
          updatedAt: new Date(),
          version: sql`${clientJourneys.version} + 1`,
        },
      });
    await logActivity(db, schema, {
      timelineId,
      ownerId: uid,
      action: 'template.applied',
      metadata: { templateId: row.id, templateName: row.name },
    });
    return ok(res, { applied: true, template: workflowTemplateFromRow(row) });
  }

  return methodNotAllowed(res, ['PUT', 'POST', 'DELETE']);
}

export default withErrorCapture(handler);
