import { PLAUSIBLE_DOMAIN, PLAUSIBLE_SRC } from './config.js';

// Cookieless, privacy-friendly analytics. Inert unless VITE_PLAUSIBLE_DOMAIN
// is set at build time — so there is no tracking by default.
export function initAnalytics() {
  if (!PLAUSIBLE_DOMAIN) return;
  window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
  const s = document.createElement('script');
  s.defer = true;
  s.setAttribute('data-domain', PLAUSIBLE_DOMAIN);
  s.src = PLAUSIBLE_SRC;
  document.head.appendChild(s);
}

export function track(event, props) {
  try {
    if (typeof window.plausible === 'function') {
      window.plausible(event, props ? { props } : undefined);
    }
  } catch (e) { /* never let analytics break the app */ }
}
