import { getMilestones, parfotoAside, albumAside } from '../lib/milestones.js';
import { fmtDate } from '../lib/dates.js';
import { slug, downloadBlob } from '../lib/download.js';

function csvCell(v) {
  return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
}

// Build the Canva / Bulk-Create CSV. Pure (no DOM) so it can be unit-tested.
// Returns { content, filename } or null when there is no wedding date.
export function buildCSV(state, locale) {
  const data = getMilestones(state, locale);
  if (!data) return null;

  const couple = (state.couple || '').trim();
  const place = (state.place || '').trim();
  const wdate = fmtDate(data.W, locale.dateLocale);

  const lines = [locale.csv.headers];
  data.rows.forEach((r) => {
    lines.push([couple, wdate, place, r.phase, r.tag, r.dateLabel, r.weekday, r.title, r.desc, r.who]);
  });

  const pf = parfotoAside(state, locale);
  const al = albumAside(state, locale);
  const statusDetail = (a) =>
    a.included
      ? locale.csv.includedDetail + (a.seasons && a.seasons.length ? locale.csv.seasonsDetail(a.seasons) : '')
      : locale.csv.optionalDetail;
  [pf, al].forEach((a) => {
    const phase = a.id === 'parfoto' ? locale.phases.planlegging : locale.phases.etterDagen;
    lines.push([
      couple,
      wdate,
      place,
      phase,
      a.included ? locale.csv.included : locale.csv.optional,
      '',
      '',
      a.title,
      a.desc,
      statusDetail(a),
    ]);
  });

  const csv = lines.map((row) => row.map(csvCell).join(',')).join('\r\n');
  // BOM so Canva/Excel reads æ ø å correctly.
  return { content: '\ufeff' + csv, filename: `kach-weddings-tidslinje-${slug(couple)}.csv` };
}

export function downloadCSV(state, locale) {
  const out = buildCSV(state, locale);
  if (!out) {
    alert(locale.alerts.pickDate);
    return;
  }
  downloadBlob(new Blob([out.content], { type: 'text/csv;charset=utf-8;' }), out.filename);
}
