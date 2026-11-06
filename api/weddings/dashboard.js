import { getDb, schema } from '../_lib/db.js';
import { requireUser } from '../_lib/auth.js';
import { ok, methodNotAllowed } from '../_lib/respond.js';
import { withErrorCapture } from '../_lib/observability.js';
import { buildDashboard } from '../_lib/dashboard.js';

async function handler(req, res) {
  const uid = await requireUser(req, res);
  if (!uid) return;
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  return ok(res, await buildDashboard(getDb(), schema, uid));
}

export default withErrorCapture(handler);
