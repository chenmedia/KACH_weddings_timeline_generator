import { getMilestones } from '../lib/milestones.js';
import { slug, downloadBlob } from '../lib/download.js';

// RFC 5545 escaping for text values.
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function ymd(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}`;
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

// Fold long lines at 75 octets (UTF-8) per RFC 5545, never splitting a character.
const _enc = new TextEncoder();
function fold(line) {
  if (_enc.encode(line).length <= 75) return line;
  let result = '';
  let lineBytes = 0;
  for (const ch of line) {
    const b = _enc.encode(ch).length;
    if (lineBytes + b > 75) {
      result += '\r\n ';
      lineBytes = 1;
    } // continuation, leading space = 1 octet
    result += ch;
    lineBytes += b;
  }
  return result;
}

// Build an all-day VEVENT for each dated milestone, plus the wedding day.
// Build the .ics calendar text. Pure (no DOM) so it can be unit-tested.
// Returns { content, filename } or null when there is no wedding date.
export function buildICS(state, locale) {
  const data = getMilestones(state, locale);
  if (!data) return null;

  const couple = (state.couple || '').trim();
  const place = (state.place || '').trim();
  const dtstamp = stamp();
  const uidBase = `${Date.now()}@kachweddings`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KACH Weddings//Tidslinje//' + locale.code.toUpperCase(),
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' + esc(locale.ics.calName + (couple ? ' · ' + couple : '')),
  ];

  data.rows.forEach((r, i) => {
    if (!r.date) return; // skip date-less (booking) items
    const start = r.date;
    const end = new Date(start.getTime());
    end.setDate(end.getDate() + 1); // DTEND exclusive
    const descParts = [r.desc, r.who].filter(Boolean);
    const summary = r.isDay && couple ? `${r.title} · ${couple}` : r.title;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${i}-${uidBase}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${ymd(start)}`);
    lines.push(`DTEND;VALUE=DATE:${ymd(end)}`);
    lines.push('SUMMARY:' + esc(summary));
    if (descParts.length) lines.push('DESCRIPTION:' + esc(descParts.join('\n\n')));
    if (place && r.isDay) lines.push('LOCATION:' + esc(place));
    lines.push('TRANSP:TRANSPARENT');
    // Reminder at 09:00 the day before for actionable milestones.
    if (!r.isPast) {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push('DESCRIPTION:' + esc(locale.ics.reminder + ': ' + r.title));
      lines.push('TRIGGER:-P1DT15H'); // ~09:00 the day before an all-day event
      lines.push('END:VALARM');
    }
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  return {
    content: lines.map(fold).join('\r\n'),
    filename: `kach-weddings-tidslinje-${slug(couple)}.ics`,
  };
}

export function downloadICS(state, locale) {
  const out = buildICS(state, locale);
  if (!out) {
    alert(locale.alerts.pickDate);
    return;
  }
  downloadBlob(new Blob([out.content], { type: 'text/calendar;charset=utf-8;' }), out.filename);
}
