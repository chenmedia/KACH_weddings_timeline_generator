import './styles.css';
import { t, getLang, setLang, resolveInitialLang, availableLangs } from './i18n.js';
import {
  defaultState,
  loadState,
  saveState,
  clearState,
  decodeStateFromParams,
  buildShareUrl,
} from './lib/state.js';
import { buildControls } from './ui/controls.js';
import { renderTimeline } from './ui/render.js';
import { initAnalytics, track } from './analytics.js';

// Exporters are loaded on demand (dynamic import) so the initial bundle — and
// the couple's read-only view, which never exports — stays small.

const root = document.getElementById('app'); // this is the .wrap element
let state;
let clientView = false;
let outputEl;

function render() {
  renderTimeline(state, t(), outputEl);
}

function onChange() {
  render();
  if (!clientView) saveState(state);
}

function applyMeta() {
  const locale = t();
  document.title = locale.meta.title;
  setMeta('name', 'description', locale.meta.description);
  setMeta('property', 'og:title', locale.meta.title);
  setMeta('property', 'og:description', locale.meta.description);
  document.documentElement.lang = getLang();

  // Canonical + per-language alternates, resolved against the live origin so
  // they are correct on any deploy domain without a build-time config.
  const base = location.origin + location.pathname;
  setMeta('property', 'og:url', base);
  setLink('canonical', null, base);
  setLink('alternate', 'x-default', base);
  availableLangs().forEach(({ code }) => setLink('alternate', code, `${base}?lang=${code}`));
}

function setMeta(attr, key, content) {
  let m = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!m) {
    m = document.createElement('meta');
    m.setAttribute(attr, key);
    document.head.appendChild(m);
  }
  m.setAttribute('content', content);
}

function setLink(rel, hreflang, href) {
  const sel = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]:not([hreflang])`;
  let l = /** @type {HTMLLinkElement|null} */ (document.head.querySelector(sel));
  if (!l) {
    l = document.createElement('link');
    l.rel = rel;
    if (hreflang) l.hreflang = hreflang;
    document.head.appendChild(l);
  }
  l.href = href;
}

let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('shareToast');
  if (!toast) {
    return;
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

async function copyShareLink() {
  const url = buildShareUrl(state, getLang(), { clientView: true });
  const c = t().controls;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    showToast(c.shareCopied);
    track('Share link copied');
  } catch (e) {
    showToast(c.shareFailed);
  }
}

async function onAction(name, button) {
  const locale = t();
  switch (name) {
    case 'share':
      copyShareLink();
      break;
    case 'csv': {
      const { downloadCSV } = await import('./exporters/csv.js');
      downloadCSV(state, locale);
      track('Export CSV');
      break;
    }
    case 'ics': {
      const { downloadICS } = await import('./exporters/ics.js');
      downloadICS(state, locale);
      track('Export ICS');
      break;
    }
    case 'pdf': {
      const { exportPDF } = await import('./exporters/pdf/index.js');
      exportPDF(state, locale, { refresh: render, button });
      track('Export PDF');
      break;
    }
    case 'reset':
      clearState();
      state = defaultState();
      buildUI();
      break;
    case 'toggleEditor':
      /* handled inside controls */ break;
    default:
      break;
  }
}

function buildLangbar() {
  const bar = document.createElement('div');
  bar.className = 'langbar no-print';
  availableLangs().forEach(({ code, label }) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.setAttribute('aria-pressed', String(code === getLang()));
    b.addEventListener('click', () => {
      if (code === getLang()) return;
      setLang(code);
      buildUI();
      track('Language change', { lang: code });
    });
    bar.appendChild(b);
  });
  return bar;
}

// (Re)build the whole UI for the current language and state.
function buildUI() {
  applyMeta();
  root.innerHTML = '';

  const header = document.createElement('header');
  header.innerHTML = `<h1 class="wordmark">KACH <span class="light">Weddings</span></h1>
    <div class="eyebrow">${escapeHTML(t().header.eyebrow)}</div>`;
  header.appendChild(buildLangbar());
  root.appendChild(header);

  if (!clientView) {
    const { el } = buildControls(t(), state, { onChange, onAction });
    root.appendChild(el);
  }

  const output = document.createElement('section');
  output.id = 'output';
  root.appendChild(output);
  outputEl = output;

  render();
}

function escapeHTML(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function init() {
  const params = new URLSearchParams(location.search);
  const decoded = decodeStateFromParams(params);

  const initialLang = resolveInitialLang(decoded ? decoded.lang : null);
  setLang(initialLang, /* persist */ !decoded);

  if (decoded && decoded.hasState) {
    state = decoded.state;
    clientView = decoded.view === 'client';
  } else {
    state = Object.assign(defaultState(), loadState() || {});
    clientView = false;
  }

  initAnalytics();
  buildUI();
}

init();
