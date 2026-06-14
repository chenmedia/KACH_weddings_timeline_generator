import { describe, it, expect } from 'vitest';
import { addDays, parseISO, toISO, easterSunday, isHoliday, bumpForward, fmtDate } from '../src/lib/dates.js';

describe('dates', () => {
  it('addDays handles month/year rollover', () => {
    expect(toISO(addDays(parseISO('2027-01-31'), 1))).toBe('2027-02-01');
    expect(toISO(addDays(parseISO('2027-12-31'), 1))).toBe('2028-01-01');
  });

  it('parseISO / toISO round-trip', () => {
    expect(toISO(parseISO('2027-06-12'))).toBe('2027-06-12');
  });

  it('computes Easter Sunday (Gauss)', () => {
    expect(toISO(easterSunday(2024))).toBe('2024-03-31');
    expect(toISO(easterSunday(2025))).toBe('2025-04-20');
    expect(toISO(easterSunday(2027))).toBe('2027-03-28');
  });

  it('recognises fixed and movable Norwegian holidays', () => {
    expect(isHoliday(parseISO('2027-05-17'))).toBe(true); // Constitution Day
    expect(isHoliday(parseISO('2027-01-01'))).toBe(true); // New Year
    expect(isHoliday(parseISO('2027-12-25'))).toBe(true); // Christmas
    expect(isHoliday(parseISO('2027-03-26'))).toBe(true); // Good Friday (Easter -2)
    expect(isHoliday(parseISO('2027-06-10'))).toBe(false);
  });

  it('bumpForward skips holidays to the next working day', () => {
    // 17 May 2027 is a holiday → bump to 18 May
    expect(toISO(bumpForward(parseISO('2027-05-17')))).toBe('2027-05-18');
    // a normal day is unchanged
    expect(toISO(bumpForward(parseISO('2027-06-10')))).toBe('2027-06-10');
  });

  it('fmtDate capitalises the localised string', () => {
    const s = fmtDate(parseISO('2027-06-12'), 'nb-NO');
    expect(s[0]).toBe(s[0].toUpperCase());
    expect(s).toMatch(/2027/);
  });
});
