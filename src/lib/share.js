// Pure helpers for the couple share link (expiry + view tracking). No DOM, so
// they're unit-testable and reused by the share panel.

/** True when an expiry timestamp exists and is in the past. Null/empty = no expiry. */
export function isShareExpired(expiresAt, now = Date.now()) {
  if (!expiresAt) return false;
  const t = new Date(expiresAt).getTime();
  return !isNaN(t) && t <= now;
}

/** ISO timestamp → 'YYYY-MM-DD' for a native <input type="date">, or '' when unset. */
export function toDateInputValue(expiresAt) {
  if (!expiresAt) return '';
  const d = new Date(expiresAt);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** A 'YYYY-MM-DD' input value → end-of-day ISO string (link lives through that day), or null. */
export function fromDateInputValue(value) {
  if (!value) return null;
  const d = new Date(`${value}T23:59:59`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Human "last opened" line for the photographer.
 * @returns {string} e.g. "Sett 3 ganger · sist åpnet 21. juni 2026", or the
 *   never-viewed string when there are no views.
 */
export function formatViewed(lastViewedAt, count, locale) {
  const s = locale.share;
  if (!lastViewedAt || !count) return s.neverViewed;
  const d = new Date(lastViewedAt);
  const date = isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(locale.dateLocale, { day: 'numeric', month: 'long', year: 'numeric' });
  return s.viewed(count, date);
}
