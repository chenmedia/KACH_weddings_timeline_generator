// Minimal path router. Public routes (claimed by a feature's matchPublic) win
// first — e.g. the couple read-only link /c/:slug — then the app route is the
// feature whose `path` matches, defaulting to the first registered feature.

/**
 * @param {Array} features
 * @returns {{ kind:'public', feature:any, match:any } | { kind:'app', feature:any|null, match:null }}
 */
export function resolveRoute(features) {
  const pathname = location.pathname;
  const params = new URLSearchParams(location.search);
  for (const f of features) {
    if (typeof f.matchPublic === 'function') {
      const match = f.matchPublic(pathname, params);
      if (match) return { kind: 'public', feature: f, match };
    }
  }
  const byPath = features.find((f) => f.path && f.path === pathname);
  return { kind: 'app', feature: byPath || features[0] || null, match: null };
}

/** Navigate to an app path without a full page load. */
export function navigate(pathname) {
  if (pathname && pathname !== location.pathname) {
    history.pushState({}, '', pathname);
  }
  window.dispatchEvent(new Event('app:route'));
}

/** Subscribe to route changes (back/forward + programmatic navigate). */
export function onRouteChange(handler) {
  window.addEventListener('popstate', handler);
  window.addEventListener('app:route', handler);
}
