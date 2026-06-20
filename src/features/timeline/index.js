// Timeline feature — the wedding photo-shoot timeline. Owns its own state and
// CRUD; the app shell mounts it via the descriptor at the bottom of this file.
import './timeline.css';
import {
  defaultState,
  loadState,
  clearState,
  decodeStateFromParams,
  buildShareUrl,
} from '../../lib/state.js';
import { LocalStorageSource, ApiSource } from '../../lib/state-source.js';
import { t, getLang, setLang } from '../../i18n.js';
import { track } from '../../analytics.js';
import { reportError } from '../../lib/observability.js';
import { api } from '../../lib/api-client.js';
import { el, esc } from '../../ui/dom.js';
import { buildControls } from './controls.js';
import { buildSharePanel } from './share-panel.js';
import { renderTimeline } from './render.js';
import { buildDashboard } from './dashboard.js';

// ---- feature state (persists across re-mounts: lang switch, etc.) ----
let state = null;
let source = null; // LocalStorageSource | ApiSource | null
let apiMode = false;
let currentTimelineId = null;
let clientView = false; // read-only (couple view)
let outputEl = null;
let editorContainer = null;
let dashboardInstance = null;
let ctx = null; // shell context (getToken, mountUserButton, …)
let publicCache = null; // { slug, state } for couple links

// ---------- timeline output ----------
function render() {
  if (!outputEl) return;
  if (!state) {
    outputEl.innerHTML = `<p class="empty">${esc(t().timeline.empty)}</p>`;
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
      source.save(state).catch((err) => {
        console.error('save failed', err);
        reportError(err, { op: 'save' });
      });
    },
    apiMode ? 700 : 0,
  );
}

function onChange() {
  render();
  scheduleSave();
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
      const { downloadCSV } = await import('../../exporters/csv.js');
      downloadCSV(state, locale);
      track('Export CSV');
      break;
    }
    case 'ics': {
      const { downloadICS } = await import('../../exporters/ics.js');
      downloadICS(state, locale);
      track('Export ICS');
      break;
    }
    case 'pdf': {
      const { exportPDF } = await import('../../exporters/pdf/index.js');
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

// ---------- editor area (share panel + controls + timeline) ----------
function renderEditorArea() {
  if (!editorContainer) return;
  editorContainer.innerHTML = '';
  if (!state) {
    editorContainer.appendChild(el('div', { class: 'dash-empty', text: t().dashboard.selectPrompt }));
    outputEl = null;
    return;
  }
  if (apiMode && currentTimelineId && !clientView) {
    editorContainer.appendChild(buildSharePanel(t(), { timelineId: currentTimelineId, state }));
  }
  if (!clientView) {
    const { el: controlsEl } = buildControls(t(), state, { onChange, onAction });
    editorContainer.appendChild(controlsEl);
  }
  const out = el('section', { id: 'output' });
  editorContainer.appendChild(out);
  outputEl = out;
  render();
}

// ---------- dashboard CRUD ----------
function makeDashboard() {
  return buildDashboard(t(), {
    onSelect: selectTimeline,
    onNew: newTimeline,
    onDelete: deleteTimeline,
    mountUserButton: (elm) => ctx.mountUserButton(elm),
  });
}

async function selectTimeline(id) {
  try {
    const data = await api.get(id);
    currentTimelineId = id;
    apiMode = true;
    source = new ApiSource({ getToken: ctx.getToken });
    source.timelineId = id;
    state = data;
    dashboardInstance?.setActive(id);
    dashboardInstance?.refresh();
    renderEditorArea();
  } catch (e) {
    console.error('load timeline failed', e);
    reportError(e, { op: 'selectTimeline' });
  }
}

async function newTimeline() {
  try {
    const created = await api.create(defaultState());
    await selectTimeline(created.id);
  } catch (e) {
    console.error('create failed', e);
    reportError(e, { op: 'newTimeline' });
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
    reportError(e, { op: 'deleteTimeline' });
  }
}

// ---------- feature lifecycle (called by the shell) ----------
function mount(container, shellCtx) {
  ctx = shellCtx;
  clientView = false;

  if (!ctx.authEnabled) {
    // Anonymous localStorage mode — identical to the pre-backend app.
    apiMode = false;
    source = new LocalStorageSource();
    const decoded = decodeStateFromParams(new URLSearchParams(location.search));
    state = decoded && decoded.hasState ? decoded.state : Object.assign(defaultState(), loadState() || {});
    editorContainer = container;
    renderEditorArea();
    return;
  }

  // Authenticated: dashboard + DB-backed editor.
  const dash = makeDashboard();
  dashboardInstance = dash;
  if (currentTimelineId) dash.setActive(currentTimelineId);
  container.appendChild(dash.el);
  editorContainer = el('div');
  container.appendChild(editorContainer);
  renderEditorArea();
  dash.refresh();
}

async function mountPublic(container, shellCtx, match) {
  ctx = shellCtx;
  clientView = true;
  const out = el('section', { id: 'output' });
  container.appendChild(out);
  outputEl = out;

  // Legacy ?view=client URL-encoded link.
  if (match.state) {
    state = match.state;
    if (match.lang && match.lang !== getLang()) {
      setLang(match.lang, false);
      ctx.requestRender();
      return;
    }
    render();
    return;
  }

  // Couple read-only link /c/:slug.
  if (publicCache && publicCache.slug === match.slug) {
    state = publicCache.state;
    render();
    return;
  }
  state = null;
  render(); // empty while loading
  try {
    const data = await api.publicGet(match.slug);
    state = data.state;
    publicCache = { slug: match.slug, state: data.state };
    if (data.lang && data.lang !== getLang()) {
      setLang(data.lang, false);
      ctx.requestRender();
      return;
    }
  } catch {
    state = null;
    publicCache = { slug: match.slug, state: null };
  }
  render();
}

function matchPublic(pathname, params) {
  const m = pathname.match(/^\/c\/(.+)$/);
  if (m) return { slug: m[1] };
  const decoded = decodeStateFromParams(params);
  if (decoded && decoded.view === 'client' && decoded.hasState) {
    return { state: decoded.state, lang: decoded.lang };
  }
  return null;
}

function reset() {
  state = null;
  source = null;
  apiMode = false;
  currentTimelineId = null;
  clientView = false;
  outputEl = null;
  editorContainer = null;
  dashboardInstance = null;
}

// Feature descriptor consumed by the app shell / registry.
const timelineFeature = {
  id: 'timeline',
  path: '/',
  requiresAuth: true,
  navLabel: (locale) => (locale.nav && locale.nav.timeline) || locale.dashboard.title,
  mount,
  mountPublic,
  matchPublic,
  reset,
};

export default timelineFeature;
