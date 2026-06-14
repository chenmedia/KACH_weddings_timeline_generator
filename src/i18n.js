import nb from './locales/nb.js';
import en from './locales/en.js';
import { SUPPORTED_LANGS, DEFAULT_LANG } from './config.js';

const LOCALES = { nb, en };
const LANG_KEY = 'kachweddings-lang';

let current = DEFAULT_LANG;

export function availableLangs() {
  return SUPPORTED_LANGS.map(code => ({ code, label: LOCALES[code].label }));
}

export function getLang() { return current; }

// Resolve initial language: explicit URL param > saved choice > browser > default.
export function resolveInitialLang(urlLang) {
  if (urlLang && SUPPORTED_LANGS.includes(urlLang)) return urlLang;
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  } catch (e) { /* ignore */ }
  const nav = (navigator.language || '').slice(0, 2).toLowerCase();
  if (SUPPORTED_LANGS.includes(nav)) return nav;
  return DEFAULT_LANG;
}

export function setLang(code, persist = true) {
  if (!SUPPORTED_LANGS.includes(code)) return;
  current = code;
  if (persist) { try { localStorage.setItem(LANG_KEY, code); } catch (e) { /* ignore */ } }
  document.documentElement.lang = code;
}

// The active locale object.
export function t() { return LOCALES[current]; }
