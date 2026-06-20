// Thin wrapper around Clerk's browser SDK. Auth is OPT-IN: with no publishable
// key the module is inert and the app runs anonymously on localStorage.
//
// Clerk JS v6 split the SDK and its UI components into two hosted bundles served
// from the Frontend API: clerk-js (sets window.Clerk) and @clerk/ui (sets
// window.__internal_ClerkUICtor). Both must be loaded and the UI constructor
// passed to clerk.load({ ui: { ClerkUI } }) — otherwise mountSignIn() throws
// "Clerk was not loaded with Ui components". We load them from the FAPI rather
// than bundling, so component chunks resolve against Clerk's own host.

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

/** @type {any} */
let _clerk = null;
/** @type {Promise<any> | null} */
let _scriptsPromise = null;

export function isAuthEnabled() {
  return !!PUBLISHABLE_KEY;
}

// The Frontend API host is base64-encoded in the publishable key:
// pk_<env>_<base64("<fapi-host>$")> (Clerk strips the base64 padding).
function frontendApiHost() {
  try {
    const raw = PUBLISHABLE_KEY.split('_')[2] || '';
    const padded = raw + '='.repeat((4 - (raw.length % 4)) % 4);
    return atob(padded).replace(/\$+$/, '');
  } catch {
    return '';
  }
}

function injectScript(src, attrs) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    for (const [k, v] of Object.entries(attrs || {})) s.setAttribute(k, v);
    s.src = src;
    s.addEventListener('load', () => resolve(undefined));
    s.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
    document.head.appendChild(s);
  });
}

function loadClerkScripts() {
  if (_scriptsPromise) return _scriptsPromise;
  _scriptsPromise = (async () => {
    const host = frontendApiHost();
    if (!host) throw new Error('Invalid Clerk publishable key');
    const base = `https://${host}/npm`;
    // SDK first (it owns window.Clerk), then the UI bundle.
    await injectScript(`${base}/@clerk/clerk-js@6/dist/clerk.browser.js`, {
      'data-clerk-publishable-key': PUBLISHABLE_KEY,
    });
    await injectScript(`${base}/@clerk/ui@1/dist/ui.browser.js`);
    return /** @type {any} */ (window).Clerk;
  })();
  return _scriptsPromise;
}

/** Load Clerk once. Returns the instance, or null when auth is disabled. */
export async function initAuth() {
  if (!PUBLISHABLE_KEY) return null;
  if (_clerk) return _clerk;
  const clerk = await loadClerkScripts();
  const ClerkUI = /** @type {any} */ (window).__internal_ClerkUICtor;
  await clerk.load(ClerkUI ? { ui: { ClerkUI } } : {});
  _clerk = clerk;
  return clerk;
}

export function getUser() {
  return _clerk?.user || null;
}

export function isSignedIn() {
  return !!_clerk?.user;
}

/** Session JWT for Authorization: Bearer, or undefined. */
export async function getToken() {
  try {
    return (await _clerk?.session?.getToken()) || undefined;
  } catch {
    return undefined;
  }
}

export function onAuthChange(cb) {
  _clerk?.addListener((payload) => cb(payload));
}

export function mountSignIn(el) {
  _clerk?.mountSignIn(el);
}

export function mountUserButton(el) {
  _clerk?.mountUserButton(el, { afterSignOutUrl: location.origin });
}

export async function signOut() {
  await _clerk?.signOut();
}
