// Date helpers + Norwegian public-holiday calculation.
// Dates that land on a public holiday are bumped forward to the next working day.

export function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

// Parse a yyyy-mm-dd string into a local Date (no timezone surprises).
export function parseISO(val) {
  if (!val) return null;
  const p = val.split('-');
  if (p.length !== 3) return null;
  return new Date(+p[0], +p[1] - 1, +p[2]);
}

// Format a Date back to yyyy-mm-dd (for inputs and .ics).
export function toISO(d) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fmtDate(d, locale = 'nb-NO') {
  const s = d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fmtWeekday(d, locale = 'nb-NO') {
  return d.toLocaleDateString(locale, { weekday: 'long' }).toUpperCase();
}

export function monthStartBefore(W, months) {
  return new Date(W.getFullYear(), W.getMonth() - months, 1);
}

// ---------- Norwegian public holidays ----------
// Fixed: 1 Jan, 1 May, 17 May, 25 + 26 Dec.
// Movable (Easter/Pentecost-based): Maundy Thursday, Good Friday, Easter Sun + Mon,
// Ascension, Whit Sun + Mon.
export function easterSunday(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

const _holidayCache = {};
function _key(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }

export function holidaySet(year) {
  if (_holidayCache[year]) return _holidayCache[year];
  const s = new Set();
  const add = dt => s.add(_key(dt));
  add(new Date(year, 0, 1));   // Første nyttårsdag
  add(new Date(year, 4, 1));   // Arbeidernes dag
  add(new Date(year, 4, 17));  // Grunnlovsdag
  add(new Date(year, 11, 25)); // Første juledag
  add(new Date(year, 11, 26)); // Andre juledag
  const e = easterSunday(year);
  [-3, -2, 0, 1, 39, 49, 50].forEach(off => add(addDays(e, off)));
  _holidayCache[year] = s;
  return s;
}

export function isHoliday(d) { return holidaySet(d.getFullYear()).has(_key(d)); }

// Move forward to the first date that is not a public holiday.
export function bumpForward(d) {
  let x = new Date(d.getTime());
  while (isHoliday(x)) x = addDays(x, 1);
  return x;
}
