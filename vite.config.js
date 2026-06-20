import { defineConfig } from 'vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// Static single-page app. No framework — plain ES modules.
// `public/` (fonts, favicon, robots) is copied verbatim to the build output.
//
// The Clerk publishable key isn't VITE_-prefixed in Vercel, so it isn't visible
// to client code by default. We bridge it to import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
// here, accepting whichever name is present: a manual VITE_CLERK_PUBLISHABLE_KEY
// takes precedence, then CLERK_PUBLISHABLE_KEY, then NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
// (the name Clerk's Vercel integration actually sets). Empty string ⇒ auth
// disabled (the app runs anonymously on localStorage).
const CLERK_PK =
  process.env.VITE_CLERK_PUBLISHABLE_KEY ||
  process.env.CLERK_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  '';

// Sentry: the DSN is public, so we bridge it to the client like the Clerk key.
// Release/environment come from Vercel. Empty DSN ⇒ error reporting disabled.
const SENTRY_DSN = process.env.VITE_SENTRY_DSN || process.env.SENTRY_DSN || '';
const SENTRY_RELEASE = process.env.VERCEL_GIT_COMMIT_SHA || '';
const SENTRY_ENV = process.env.VERCEL_ENV || '';

// Source-map upload runs only when a build token is present (i.e. on Vercel),
// so local builds don't need Sentry credentials.
const sentryPlugins =
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
    ? [
        sentryVitePlugin({
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          authToken: process.env.SENTRY_AUTH_TOKEN,
          release: { name: SENTRY_RELEASE || undefined },
          telemetry: false,
          sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
        }),
      ]
    : [];

export default defineConfig({
  plugins: sentryPlugins,
  define: {
    'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(CLERK_PK),
    'import.meta.env.VITE_SENTRY_DSN': JSON.stringify(SENTRY_DSN),
    'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(SENTRY_RELEASE),
    'import.meta.env.VITE_SENTRY_ENV': JSON.stringify(SENTRY_ENV),
  },
  build: {
    outDir: 'dist',
    // es2020 (BigInt etc.) — required by Clerk's SDK and supported by all
    // modern browsers. Our own code targets the same.
    target: 'es2020',
    cssCodeSplit: false,
    // Generated for Sentry; not referenced (hidden) and deleted post-upload.
    sourcemap: 'hidden',
  },
});
