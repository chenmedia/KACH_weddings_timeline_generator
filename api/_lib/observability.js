// Server-side error reporting via Sentry (@sentry/node). Opt-in: with no
// SENTRY_DSN it is inert. Errors are tracked in Sentry's dashboard.
import * as Sentry from '@sentry/node';

const DSN = process.env.SENTRY_DSN || '';
let started = false;

(function init() {
  if (!DSN || started) return;
  started = true;
  try {
    Sentry.init({
      dsn: DSN,
      environment: process.env.VERCEL_ENV || 'development',
      release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
      tracesSampleRate: 0,
      sendDefaultPii: false,
    });
  } catch {
    /* never let observability break a request */
  }
})();

export function captureServerError(err, ctx) {
  if (!DSN) return;
  try {
    Sentry.captureException(err, ctx ? { extra: ctx } : undefined);
  } catch {
    /* ignore */
  }
}

// Wrap a serverless handler so any unhandled error is reported to Sentry and
// then re-thrown (preserving Vercel's existing 500 + log behaviour). Flushes
// the event before the lambda freezes — otherwise serverless drops it.
export function withErrorCapture(handler) {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (err) {
      try {
        captureServerError(err, { url: req && req.url, method: req && req.method });
        await Sentry.flush(2000);
      } catch {
        /* ignore */
      }
      throw err;
    }
  };
}
