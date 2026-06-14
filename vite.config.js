import { defineConfig } from 'vite';

// Static single-page app. No framework — plain ES modules.
// `public/` (fonts, favicon, robots) is copied verbatim to the build output.
export default defineConfig({
  build: {
    outDir: 'dist',
    target: 'es2018',
    cssCodeSplit: false,
  },
});
