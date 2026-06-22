import { getMilestones, parfotoAside, albumAside } from '../../lib/milestones.js';
import { ASIDE_AFTER_PHASE, ASIDE_AFTER_ITEM, SITE_URL } from '../../config.js';
import { esc } from '../../ui/dom.js';
import { themeVars } from '../../lib/themes.js';

// Re-skin the output element by applying the chosen template's design tokens as
// inline custom properties — they cascade over the :root defaults for everything
// inside, and (being inline) survive the clone the PDF exporter makes. Painting
// the element's own background keeps the markers (which use --bg) seamless and
// gives an honest preview of the exported "sheet".
export function applyTheme(out, themeId) {
  const vars = themeVars(themeId);
  for (const [k, v] of Object.entries(vars)) out.style.setProperty(k, v);
  out.style.backgroundColor = vars['--bg'];
}

function asideHTML(a) {
  const note = a.note ? `<div class="a-note">${esc(a.note)}</div>` : '';
  let seasons = '';
  if (a.seasons && a.seasons.length) {
    seasons =
      `<div class="a-seasons"><span class="a-seasons-label">${esc(a.seasonsLabel)}</span>` +
      a.seasons.map((s) => `<span class="a-season">${esc(s)}</span>`).join('') +
      '</div>';
  }
  return `<div class="aside${a.included ? '' : ' is-extra'}">
    <div class="a-eyebrow">${esc(a.eyebrow)}</div>
    <div class="a-title">${esc(a.title)}</div>
    <div class="a-desc">${esc(a.desc)}</div>
    ${seasons}
    ${note}
  </div>`;
}

// Render the on-screen timeline into `out`.
export function renderTimeline(state, locale, out) {
  applyTheme(out, state.themeId);
  const data = getMilestones(state, locale);
  if (!data) {
    out.innerHTML = `<p class="empty">${esc(locale.timeline.empty)}</p>`;
    return;
  }

  const couple = (state.couple || '').trim();
  const place = (state.place || '').trim();

  const cards = {
    parfoto: () => asideHTML(parfotoAside(state, locale)),
    album: () => asideHTML(albumAside(state, locale)),
  };

  let html = '<div class="tl-head">';
  html += `<h2 class="couple">${couple ? esc(couple) : esc(locale.timeline.defaultCouple)}</h2>`;
  const metaBits = [data.rows.length ? esc(metaDate(data, locale)) : ''];
  if (place) metaBits.push(esc(place));
  html += `<div class="meta">${metaBits.filter(Boolean).join(' · ')}</div><div class="rule"></div></div>`;

  html += '<div class="timeline">';
  let lastPhase = null;
  data.rows.forEach((r) => {
    if (r.phaseKey !== lastPhase) {
      html += `<h3 class="phase-label">${esc(r.phase)}</h3>`;
      lastPhase = r.phaseKey;
      const cardId = ASIDE_AFTER_PHASE[r.phaseKey];
      if (cardId && cards[cardId]) html += cards[cardId]();
    }
    const cls = ['item'];
    if (r.isDay) cls.push('is-day');
    if (r.isBooking) cls.push('is-booking');
    if (r.isSoft) cls.push('is-soft');
    if (r.isPast) cls.push('is-past');
    html += `<div class="${cls.join(' ')}">
      <span class="marker"></span>
      <span class="tag">${esc(r.tag)}</span>
      <div class="date">${esc(r.dateLabel)}</div><div class="weekday">${esc(r.weekday)}</div>
      <div class="title">${esc(r.title)}</div>
      <div class="desc">${esc(r.desc)}${r.who ? `<span class="who">${esc(r.who)}</span>` : ''}</div>
    </div>`;
    const cardId = ASIDE_AFTER_ITEM[r.key];
    if (cardId && cards[cardId]) html += cards[cardId]();
  });
  html += '</div>';

  html += `<footer>
    <div class="sig">${esc(locale.footer.sig)}</div>
    <div class="links">${esc(SITE_URL)}</div>
  </footer>`;

  out.innerHTML = html;
}

function metaDate(data, locale) {
  // first dated row's formatting already localised; reuse the wedding date.
  const d = data.W;
  const s = d.toLocaleDateString(locale.dateLocale, { day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
