import { describe, it, expect } from 'vitest';
import { isShareExpired, toDateInputValue, fromDateInputValue, formatViewed } from '../src/lib/share.js';

const locale = {
  dateLocale: 'en-GB',
  share: {
    neverViewed: 'Not opened yet',
    viewed: (n, date) => `Seen ${n} time(s) · last opened ${date}`,
  },
};

describe('isShareExpired', () => {
  it('treats null/empty as not expired', () => {
    expect(isShareExpired(null)).toBe(false);
    expect(isShareExpired('')).toBe(false);
    expect(isShareExpired(undefined)).toBe(false);
  });
  it('is true for a past date, false for a future date', () => {
    const now = Date.parse('2026-06-21T12:00:00Z');
    expect(isShareExpired('2026-06-20T12:00:00Z', now)).toBe(true);
    expect(isShareExpired('2026-06-22T12:00:00Z', now)).toBe(false);
  });
  it('ignores unparseable values', () => {
    expect(isShareExpired('not-a-date')).toBe(false);
  });
});

describe('date input round-trip', () => {
  it('formats an ISO timestamp to YYYY-MM-DD', () => {
    expect(toDateInputValue('2026-06-21T23:59:59.000Z')).toBe('2026-06-21');
    expect(toDateInputValue(null)).toBe('');
    expect(toDateInputValue('garbage')).toBe('');
  });
  it('parses a date input to an end-of-day ISO string, or null', () => {
    expect(fromDateInputValue('')).toBeNull();
    const iso = fromDateInputValue('2026-06-21');
    expect(iso).toMatch(/^2026-06-21T/);
    expect(new Date(iso).getHours()).toBe(23); // local end-of-day
  });
});

describe('formatViewed', () => {
  it('returns the never-viewed string with no views', () => {
    expect(formatViewed(null, 0, locale)).toBe('Not opened yet');
    expect(formatViewed('2026-06-21T10:00:00Z', 0, locale)).toBe('Not opened yet');
  });
  it('formats the count and last-opened date', () => {
    const out = formatViewed('2026-06-21T10:00:00Z', 3, locale);
    expect(out).toContain('3');
    expect(out).toContain('2026');
  });
});
