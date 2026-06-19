// Thin wrapper around Clerk's browser SDK. Auth is OPT-IN: with no publishable
// key the whole module is inert and the app runs anonymously on localStorage.
// Clerk JS is dynamically imported so anonymous visitors never download it.

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

/** @type {any} */
let _clerk = null;

export function isAuthEnabled() {
  return !!PUBLISHABLE_KEY;
}

/** Load Clerk once. Returns the instance, or null when auth is disabled. */
export async function initAuth() {
  if (!PUBLISHABLE_KEY) return null;
  if (_clerk) return _clerk;
  const { Clerk } = await import('@clerk/clerk-js');
  const clerk = /** @type {any} */ (new Clerk(PUBLISHABLE_KEY));
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
