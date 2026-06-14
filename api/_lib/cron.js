// Cron endpoints are guarded by a shared secret. Vercel Cron sends
// `Authorization: Bearer <CRON_SECRET>` automatically when CRON_SECRET is set.
export function authorizeCron(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (req.headers.authorization || '') === `Bearer ${secret}`;
}
