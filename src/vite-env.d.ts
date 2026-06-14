// Ambient types for Vite-specific imports used in this project.
declare module '*?inline' {
  const css: string;
  export default css;
}

interface ImportMetaEnv {
  readonly VITE_PLAUSIBLE_DOMAIN?: string;
  readonly VITE_PLAUSIBLE_SRC?: string;
  readonly VITE_PLAUSIBLE_SRI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  // Plausible analytics queue/stub, present only when analytics is enabled.
  plausible?: ((event: string, opts?: { props?: Record<string, unknown> }) => void) & { q?: unknown[] };
}
