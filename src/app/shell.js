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
import { registerFeature, getFeatures } from './registry.js';
import { resolveRoute, navigate, onRouteChange } from './router.js';

const root = document.getElementById('app'); // the .wrap element

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

function buildNav(features, active) {
  const nav = el('nav', { class: 'app-nav no-print', 'aria-label': 'Features' });
  features.forEach((f) => {
    const b = el('button', {
      type: 'button',
      class: 'nav-item' + (f === active ? ' is-active' : ''),
      text: f.navLabel ? f.navLabel(t()) : f.id,
    });
    b.addEventListener('click', () => navigate(f.path || '/'));
    nav.appendChild(b);
  });
  return nav;
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
function render() {
  applyMeta();
  const features = getFeatures();
  const route = resolveRoute(features);

  root.innerHTML = '';
  root.appendChild(buildHeader(route.kind === 'app')); // wordmark links Home in-app
  const main = el('div', { id: 'main' });

  if (route.kind === 'public' && route.feature) {
    root.appendChild(main);
    route.feature.mountPublic(main, makeCtx(), route.match);
    return;
  }

  // app route — show nav only once there is more than one visible feature.
  const navFeatures = features.filter((f) => !(authEnabled && f.requiresAuth) || isSignedIn());
  if (navFeatures.length > 1) root.appendChild(buildNav(navFeatures, route.feature));
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
