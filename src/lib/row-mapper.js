// Pure mappers between a DB `timelines` row (+ `milestone_overrides` rows) and
// the in-app `state` object. No DB or DOM here, so it's fully unit-testable and
// reusable server-side. Computed dates are NEVER stored — only inputs/overrides.
import { sanitizeState, defaultState } from './state.js';

/** @param {unknown} v @returns {string} yyyy-mm-dd or '' */
function toDateStr(v) {
  if (!v) return '';
  if (v instanceof Date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
  }
  return String(v).slice(0, 10);
}

/**
 * DB row + override rows → app state.
 * @param {Record<string, any>} row
 * @param {Array<Record<string, any>>} [overrideRows]
 * @returns {import('../types.js').State}
 */
export function rowToState(row, overrideRows = []) {
  const overrides = {};
  for (const o of overrideRows || []) {
    if (!o || !o.item_key) continue;
    const clean = {};
    if (o.hidden) clean.hidden = true;
    const d = toDateStr(o.date);
    if (d) clean.date = d;
    if (o.note) clean.note = String(o.note);
    overrides[o.item_key] = clean;
  }
  // Route through sanitizeState so the result matches exactly what the app expects.
  return sanitizeState({
    couple: row.couple ?? '',
    wdate: toDateStr(row.wdate),
    bdate: toDateStr(row.bdate),
    place: row.place ?? '',
    delw: row.delw,
    sendDays: row.send_days,
    termDays: row.term_days,
    finalOverride: toDateStr(row.final_override),
    tEngage: !!row.t_engage,
    tAlbum: !!row.t_album,
    overrides,
  });
}

/**
 * App state → `timelines` column values (snake_case). Inputs only.
 * @param {import('../types.js').State} state
 * @returns {Record<string, any>}
 */
export function stateToRow(state) {
  const s = sanitizeState(state);
  return {
    couple: s.couple,
    wdate: s.wdate || null,
    bdate: s.bdate || null,
    place: s.place,
    delw: Number(s.delw),
    send_days: Number(s.sendDays),
    term_days: Number(s.termDays),
    final_override: s.finalOverride || null,
    t_engage: s.tEngage,
    t_album: s.tAlbum,
  };
}

/**
 * App state.overrides → `milestone_overrides` rows for a timeline.
 * @param {string} timelineId
 * @param {import('../types.js').State} state
 */
export function overridesToRows(timelineId, state) {
  const s = sanitizeState(state);
  return Object.entries(s.overrides).map(([item_key, ov]) => ({
    timeline_id: timelineId,
    item_key,
    hidden: !!ov.hidden,
    date: ov.date || null,
    note: ov.note || null,
  }));
}

export { defaultState };
