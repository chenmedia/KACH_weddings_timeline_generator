import { describe, it, expect } from 'vitest';
import {
  defaultState,
  validateState,
  sanitizeState,
  encodeStateToParams,
  decodeStateFromParams,
} from '../src/lib/state.js';
import nb from '../src/locales/nb.js';

describe('validateState', () => {
  it('clamps out-of-range numbers and reports a warning', () => {
    const { state, warnings } = validateState({ ...defaultState(), delw: '99' }, nb);
    expect(state.delw).toBe('20');
    expect(warnings.some((w) => w.id === 'delw')).toBe(true);
  });

  it('falls back when a numeric field is empty', () => {
    const { state } = validateState({ ...defaultState(), termDays: '' }, nb);
    expect(state.termDays).toBe('10');
  });
});

describe('sanitizeState', () => {
  it('drops unknown override keys and bad dates, with no prototype pollution', () => {
    const raw = JSON.parse(
      '{"overrides":{"__proto__":{"hidden":true},"bogus":{"hidden":true},"welcome":{"hidden":true,"date":"nope"}}}',
    );
    const s = sanitizeState(raw);
    expect(Object.keys(s.overrides)).toEqual(['welcome']);
    expect(s.overrides.welcome).toEqual({ hidden: true }); // bad date dropped
    expect(Object.getPrototypeOf(s.overrides)).toBe(Object.prototype);
    expect({}.hidden).toBeUndefined(); // global prototype untouched
  });

  it('coerces toggles and ignores non-string fields', () => {
    const s = sanitizeState({ tEngage: '1', tAlbum: false, couple: 42, place: 'Bergen' });
    expect(s.tEngage).toBe(true);
    expect(s.tAlbum).toBe(false);
    expect(s.place).toBe('Bergen');
  });
});

describe('share link encode/decode', () => {
  it('omits default values to keep links short', () => {
    const p = encodeStateToParams({ ...defaultState(), wdate: '2027-06-12' }, 'nb');
    expect(p.has('delw')).toBe(false); // default 4 omitted
    expect(p.get('wdate')).toBe('2027-06-12');
    expect(p.get('lang')).toBe('nb');
  });

  it('round-trips state through params', () => {
    const original = {
      ...defaultState(),
      wdate: '2027-06-12',
      couple: 'A & B',
      tEngage: true,
      overrides: { sneak: { hidden: true } },
    };
    const p = encodeStateToParams(original, 'en');
    const decoded = decodeStateFromParams(new URLSearchParams(p.toString()));
    expect(decoded.lang).toBe('en');
    expect(decoded.state.couple).toBe('A & B');
    expect(decoded.state.tEngage).toBe(true);
    expect(decoded.state.overrides.sneak).toEqual({ hidden: true });
  });

  it('returns null when there are no app params', () => {
    expect(decodeStateFromParams(new URLSearchParams(''))).toBeNull();
  });
});
