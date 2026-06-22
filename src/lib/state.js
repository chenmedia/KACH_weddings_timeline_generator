// Single source of truth for the form state: defaults, validation,
// localStorage persistence (with schema versioning), URL (shareable-link)
// encoding/decoding, and sanitization of any untrusted input.
import { PHASES } from '../config.js';
import { DEFAULT_THEME_ID, sanitizeThemeId } from './themes.js';

const STORAGE_KEY = 'kachweddings-tidslinje-v1';
const STATE_VERSION = 2; // bump when the shape changes; add a case in migrate()

export const FIELD_IDS = [
  'couple',
  'wdate',
  'bdate',
  'place',
  'delw',
  'sendDays',
  'termDays',
  'finalOverride',
];
export const TOGGLE_IDS = ['tEngage', 'tAlbum'];

// Numeric fields and their accepted ranges (used for validation/clamping).
export const NUMERIC_RANGES = {
  delw: { min: 1, max: 20, fallback: 4 },
  sendDays: { min: 0, max: 60, fallback: 1 },
  termDays: { min: 1, max: 60, fallback: 10 },
};

// All milestone keys that may legitimately carry an override.
const VALID_ITEM_KEYS = new Set(PHASES.flatMap((p) => p.items.map((it) => it.key)));
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TEXT = 2000; // hard cap on any free-text field, to bound URL/storage size

export function defaultState() {
  return {
    couple: '',
    wdate: new Date().getFullYear() + 1 + '-06-01',
    bdate: '',
    place: '',
    delw: '4',
    sendDays: '1',
    termDays: '10',
    finalOverride: '',
    tEngage: false,
    tAlbum: false,
    themeId: DEFAULT_THEME_ID, // visual template — see src/lib/themes.js
    overrides: {}, // { [itemKey]: { hidden?, date?, note? } }
  };
}

// Coerce arbitrary input (URL params, localStorage) into a known-good state.
// Anything unrecognised is dropped — defends against tampered links/storage.
export function sanitizeState(input) {
  const out = defaultState();
  if (!input || typeof input !== 'object') return out;
  FIELD_IDS.forEach((id) => {
    if (typeof input[id] === 'string') out[id] = input[id].slice(0, MAX_TEXT);
    else if (typeof input[id] === 'number') out[id] = String(input[id]);
  });
  TOGGLE_IDS.forEach((id) => {
    out[id] = input[id] === true || input[id] === '1' || input[id] === 1;
  });
  out.themeId = sanitizeThemeId(input.themeId);

  out.overrides = {};
  const ov = input.overrides;
  if (ov && typeof ov === 'object') {
    for (const key of Object.keys(ov)) {
      if (!VALID_ITEM_KEYS.has(key)) continue; // ignore unknown / __proto__ etc.
      const src = ov[key];
      if (!src || typeof src !== 'object') continue;
      const clean = {};
      if (src.hidden === true) clean.hidden = true;
      if (typeof src.date === 'string' && ISO_DATE_RE.test(src.date)) clean.date = src.date;
      if (typeof src.note === 'string' && src.note.trim()) clean.note = src.note.trim().slice(0, MAX_TEXT);
      if (Object.keys(clean).length) out.overrides[key] = clean;
    }
  }
  return out;
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
    if (n < r.min) {
      s[id] = String(r.min);
      warnings.push({ id, message: rangeMsg(t, id, r) });
    } else if (n > r.max) {
      s[id] = String(r.max);
      warnings.push({ id, message: rangeMsg(t, id, r) });
    } else s[id] = String(Math.round(n));
  }
  return { state: s, warnings };
}

function rangeMsg(t, id, r) {
  const label = (t && t.controls.fields[id] && t.controls.fields[id].label) || id;
  return `${label}: ${r.min}–${r.max}`;
}

// ---------- localStorage (versioned) ----------
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ _v: STATE_VERSION, ...state }));
  } catch (e) {
    /* ignore */
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return sanitizeState(migrate(parsed));
  } catch (e) {
    return null;
  }
}

// Upgrade an older stored shape to the current one.
function migrate(data) {
  if (!data || typeof data !== 'object') return data;
  let v = typeof data._v === 'number' ? data._v : 1;
  const out = { ...data };
  if (v < 2) {
    out.overrides = out.overrides || {};
    v = 2;
  } // v1 had no overrides
  out._v = v;
  return out;
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    /* ignore */
  }
}

// ---------- Shareable link (URL <-> state) ----------
// Only values that differ from the defaults are encoded, keeping links short.
export function encodeStateToParams(state, lang) {
  const def = defaultState();
  const p = new URLSearchParams();
  if (lang) p.set('lang', lang);
  FIELD_IDS.forEach((id) => {
    if (state[id] && state[id] !== def[id]) p.set(id, state[id]);
  });
  TOGGLE_IDS.forEach((id) => {
    if (state[id]) p.set(id, '1');
  });
  if (state.themeId && state.themeId !== def.themeId) p.set('theme', state.themeId);
  if (state.overrides && Object.keys(state.overrides).length) {
    try {
      p.set('ov', JSON.stringify(state.overrides));
    } catch (e) {
      /* ignore */
    }
  }
  return p;
}

// Returns { state, lang, view, hasState } from URLSearchParams, or null if none.
export function decodeStateFromParams(params) {
  const hasAny = FIELD_IDS.some((id) => params.has(id)) || TOGGLE_IDS.some((id) => params.has(id));
  const lang = params.get('lang') || null;
  const view = params.get('view') || null;
  if (!hasAny && !lang && !view) return null;

  const raw = {};
  FIELD_IDS.forEach((id) => {
    if (params.has(id)) raw[id] = params.get(id);
  });
  TOGGLE_IDS.forEach((id) => {
    raw[id] = params.get(id) === '1';
  });
  if (params.has('theme')) raw.themeId = params.get('theme');
  if (params.has('ov')) {
    try {
      raw.overrides = JSON.parse(params.get('ov'));
    } catch (e) {
      raw.overrides = {};
    }
  }
  return { state: sanitizeState(raw), lang, view, hasState: hasAny };
}

export function buildShareUrl(state, lang, { clientView = true } = {}) {
  const p = encodeStateToParams(state, lang);
  if (clientView) p.set('view', 'client');
  const base = location.origin + location.pathname;
  return `${base}?${p.toString()}`;
}
