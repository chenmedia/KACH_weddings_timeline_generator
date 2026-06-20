# Error tracking (Sentry)

Errors from the browser and the API are reported to **Sentry** (EU region) and
triaged in **Sentry's own dashboard** (no in-app log viewer). Capture is
**opt-in**: with no DSN configured the app reports nothing (dev/anonymous/tests
stay silent).

## How it works

- **Client** (`src/lib/observability.js`, `@sentry/browser`): `initSentry()` runs
  in the app bootstrap (`src/app/shell.js`). Auto-captures uncaught errors and
  unhandled promise rejections; `reportError()` / `reportMessage()` are used for
  caught/manual cases (e.g. failed save, share toggle). Active only when
  `VITE_SENTRY_DSN` is set.
- **Server** (`api/_lib/observability.js`, `@sentry/node`): every route is wrapped
  with `withErrorCapture(handler)`, which reports unhandled errors to Sentry (and
  flushes before the lambda freezes) while preserving Vercel's existing behaviour.
- **Source maps**: uploaded at build by `@sentry/vite-plugin` (only when
  `SENTRY_AUTH_TOKEN` is present), generated as `hidden` and deleted after upload
  → readable production stack traces without exposing source.

## Best practices baked in

- **EU data region** (`…ingest.de.sentry.io`); **no PII**: `sendDefaultPii:false`
  - a `beforeSend` scrub; the Sentry user is the **Clerk id only** (never email).
- **Release** = `VERCEL_GIT_COMMIT_SHA`, **environment** = `VERCEL_ENV` → filter
  prod vs preview and spot per-deploy regressions.
- Errors at 100%, **performance tracing off** (`tracesSampleRate: 0`); common
  browser-extension/network noise filtered (`ignoreErrors` / `denyUrls`).
- Resilient: observability never throws into the app.

## Configuration (Vercel env — set via the Sentry integration)

| Var                            | Where                                          | Purpose                  |
| ------------------------------ | ---------------------------------------------- | ------------------------ |
| `SENTRY_DSN`                   | server + bridged to client (`VITE_SENTRY_DSN`) | report target (public)   |
| `SENTRY_AUTH_TOKEN`            | build only                                     | source-map upload        |
| `SENTRY_ORG`, `SENTRY_PROJECT` | build only                                     | source-map upload target |

`vercel.json` CSP `connect-src` allows the Sentry ingest host.

## Alerts

Configured in the Sentry dashboard (no code): notify on a new issue and on
spikes → email/Slack.

## Verify

Throw a deliberate client error and a server error → both appear in Sentry within
seconds, grouped, with readable stack traces, correct release/environment, and no
PII.
