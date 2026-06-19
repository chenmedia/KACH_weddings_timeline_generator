import { PHASES, TIMING } from '../config.js';
import { addDays, parseISO, toISO, fmtDate, fmtWeekday, monthStartBefore, bumpForward } from './dates.js';

// Compute the concrete date for a milestone, or null for date-less items.
function computeDate(item, ctx) {
  const { W, sendDays, termDays, delDays, finalOverride } = ctx;
  if (item.type === 'booking' || item.type === 'season' || item.type === 'open') return null;
  if (item.isDay) return W; // the wedding day is never moved
  // Run-of-day form always goes out on the 1st, N months before — call one week later.
  const formStart = monthStartBefore(W, TIMING.questionnaireMonthsBefore);
  if (item.key === 'timelineQ') return bumpForward(formStart);
  if (item.key === 'plancall') return bumpForward(addDays(formStart, TIMING.planCallDaysAfterQuestionnaire));
  if (item.type === 'final') {
    if (finalOverride) return parseISO(finalOverride); // custom: never moved
    return bumpForward(addDays(W, sendDays + termDays));
  }
  if (item.type === 'delivery') return bumpForward(addDays(W, delDays));
  if (item.type === 'delivery+') return bumpForward(addDays(W, delDays + (item.offset || 0)));
  return bumpForward(addDays(W, item.offset));
}

// Single source of truth for both the on-screen timeline and every export.
// Returns { W, rows } or null when there is no wedding date.
export function getMilestones(state, locale) {
  const W = parseISO(state.wdate);
  if (!W) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sendDays = Number(state.sendDays) || 0;
  const termDays = Number(state.termDays) || 0;
  const delDays = (Number(state.delw) || 4) * 7;
  const finalOverride = state.finalOverride || '';
  const overrides = state.overrides || {};
  const ctx = { W, sendDays, termDays, delDays, finalOverride };

  const rows = [];
  PHASES.forEach((phase) => {
    phase.items.forEach((it) => {
      const ov = overrides[it.key] || {};
      if (ov.hidden) return;

      const content = locale.items[it.key] || {};
      let d = computeDate(it, ctx);
      if (ov.date) {
        const od = parseISO(ov.date);
        if (od) d = od;
      }

      const isBooking = it.type === 'booking';
      const isSoft = it.type === 'season' || it.type === 'open';

      let descText = content.desc;
      let whoText = content.who;
      const tag = content.tag;
      let dateLabel, weekday;

      if (isBooking) {
        dateLabel = content.dateLabel || locale.booking.dateLabel;
        weekday = content.weekday || locale.booking.weekday;
      } else {
        if (it.key === 'final') {
          if (finalOverride) {
            descText = locale.timeline.finalOverrideDesc;
            whoText = locale.timeline.finalOverrideWho;
          } else {
            const sent = addDays(W, sendDays);
            const when = locale.timeline.finalWhen(sendDays);
            descText = locale.timeline.finalDesc(when, termDays);
            whoText = locale.timeline.finalWho(fmtDate(sent, locale.dateLocale));
          }
        }
        dateLabel = ov.date ? fmtDate(d, locale.dateLocale) : fmtDate(d, locale.dateLocale);
        weekday = fmtWeekday(d, locale.dateLocale);
      }

      // Per-couple note override replaces the body text.
      if (ov.note) {
        descText = ov.note;
        whoText = '';
      }

      rows.push({
        key: it.key,
        phaseKey: phase.key,
        phase: locale.phases[phase.key],
        tag,
        date: d,
        dateISO: d ? toISO(d) : null,
        dateLabel,
        weekday,
        title: content.title,
        desc: descText,
        who: whoText,
        isDay: !!it.isDay,
        isBooking,
        isSoft,
        isPast: d && d < today && !it.isDay,
      });
    });
  });
  return { W, rows };
}

// ---------- Off-rail feature cards ----------
export function parfotoAside(state, locale) {
  const inc = !!state.tEngage;
  const a = locale.asides.parfoto;
  const out = {
    id: 'parfoto',
    included: inc,
    title: a.title,
    eyebrow: inc ? a.eyebrowIncluded : a.eyebrowOptional,
    desc: inc ? a.descIncluded : a.descOptional,
    note: inc ? '' : a.noteOptional,
    seasonsLabel: a.seasonsLabel,
    seasons: null,
  };
  if (inc) {
    const seasons = [a.seasons.autumn, a.seasons.spring];
    const W = parseISO(state.wdate);
    if (W) {
      let B = parseISO(state.bdate);
      if (!B) {
        B = new Date();
        B.setHours(0, 0, 0, 0);
      } // no booking date → use today
      const cut = TIMING.coupleSessionSummerCutoff;
      const cutoff = new Date(W.getFullYear() - cut.yearsBeforeWedding, cut.monthIndex, cut.day);
      if (B < cutoff) seasons.unshift(a.seasons.summer); // early booking → summer also viable
    }
    out.seasons = seasons;
  }
  return out;
}

export function albumAside(state, locale) {
  const inc = !!state.tAlbum;
  const a = locale.asides.album;
  return {
    id: 'album',
    included: inc,
    title: a.title,
    eyebrow: inc ? a.eyebrowIncluded : a.eyebrowOptional,
    desc: inc ? a.descIncluded : a.descOptional,
    note: inc ? '' : a.noteOptional,
    seasonsLabel: a.seasonsLabel,
    seasons: null,
  };
}
