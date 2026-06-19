import { describe, it, expect } from 'vitest';
import { rowToState, stateToRow, overridesToRows } from '../src/lib/row-mapper.js';
import { defaultState } from '../src/lib/state.js';

const dbRow = {
  id: 't1',
  couple: 'Sara & Tom',
  wdate: '2027-06-12',
  bdate: null,
  place: 'Bergen',
  delw: 5,
  send_days: 2,
  term_days: 14,
  final_override: null,
  t_engage: true,
  t_album: false,
  lang: 'nb',
};

describe('rowToState', () => {
  it('maps DB columns to the app state shape', () => {
    const s = rowToState(dbRow, [
      { item_key: 'sneak', hidden: true },
      { item_key: 'gallery', date: '2027-08-01', note: 'x' },
    ]);
    expect(s.couple).toBe('Sara & Tom');
    expect(s.wdate).toBe('2027-06-12');
    expect(s.place).toBe('Bergen');
    expect(s.delw).toBe('5');
    expect(s.sendDays).toBe('2');
    expect(s.termDays).toBe('14');
    expect(s.tEngage).toBe(true);
    expect(s.overrides.sneak).toEqual({ hidden: true });
    expect(s.overrides.gallery).toEqual({ date: '2027-08-01', note: 'x' });
  });

  it('formats Date objects to yyyy-mm-dd', () => {
    const s = rowToState({ ...dbRow, wdate: new Date(2027, 5, 12) });
    expect(s.wdate).toBe('2027-06-12');
  });
});

describe('stateToRow', () => {
  it('produces snake_case inputs with numeric/null coercion', () => {
    const r = stateToRow({ ...defaultState(), couple: 'A', wdate: '2027-06-12', delw: '5', sendDays: '2' });
    expect(r.couple).toBe('A');
    expect(r.wdate).toBe('2027-06-12');
    expect(r.delw).toBe(5);
    expect(r.send_days).toBe(2);
    expect(r.bdate).toBeNull();
  });
});

describe('round-trip', () => {
  it('state → row → state preserves inputs', () => {
    const original = {
      ...defaultState(),
      couple: 'A & B',
      wdate: '2027-06-12',
      place: 'Oslo',
      delw: '6',
      tEngage: true,
    };
    const back = rowToState({ id: 'x', ...stateToRow(original), lang: 'nb' });
    expect(back.couple).toBe('A & B');
    expect(back.place).toBe('Oslo');
    expect(back.delw).toBe('6');
    expect(back.tEngage).toBe(true);
  });
});

describe('overridesToRows', () => {
  it('flattens overrides into rows for a timeline', () => {
    const rows = overridesToRows('t1', {
      overrides: { sneak: { hidden: true }, gallery: { date: '2027-08-01' } },
    });
    expect(rows).toContainEqual({
      timeline_id: 't1',
      item_key: 'sneak',
      hidden: true,
      date: null,
      note: null,
    });
    expect(rows.find((r) => r.item_key === 'gallery').date).toBe('2027-08-01');
  });
});
