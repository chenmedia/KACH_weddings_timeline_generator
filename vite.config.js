import { defineConfig } from 'vite';

// Static single-page app. No framework — plain ES modules.
// `public/` (fonts, favicon, robots) is copied verbatim to the build output.
//
// Clerk's Vercel integration exposes the publishable key as CLERK_PUBLISHABLE_KEY
// (not VITE_-prefixed), so it isn't visible to client code by default. We bridge
// it to import.meta.env.VITE_CLERK_PUBLISHABLE_KEY here. A manually-set
// VITE_CLERK_PUBLISHABLE_KEY takes precedence. Empty string ⇒ auth disabled
// (the app runs anonymously on localStorage).
const CLERK_PK = process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY || '';

export default defineConfig({
  define: {
    'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(CLERK_PK),
  },
  build: {
    outDir: 'dist',
    // es2020 (BigInt etc.) — required by Clerk's SDK and supported by all
    // modern browsers. Our own code targets the same.
    target: 'es2020',
    cssCodeSplit: false,
  },
});
