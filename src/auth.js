// Thin wrapper around Clerk's browser SDK. Auth is OPT-IN: with no publishable
// key the module is inert and the app runs anonymously on localStorage.
//
// We load Clerk's hosted browser build (clerk.browser.js) from the Frontend API
// rather than bundling `@clerk/clerk-js`. The bundled ESM build resolves its UI
// components through a runtime dynamic import that Vite can't rewrite, so
// mountSignIn() fails with "Clerk was not loaded with Ui components". The hosted
// build loads its component chunks relative to itself on the FAPI, where they
// exist — so the UI mounts reliably. Anonymous visitors still download nothing.

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

/** @type {any} */
let _clerk = null;
/** @type {Promise<any> | null} */
let _scriptPromise = null;

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

function loadClerkScript() {
  if (_scriptPromise) return _scriptPromise;
  _scriptPromise = new Promise((resolve, reject) => {
    if (/** @type {any} */ (window).Clerk) return resolve(/** @type {any} */ (window).Clerk);
    const host = frontendApiHost();
    if (!host) return reject(new Error('Invalid Clerk publishable key'));
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.setAttribute('data-clerk-publishable-key', PUBLISHABLE_KEY);
    s.src = `https://${host}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`;
    s.addEventListener('load', () => resolve(/** @type {any} */ (window).Clerk));
    s.addEventListener('error', () => reject(new Error('Failed to load Clerk')));
    document.head.appendChild(s);
  });
  return _scriptPromise;
}

/** Load Clerk once. Returns the instance, or null when auth is disabled. */
export async function initAuth() {
  if (!PUBLISHABLE_KEY) return null;
  if (_clerk) return _clerk;
  const clerk = await loadClerkScript();
  await clerk.load({});
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
