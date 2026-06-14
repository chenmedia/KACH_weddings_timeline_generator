import './styles.css';
import { t, getLang, setLang, resolveInitialLang, availableLangs } from './i18n.js';
import { defaultState, loadState, clearState, decodeStateFromParams, buildShareUrl } from './lib/state.js';
import { LocalStorageSource, ApiSource } from './lib/state-source.js';
import { buildControls } from './ui/controls.js';
import { buildSharePanel } from './ui/share-panel.js';
import { renderTimeline } from './ui/render.js';
import { initAnalytics, track } from './analytics.js';
import {
  isAuthEnabled,
  initAuth,
  isSignedIn,
  onAuthChange,
  getToken,
  mountSignIn,
  mountUserButton,
} from './auth.js';
import { api } from './lib/api-client.js';

// Exporters are loaded on demand (dynamic import) so the initial bundle — and
// the couple's read-only view, which never exports — stays small.

const root = document.getElementById('app'); // the .wrap element

// ---- app state ----
let mode = 'app'; // 'app' | 'couple'
let state = null;
let clientView = false; // read-only (couple view)
let outputEl = null;
let source = null; // LocalStorageSource | ApiSource | null
let apiMode = false;
let currentTimelineId = null;
let authEnabled = false;
let authReady = false;
let dashboardInstance = null;
let editorContainer = null;

function render() {
  if (!outputEl) return;
  if (!state) {
    outputEl.innerHTML = `<p class="empty">${escapeHTML(t().timeline.empty)}</p>`;
    return;
  }
  renderTimeline(state, t(), outputEl);
}

let saveTimer;
function scheduleSave() {
  if (clientView || !source) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(
    () => {
      source.save(state).catch((err) => console.error('save failed', err));
    },
    apiMode ? 700 : 0,
  );
}

function onChange() {
  render();
  scheduleSave();
}

// ---------- meta ----------
function applyMeta() {
  const locale = t();
  document.title = locale.meta.title;
  setMeta('name', 'description', locale.meta.description);
  setMeta('property', 'og:title', locale.meta.title);
  setMeta('property', 'og:description', locale.meta.description);
  document.documentElement.lang = getLang();

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

// ---------- toast + share + actions ----------
let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('shareToast');
  if (!toast) return;
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
  } catch {
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
      state = defaultState();
      if (!apiMode) clearState();
      scheduleSave();
      renderEditorArea();
      break;
    case 'toggleEditor':
      /* handled inside controls */ break;
    default:
      break;
  }
}

// ---------- shell ----------
function buildHeader() {
  const header = document.createElement('header');
  header.innerHTML = `<h1 class="wordmark">KACH <span class="light">Weddings</span></h1>
    <div class="eyebrow">${escapeHTML(t().header.eyebrow)}</div>`;
  header.appendChild(buildLangbar());
  return header;
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
      rerender();
      track('Language change', { lang: code });
    });
    bar.appendChild(b);
  });
  return bar;
}

