import { and, eq, inArray, isNull } from 'drizzle-orm';
import { getDb, schema } from '../_lib/db.js';
import { requireUser } from '../_lib/auth.js';
import { ok, fail, methodNotAllowed } from '../_lib/respond.js';
import { withErrorCapture } from '../_lib/observability.js';
import { buildDashboard } from '../_lib/dashboard.js';
import { listNotifications, reconcileOverdueNotifications } from '../_lib/notifications.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function handler(req, res) {
  const uid = await requireUser(req, res);
  if (!uid) return;
  const db = getDb();
  const { notifications } = schema;

  if (req.method === 'GET') {
    const dashboard = await buildDashboard(db, schema, uid);
    await reconcileOverdueNotifications(db, schema, uid, dashboard.weddings);
    return ok(res, await listNotifications(db, schema, uid));
  }

  if (req.method === 'POST') {
    const action = req.body?.action;
    if (action === 'mark_all_read') {
      await db
        .update(notifications)
        .set({ readAt: new Date(), updatedAt: new Date() })
        .where(and(eq(notifications.ownerId, uid), isNull(notifications.readAt)));
      return ok(res, { unreadCount: 0 });
    }
    if (action === 'mark_read') {
      const ids = Array.isArray(req.body?.ids)
        ? req.body.ids
            .map(String)
            .filter((id) => UUID_RE.test(id))
            .slice(0, 100)
        : [];
      if (!ids.length) return fail(res, 422, 'notification ids are required');
      const updated = await db
        .update(notifications)
        .set({ readAt: new Date(), updatedAt: new Date() })
        .where(and(eq(notifications.ownerId, uid), inArray(notifications.id, ids)))
        .returning({ id: notifications.id });
      return ok(res, { read: updated.map((item) => item.id) });
    }
    return fail(res, 422, 'valid notification action is required');
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}

export default withErrorCapture(handler);
