// App shell: header + language switcher + feature nav + content area, plus the
// auth lifecycle and route dispatch. Feature-agnostic — it knows nothing about
// timelines; it just mounts the active feature into the content container.
import { t, getLang, setLang, resolveInitialLang, availableLangs } from '../i18n.js';
import { initAnalytics, track } from '../analytics.js';
import {
  isAuthEnabled,
  initAuth,
  isSignedIn,
  onAuthChange,
  mountSignIn,
  mountUserButton,
  getToken,
  getUser,
} from '../auth.js';
import { initSentry, setUser } from '../lib/observability.js';
import { el } from '../ui/dom.js';
import { icons } from '../ui/icons.js';
import { registerFeature, getFeatures } from './registry.js';
import { resolveRoute, navigate, onRouteChange } from './router.js';

const root = document.getElementById('app'); // the .wrap element
const SIDEBAR_KEY = 'kach-sidebar-collapsed';

let authEnabled = false;
let authReady = false;

// ---------- meta / SEO ----------
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

// ---------- shell chrome ----------
function buildHeader(homeLink) {
  const header = el('header');
  header.innerHTML = `<h1 class="wordmark">KACH <span class="light">Weddings</span></h1>
    <div class="eyebrow"></div>`;
  header.querySelector('.eyebrow').textContent = t().header.eyebrow;
  if (homeLink) {
    const wm = header.querySelector('.wordmark');
    wm.classList.add('is-link');
    wm.setAttribute('role', 'link');
    wm.setAttribute('tabindex', '0');
    wm.addEventListener('click', () => navigate('/'));
    wm.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate('/');
      }
    });
  }
  header.appendChild(buildLangbar());
  return header;
}

function buildLangbar() {
  const bar = el('div', { class: 'langbar no-print' });
  availableLangs().forEach(({ code, label }) => {
    const b = el('button', { type: 'button', text: label });
    b.setAttribute('aria-pressed', String(code === getLang()));
    b.addEventListener('click', () => {
      if (code === getLang()) return;
      setLang(code);
      render();
      track('Language change', { lang: code });
    });
    bar.appendChild(b);
  });
  return bar;
}

// ---------- left sidebar (SaaS shell) ----------
function isCollapsed() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1';
  } catch {
    return false;
  }
}

function setDrawerOpen(open) {
  root.classList.toggle('is-drawer-open', open);
}

function toggleCollapse() {
  const next = !root.classList.contains('is-collapsed');
  root.classList.toggle('is-collapsed', next);
  try {
    localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
  } catch {
    /* ignore */
  }
}

// Brand + vertical feature nav + language switch. Collapses to an icon rail on
// desktop and slides in as a drawer on mobile. no-print so it never reaches PDF.
function buildSidebar(features, active) {
  const brand = el('button', {
    class: 'side-brand',
    type: 'button',
    'aria-label': 'KACH Weddings — home',
  });
  brand.innerHTML = '<span class="side-mark">KACH <span class="light">Weddings</span></span>';
  brand.addEventListener('click', () => navigate('/'));

  const nav = el('nav', { class: 'side-nav', 'aria-label': 'Features' });
  features.forEach((f) => {
    const b = el('button', {
      type: 'button',
      class: 'side-item' + (f === active ? ' is-active' : ''),
      'aria-current': f === active ? 'page' : 'false',
      title: f.navLabel ? f.navLabel(t()) : f.id,
    });
    b.innerHTML =
      `<span class="side-ico" aria-hidden="true">${f.icon || ''}</span>` +
      `<span class="side-label">${f.navLabel ? f.navLabel(t()) : f.id}</span>`;
    b.addEventListener('click', () => navigate(f.path || '/'));
    nav.appendChild(b);
  });

  const collapse = el('button', {
    class: 'side-collapse',
    type: 'button',
    'aria-label': 'Toggle menu width',
  });
  collapse.innerHTML = `<span class="side-ico" aria-hidden="true">${icons.chevron}</span>`;
  collapse.addEventListener('click', toggleCollapse);

  const foot = el('div', { class: 'side-foot' }, [buildLangbar(), collapse]);
  return el('aside', { class: 'sidebar no-print', 'aria-label': 'Main navigation' }, [brand, nav, foot]);
}

