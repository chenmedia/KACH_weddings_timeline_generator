import { describe, it, expect } from 'vitest';
import { buildCSV } from '../src/exporters/csv.js';
import { buildICS } from '../src/exporters/ics.js';
import { defaultState } from '../src/lib/state.js';
import nb from '../src/locales/nb.js';

const state = {
  ...defaultState(),
  wdate: '2027-06-12',
  couple: 'Sara & Tom',
  place: 'Bergen',
  tEngage: true,
};

describe('buildCSV', () => {
  it('returns null without a wedding date', () => {
    expect(buildCSV({ ...defaultState(), wdate: '' }, nb)).toBeNull();
  });

  it('starts with a UTF-8 BOM and contains header + data + aside rows', () => {
    const { content, filename } = buildCSV(state, nb);
    expect(content.charCodeAt(0)).toBe(0xfeff);
    const rows = content.replace(/^\ufeff/, '').split('\r\n');
    expect(rows[0]).toContain('Brudepar');
    expect(content).toContain('Sara & Tom');
    expect(content).toContain('Aktuelle årstider'); // included couple session → seasons detail
    expect(filename).toMatch(/sara-tom\.csv$/);
  });
});

describe('buildICS', () => {
  it('wraps a valid VCALENDAR with one VEVENT per dated milestone', () => {
    const { content } = buildICS(state, nb);
    expect(content.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(content.trim().endsWith('END:VCALENDAR')).toBe(true);
    const events = content.match(/BEGIN:VEVENT/g) || [];
    expect(events.length).toBeGreaterThanOrEqual(7); // 8 dated milestones (2 are date-less bookings)
    expect(content).toContain('BEGIN:VALARM');
  });

  it('folds every line to <= 75 octets (RFC 5545)', () => {
    const { content } = buildICS(state, nb);
    const enc = new TextEncoder();
    for (const line of content.split('\r\n')) {
      expect(enc.encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it('escapes special characters in text values', () => {
    const s = { ...state, couple: 'A; B, C\\D' };
    const { content } = buildICS(s, nb);
    expect(content).toContain('A\\; B\\, C\\\\D');
  });
});
