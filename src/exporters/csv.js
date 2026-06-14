import { getMilestones, parfotoAside, albumAside } from '../lib/milestones.js';
import { fmtDate } from '../lib/dates.js';
import { slug, downloadBlob } from '../lib/download.js';

function csvCell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }

// Export the timeline as a Canva / Bulk-Create-friendly CSV.
export function downloadCSV(state, locale) {
  const data = getMilestones(state, locale);
  if (!data) { alert(locale.alerts.pickDate); return; }

  const couple = (state.couple || '').trim();
  const place = (state.place || '').trim();
  const wdate = fmtDate(data.W, locale.dateLocale);

  const lines = [locale.csv.headers];
  data.rows.forEach(r => {
    lines.push([couple, wdate, place, r.phase, r.tag, r.dateLabel, r.weekday, r.title, r.desc, r.who]);
  });

  const pf = parfotoAside(state, locale);
  const al = albumAside(state, locale);
  const statusDetail = a => a.included
    ? (locale.csv.includedDetail + (a.seasons && a.seasons.length ? locale.csv.seasonsDetail(a.seasons) : ''))
    : locale.csv.optionalDetail;
  [pf, al].forEach(a => {
    const phase = a.id === 'parfoto' ? locale.phases.planlegging : locale.phases.etterDagen;
    lines.push([couple, wdate, place, phase,
      a.included ? locale.csv.included : locale.csv.optional, '', '',
      a.title, a.desc, statusDetail(a)]);
  });

  const csv = lines.map(row => row.map(csvCell).join(',')).join('\r\n');
  // BOM so Canva/Excel reads æ ø å correctly.
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `kach-weddings-tidslinje-${slug(couple)}.csv`);
}
