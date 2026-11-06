import { desc, eq, sql } from 'drizzle-orm';
import { getDb, schema } from '../_lib/db.js';
import { requireUser } from '../_lib/auth.js';
import { ok, fail, methodNotAllowed } from '../_lib/respond.js';
import { withErrorCapture } from '../_lib/observability.js';
import {
  sanitizeWorkflowTemplate,
  workflowTemplateFromRow,
  workflowTemplateToRow,
} from '../../src/features/journey/workflow-templates.js';

async function handler(req, res) {
  const uid = await requireUser(req, res);
  if (!uid) return;
  const db = getDb();
  const { templates } = schema;

  if (req.method === 'GET') {
    const rows = await db
      .select()
      .from(templates)
      .where(eq(templates.ownerId, uid))
      .orderBy(desc(templates.isDefault), desc(templates.updatedAt));
    return ok(res, { templates: rows.map(workflowTemplateFromRow) });
  }

  if (req.method === 'POST') {
    const template = sanitizeWorkflowTemplate(req.body);
    if (!template.name) return fail(res, 422, 'template name is required');
    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(templates)
      .where(eq(templates.ownerId, uid));
    if (Number(count) >= 24) return fail(res, 409, 'template limit reached');
    const makeDefault = template.isDefault || Number(count) === 0;
    if (makeDefault) {
      await db.update(templates).set({ isDefault: false }).where(eq(templates.ownerId, uid));
    }
    const [created] = await db
      .insert(templates)
      .values({
        ...workflowTemplateToRow({ ...template, isDefault: makeDefault }),
        ownerId: uid,
        isDefault: makeDefault,
      })
      .returning();
    return ok(res, { template: workflowTemplateFromRow(created) }, 201);
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}

export default withErrorCapture(handler);
