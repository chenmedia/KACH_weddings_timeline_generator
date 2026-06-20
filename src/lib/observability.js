// Client error reporting via Sentry. OPT-IN and resilient (mirrors analytics.js):
// with no VITE_SENTRY_DSN the module is inert and never throws, so dev builds,
// tests and anonymous use send nothing. Tracked in Sentry's dashboard.
import * as Sentry from '@sentry/browser';

const DSN = import.meta.env.VITE_SENTRY_DSN || '';
const RELEASE = import.meta.env.VITE_SENTRY_RELEASE || undefined;
const ENVIRONMENT = import.meta.env.VITE_SENTRY_ENV || (import.meta.env.PROD ? 'production' : 'development');

let started = false;

// Strip anything that could carry personal data before an event leaves the
// browser (couples' names/notes, emails, share slugs live in app state).
function scrub(event) {
  try {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.data;
      if (event.request.headers) delete event.request.headers.Authorization;
    }
    if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
  } catch {
    /* ignore */
  }
  return event;
}

export function initSentry() {
  if (!DSN || started) return;
  started = true;
  try {
    Sentry.init({
      dsn: DSN,
      environment: ENVIRONMENT,
      release: RELEASE,
      sendDefaultPii: false, // GDPR: no IPs, cookies, request bodies
      tracesSampleRate: 0, // errors only; no performance tracing
      beforeSend: scrub,
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications.',
        'Non-Error promise rejection captured',
      ],
      denyUrls: [/extensions?\//i, /^chrome:\/\//i, /^moz-extension:\/\//i, /^safari-extension:\/\//i],
    });
  } catch {
    /* never let observability break the app */
  }
}

/** Tag events with the signed-in photographer (Clerk id only — never email). */
export function setUser(id) {
  if (!DSN) return;
  try {
    Sentry.setUser(id ? { id } : null);
  } catch {
    /* ignore */
  }
}

/** Report a caught exception with optional non-PII context. */
export function reportError(err, context) {
  if (!DSN) return;
  try {
    Sentry.captureException(err, context ? { extra: context } : undefined);
  } catch {
    /* ignore */
  }
}

/** Report an explicit warning/event (manual logging). */
export function reportMessage(message, level = 'warning') {
  if (!DSN) return;
  try {
    Sentry.captureMessage(message, /** @type {any} */ (level));
  } catch {
    /* ignore */
  }
}