// Slim mobile-only bar: hamburger + wordmark. Opens the drawer.
function buildTopbar() {
  const burger = el('button', { class: 'burger', type: 'button', 'aria-label': 'Open menu' });
  burger.innerHTML = icons.menu;
  burger.addEventListener('click', () => setDrawerOpen(!root.classList.contains('is-drawer-open')));
  const mark = el('span', { class: 'topbar-mark' });
  mark.innerHTML = 'KACH <span class="light">Weddings</span>';
  return el('div', { class: 'app-topbar no-print' }, [burger, mark]);
}

function renderSignIn(main) {
  const d = t().dashboard;
  const slot = el('div');
  main.appendChild(
    el('section', { class: 'signin-wrap', 'aria-label': d.signInTitle }, [
      el('h2', { class: 'signin-title', text: d.signInTitle }),
      el('p', { class: 'signin-intro', text: d.signInIntro }),
      slot,
    ]),
  );
  mountSignIn(slot);
}

// context handed to features — no globals reached into.
function makeCtx() {
  return { authEnabled, isSignedIn, getToken, mountUserButton, navigate, requestRender: render };
}

// ---------- top-level render ----------
function resetLayout() {
  document.body.classList.remove('app-mode');
  root.classList.remove('app-shell', 'is-collapsed', 'is-drawer-open');
}

function render() {
  applyMeta();
  const features = getFeatures();
  const route = resolveRoute(features);

  root.innerHTML = '';
  const main = el('div', { id: 'main' });

  // Public couple view — clean page, no app chrome.
  if (route.kind === 'public' && route.feature) {
    resetLayout();
    root.appendChild(buildHeader(false));
    root.appendChild(main);
    route.feature.mountPublic(main, makeCtx(), route.match);
    return;
  }

  const navFeatures = features.filter((f) => !(authEnabled && f.requiresAuth) || isSignedIn());
  const canMount =
    route.feature &&
    !(authEnabled && !authReady) &&
    !(authEnabled && route.feature.requiresAuth && !isSignedIn());

  // Signed-in app with a mountable feature → SaaS sidebar shell.
  if (canMount && navFeatures.length > 1) {
    document.body.classList.add('app-mode');
    root.classList.add('app-shell');
    root.classList.toggle('is-collapsed', isCollapsed());
    root.appendChild(buildSidebar(navFeatures, route.feature));
    const backdrop = el('div', { class: 'side-backdrop no-print', 'aria-hidden': 'true' });
    backdrop.addEventListener('click', () => setDrawerOpen(false));
    root.appendChild(backdrop);
    root.appendChild(
      el('div', { class: 'app-body' }, [buildTopbar(), el('div', { class: 'app-canvas' }, [main])]),
    );
    route.feature.mount(main, makeCtx());
    return;
  }

  // Otherwise stacked / centred: loading, sign-in, or single feature.
  resetLayout();
  root.appendChild(buildHeader(route.kind === 'app'));
  root.appendChild(main);
  if (!route.feature) return;
  if (authEnabled && !authReady) {
    main.appendChild(el('div', { class: 'dash-empty', text: t().dashboard.loading }));
    return;
  }
  if (authEnabled && route.feature.requiresAuth && !isSignedIn()) {
    renderSignIn(main);
    return;
  }
  route.feature.mount(main, makeCtx());
}

// ---------- bootstrap ----------
export async function startApp({ features = [] } = {}) {
  initSentry(); // inert unless VITE_SENTRY_DSN is set
  features.forEach(registerFeature);

  // Initial language: ?lang= > saved > browser > default. (Share-link langs are
  // applied by the owning feature in mountPublic.)
  const urlLang = new URLSearchParams(location.search).get('lang');
  setLang(resolveInitialLang(urlLang), true);

  initAnalytics();
  onRouteChange(render);

  authEnabled = isAuthEnabled();
  if (authEnabled) {
    render(); // loading state
    await initAuth();
    authReady = true;
    setUser(getUser()?.id || null);
    // Clerk fires this on every resource update (incl. mid sign-in, e.g. the
    // email-code step). Only react to an actual signed-out<->signed-in flip:
    // re-rendering on every event would tear down and re-mount the SignIn
    // widget, which re-prepares the first factor and re-sends the code — a
    // resend loop that trips Clerk's "Too many requests".
    let prevSignedIn = isSignedIn();
    onAuthChange(() => {
      const signedIn = isSignedIn();
      setUser(signedIn ? getUser()?.id || null : null);
      if (signedIn === prevSignedIn) return;
      prevSignedIn = signedIn;
      getFeatures().forEach((f) => f.reset && f.reset());
      render();
    });
  }
  render();
}
