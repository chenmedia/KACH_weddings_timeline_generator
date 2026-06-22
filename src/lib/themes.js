// Visual templates ("designs") for the timeline. Curated in code — each theme is
// a named set of design tokens that re-skins the rendered timeline AND its PDF
// export. "KACH Wedding" is the default and mirrors the base tokens in
// styles.css :root, so selecting it is a no-op (the current design IS KACH).
//
// To add a template: append an entry below with the full colour token set. The
// timeline applies the tokens as inline custom properties on the output element
// (so the cascade re-skins everything), and the PDF exporters read the same
// tokens directly (they can't see the live cascade). Themes vary colour only;
// fonts stay shared so the PDF's embedded fonts keep working.

export const DEFAULT_THEME_ID = 'kach';

// Token keys every theme must define — kept explicit so the PDF exporters can
// rely on each colour being present.
export const THEME_TOKENS = [
  '--bg',
  '--surface',
  '--ink',
  '--ink-soft',
  '--muted',
  '--hairline',
  '--field-border',
  '--line',
  '--accent',
];

export const THEMES = [
  {
    id: 'kach',
    label: { nb: 'KACH Wedding', en: 'KACH Wedding' },
    // Mirrors styles.css :root exactly — the current, default KACH design.
    vars: {
      '--bg': '#eceae6',
      '--surface': '#f6f4f1',
      '--ink': '#1a1816',
      '--ink-soft': '#3a3733',
      '--muted': '#6b675f',
      '--hairline': '#d8d4cd',
      '--field-border': '#8c877e',
      '--line': '#c9c4bc',
      '--accent': '#1a1816',
    },
  },
  {
    id: 'sand',
    label: { nb: 'Sand', en: 'Sand' },
    // A warmer, deeper editorial palette. Contrast verified AA: muted 4.96:1 on
    // bg, field-border 3.02:1 (WCAG 1.4.11).
    vars: {
      '--bg': '#e7ded0',
      '--surface': '#f1ebe0',
      '--ink': '#2b2218',
      '--ink-soft': '#4a3f31',
      '--muted': '#675b4c',
      '--hairline': '#d3c8b6',
      '--field-border': '#8a7d68',
      '--line': '#c4b8a3',
      '--accent': '#2b2218',
    },
  },
];

const BY_ID = new Map(THEMES.map((th) => [th.id, th]));

/** Resolve a theme by id, falling back to the default. Always returns a theme. */
export function getTheme(id) {
  return BY_ID.get(id) || BY_ID.get(DEFAULT_THEME_ID);
}

/** Coerce arbitrary input to a known theme id (defends tampered links/storage). */
export function sanitizeThemeId(id) {
  return typeof id === 'string' && BY_ID.has(id) ? id : DEFAULT_THEME_ID;
}

/** The token map for a theme, e.g. { '--bg': '#…', … }. */
export function themeVars(id) {
  return getTheme(id).vars;
}

/** Parse a #rrggbb colour into [r, g, b] components in 0..255. */
export function hexToRgb(hex) {
  const c = String(hex).replace('#', '');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

/** A theme token as [r, g, b] in 0..1 — the form PDF content streams expect. */
export function themeRgbUnit(id, token) {
  return hexToRgb(themeVars(id)[token]).map((v) => +(v / 255).toFixed(4));
}
