// Single source of truth for the form state: defaults, validation,
// localStorage persistence, and URL (shareable-link) encoding/decoding.

const STORAGE_KEY = 'kachweddings-tidslinje-v1';

export const FIELD_IDS = ['couple', 'wdate', 'bdate', 'place', 'delw', 'sendDays', 'termDays', 'finalOverride'];
export const TOGGLE_IDS = ['tEngage', 'tAlbum'];

// Numeric fields and their accepted ranges (used for validation/clamping).
export const NUMERIC_RANGES = {
  delw: { min: 1, max: 20, fallback: 4 },
  sendDays: { min: 0, max: 60, fallback: 1 },
  termDays: { min: 1, max: 60, fallback: 10 },
};

export function defaultState() {
  return {
    couple: '', wdate: (new Date().getFullYear() + 1) + '-06-01', bdate: '', place: '',
    delw: '4', sendDays: '1', termDays: '10', finalOverride: '',
    tEngage: false, tAlbum: false,
    overrides: {}, // { [itemKey]: { hidden?, date?, note? } }
  };
}

// Validate/clamp numeric fields. Returns { state, warnings:[{id,message}] }.
export function validateState(state, t) {
  const warnings = [];
  const s = { ...state };
  for (const [id, r] of Object.entries(NUMERIC_RANGES)) {
    const raw = s[id];
    const n = Number(raw);
    if (raw === '' || raw == null || Number.isNaN(n)) {
      s[id] = String(r.fallback);
      continue;
    }
    if (n < r.min) { s[id] = String(r.min); warnings.push({ id, message: rangeMsg(t, id, r) }); }
    else if (n > r.max) { s[id] = String(r.max); warnings.push({ id, message: rangeMsg(t, id, r) }); }
    else s[id] = String(Math.round(n));
  }
  return { state: s, warnings };
}

function rangeMsg(t, id, r) {
  const label = (t && t.controls.fields[id] && t.controls.fields[id].label) || id;
  return `${label}: ${r.min}–${r.max}`;
}

export function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return null;
}

export function clearState() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
}

// ---------- Shareable link (URL <-> state) ----------
// Compact querystring. Overrides are JSON-encoded under `ov` when present.
export function encodeStateToParams(state, lang) {
  const p = new URLSearchParams();
  if (lang) p.set('lang', lang);
  FIELD_IDS.forEach(id => { if (state[id]) p.set(id, state[id]); });
  TOGGLE_IDS.forEach(id => { if (state[id]) p.set(id, '1'); });
  if (state.overrides && Object.keys(state.overrides).length) {
    try { p.set('ov', JSON.stringify(state.overrides)); } catch (e) { /* ignore */ }
  }
  return p;
}

// Returns { state, lang, view } from a URLSearchParams, or null if no app params present.
export function decodeStateFromParams(params) {
  const hasAny = FIELD_IDS.some(id => params.has(id)) || TOGGLE_IDS.some(id => params.has(id));
  const lang = params.get('lang') || null;
  const view = params.get('view') || null;
  if (!hasAny && !lang && !view) return null;

  const s = defaultState();
  FIELD_IDS.forEach(id => { if (params.has(id)) s[id] = params.get(id); });
  TOGGLE_IDS.forEach(id => { s[id] = params.get(id) === '1'; });
  if (params.has('ov')) {
    try { s.overrides = JSON.parse(params.get('ov')) || {}; } catch (e) { s.overrides = {}; }
  }
  return { state: s, lang, view, hasState: hasAny };
}

export function buildShareUrl(state, lang, { clientView = true } = {}) {
  const p = encodeStateToParams(state, lang);
  if (clientView) p.set('view', 'client');
  const base = location.origin + location.pathname;
  return `${base}?${p.toString()}`;
}