function escapeHTML(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------- editor area (controls + timeline) ----------
function renderEditorArea() {
  if (!editorContainer) return;
  editorContainer.innerHTML = '';
  if (!state) {
    editorContainer.appendChild(divText('dash-empty', t().dashboard.selectPrompt));
    outputEl = null;
    return;
  }
  if (apiMode && currentTimelineId && !clientView) {
    editorContainer.appendChild(buildSharePanel(t(), { timelineId: currentTimelineId, state }));
  }
  if (!clientView) {
    const { el } = buildControls(t(), state, { onChange, onAction });
    editorContainer.appendChild(el);
  }
  const out = document.createElement('section');
  out.id = 'output';
  editorContainer.appendChild(out);
  outputEl = out;
  render();
}

function divText(cls, text) {
  const d = document.createElement('div');
  d.className = cls;
  d.textContent = text;
  return d;
}

// ---------- mode renderers ----------
function renderAnonymous(main) {
  editorContainer = main;
  renderEditorArea();
}

function renderCouple(main) {
  clientView = true;
  const out = document.createElement('section');
  out.id = 'output';
  main.appendChild(out);
  outputEl = out;
  render();
}

function renderSignedOut(main) {
  const d = t().dashboard;
  const wrap = document.createElement('section');
  wrap.className = 'signin-wrap';
  wrap.appendChild(divText('controls-title', d.signInTitle));
  wrap.appendChild(divText('editor-intro', d.signInIntro));
  const slot = document.createElement('div');
  wrap.appendChild(slot);
  main.appendChild(wrap);
  mountSignIn(slot);
}

function renderSignedIn(main) {
  const dash = buildDashboard();
  dashboardInstance = dash;
  if (currentTimelineId) dash.setActive(currentTimelineId);
  main.appendChild(dash.el);

  editorContainer = document.createElement('div');
  main.appendChild(editorContainer);
  renderEditorArea();
  dash.refresh();
}

function buildDashboardHandlers() {
  return {
    onSelect: selectTimeline,
    onNew: newTimeline,
    onDelete: deleteTimeline,
    mountUserButton: (el) => mountUserButton(el),
  };
}

// dashboard module is imported lazily to keep it out of the anonymous bundle.
let _buildDashboard = /** @type {any} */ (null);
function buildDashboard() {
  // _buildDashboard is set during init() (authed path only).
  return _buildDashboard(t(), buildDashboardHandlers());
}

async function selectTimeline(id) {
  try {
    const data = await api.get(id);
    currentTimelineId = id;
    apiMode = true;
    source = new ApiSource({ getToken });
    source.timelineId = id;
    state = data;
    dashboardInstance?.setActive(id);
    dashboardInstance?.refresh();
    renderEditorArea();
  } catch (e) {
    console.error('load timeline failed', e);
  }
}

async function newTimeline() {
  try {
    const created = await api.create(defaultState());
    await selectTimeline(created.id);
  } catch (e) {
    console.error('create failed', e);
  }
}

async function deleteTimeline(id) {
  try {
    await api.remove(id);
    if (id === currentTimelineId) {
      currentTimelineId = null;
      state = null;
      apiMode = false;
      source = null;
      renderEditorArea();
    }
    dashboardInstance?.refresh();
  } catch (e) {
    console.error('delete failed', e);
  }
}

// ---------- top-level render ----------
function rerender() {
  applyMeta();
  root.innerHTML = '';
  root.appendChild(buildHeader());
  const main = document.createElement('div');
  main.id = 'main';
  root.appendChild(main);

  if (mode === 'couple') {
    renderCouple(main);
    return;
  }
  if (authEnabled) {
    if (!authReady) {
      main.appendChild(divText('dash-empty', t().dashboard.loading));
      return;
    }
    if (isSignedIn()) renderSignedIn(main);
    else renderSignedOut(main);
  } else {
    renderAnonymous(main);
  }
}

// ---------- init ----------
async function init() {
  initAnalytics();
  const params = new URLSearchParams(location.search);
  const slugMatch = location.pathname.match(/^\/c\/(.+)$/);
  const decoded = decodeStateFromParams(params);
  const initialLang = resolveInitialLang(decoded ? decoded.lang : null);
  setLang(initialLang, !decoded);

  // 1) Couple read-only link: /c/:slug (backend) ...
  if (slugMatch) {
    mode = 'couple';
    clientView = true;
    rerender(); // loading/empty
    try {
      const data = await api.publicGet(slugMatch[1]);
      state = data.state;
      if (data.lang) setLang(data.lang, false);
    } catch {
      state = null;
    }
    rerender();
    return;
  }

  // ... or legacy ?view=client URL-encoded link.
  if (decoded && decoded.view === 'client' && decoded.hasState) {
    mode = 'couple';
    clientView = true;
    state = decoded.state;
    rerender();
    return;
  }

  // 2) App mode.
  mode = 'app';
  if (isAuthEnabled()) {
    authEnabled = true;
    rerender(); // loading
    _buildDashboard = (await import('./ui/dashboard.js')).buildDashboard;
    await initAuth();
    authReady = true;
    onAuthChange(() => {
      // sign-in/out: drop any open editor and re-render.
      currentTimelineId = null;
      state = null;
      apiMode = false;
      source = null;
      rerender();
    });
    rerender();
  } else {
    // 3) Anonymous (no backend configured) — identical to before.
    source = new LocalStorageSource();
    apiMode = false;
    clientView = false;
    state = decoded && decoded.hasState ? decoded.state : Object.assign(defaultState(), loadState() || {});
    rerender();
  }
}

init();
