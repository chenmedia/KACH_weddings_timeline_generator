import { describe, it, expect } from 'vitest';
import { getMilestones, parfotoAside } from '../src/lib/milestones.js';
import { defaultState } from '../src/lib/state.js';
import nb from '../src/locales/nb.js';

function stateWith(overrides = {}) {
  return { ...defaultState(), wdate: '2027-06-12', ...overrides };
}
const row = (data, key) => data.rows.find((r) => r.key === key);

describe('getMilestones', () => {
  it('returns null without a wedding date', () => {
    expect(getMilestones({ ...defaultState(), wdate: '' }, nb)).toBeNull();
  });

  it('produces every milestone and keeps the wedding day on W', () => {
    const data = getMilestones(stateWith(), nb);
    expect(data.rows.length).toBe(10);
    expect(row(data, 'day').dateISO).toBe('2027-06-12');
  });

  it('schedules the questionnaire on the 1st, 3 months before', () => {
    const data = getMilestones(stateWith(), nb);
    expect(row(data, 'timelineQ').dateISO).toBe('2027-03-01');
  });

  it('computes the final payment as wedding + sendDays + termDays (bumped)', () => {
    const data = getMilestones(stateWith({ sendDays: '1', termDays: '10' }), nb);
    expect(row(data, 'final').dateISO).toBe('2027-06-23');
  });

  it('honours a custom final-payment date', () => {
    const data = getMilestones(stateWith({ finalOverride: '2027-07-15' }), nb);
    expect(row(data, 'final').dateISO).toBe('2027-07-15');
  });

  it('respects overrides: hide, custom date, custom note', () => {
    const data = getMilestones(
      stateWith({
        overrides: {
          sneak: { hidden: true },
          gallery: { date: '2027-08-01' },
          thanks: { note: 'Egendefinert takk' },
        },
      }),
      nb,
    );
    expect(row(data, 'sneak')).toBeUndefined();
    expect(row(data, 'gallery').dateISO).toBe('2027-08-01');
    expect(row(data, 'thanks').desc).toBe('Egendefinert takk');
    expect(row(data, 'thanks').who).toBe('');
  });

  it('marks past dated milestones (not the wedding day)', () => {
    const data = getMilestones(stateWith({ wdate: '2000-06-01' }), nb);
    expect(row(data, 'gallery').isPast).toBe(true);
    expect(row(data, 'day').isPast).toBe(false);
  });
});

describe('parfotoAside seasons', () => {
  it('is null when the couple session is not included', () => {
    expect(parfotoAside(stateWith({ tEngage: false }), nb).seasons).toBeNull();
  });

  it('adds summer for very early bookings', () => {
    const a = parfotoAside(stateWith({ tEngage: true, bdate: '2025-01-01' }), nb);
    expect(a.seasons).toContain(nb.asides.parfoto.seasons.summer);
  });

  it('omits summer for late bookings', () => {
    const a = parfotoAside(stateWith({ tEngage: true, bdate: '2026-09-01' }), nb);
    expect(a.seasons).not.toContain(nb.asides.parfoto.seasons.summer);
  });
});
