# Security notes

This is a fully client-side static app. There is no backend, no database, and
no user data leaves the browser except when the user explicitly exports a file
or copies a share link. There are no secrets in the repository.

## Threat model

The only untrusted inputs are:

- **URL query parameters** (shareable links) — parsed in `src/lib/state.js`.
- **`localStorage`** — read in `src/lib/state.js`.

Both are passed through **`sanitizeState()`** before use, which:

- keeps only known fields with the expected types,
- accepts overrides only for known milestone keys (ignores `__proto__`,
  unknown keys, etc. — no prototype pollution),
- validates custom dates against `yyyy-mm-dd` and caps free text length.

## XSS invariant

**All dynamic text rendered via `innerHTML` MUST be escaped first.**

- `src/ui/render.js` escapes every interpolated value with `esc()`.
- `src/main.js` escapes header text with `escapeHTML()`.
- Everywhere else, DOM is built with `createElement` + `textContent`
  (see the `el()` helper in `src/ui/controls.js`), which is XSS-safe by
  construction. The `el({ html })` form is only ever used with trusted,
  hard-coded strings.

When editing rendering code, preserve this invariant.

## HTTP headers

`vercel.json` sets a Content-Security-Policy, `Strict-Transport-Security`,
`Permissions-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, and
`Referrer-Policy`. The CSP allows no external origins by default. **If you enable
Plausible analytics, add `https://plausible.io` to both `script-src` and
`connect-src`** in `vercel.json` (or your self-hosted Plausible origin),
otherwise the script is blocked.

## Analytics

Disabled by default. When enabled (`VITE_PLAUSIBLE_DOMAIN`), it is cookieless.
An optional `VITE_PLAUSIBLE_SRI` pins the script with Subresource Integrity.

## Reporting

Email kai@chenmedia.no.
