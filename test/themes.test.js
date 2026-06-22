import { describe, it, expect } from 'vitest';
import {
  THEMES,
  THEME_TOKENS,
  DEFAULT_THEME_ID,
  getTheme,
  sanitizeThemeId,
  themeVars,
  hexToRgb,
  themeRgbUnit,
} from '../src/lib/themes.js';
import { defaultState, sanitizeState, encodeStateToParams, decodeStateFromParams } from '../src/lib/state.js';
import { rowToState, stateToRow } from '../src/lib/row-mapper.js';

describe('theme registry', () => {
  it('has the default theme and unique ids', () => {
    const ids = THEMES.map((t) => t.id);
    expect(ids).toContain(DEFAULT_THEME_ID);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every theme defines all tokens as valid hex colours and a label per locale', () => {
    for (const th of THEMES) {
      expect(th.label.nb).toBeTruthy();
      expect(th.label.en).toBeTruthy();
      for (const token of THEME_TOKENS) {
        expect(th.vars[token], `${th.id} ${token}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});

describe('sanitizeThemeId', () => {
  it('passes through a known id and falls back otherwise', () => {
    expect(sanitizeThemeId('sand')).toBe('sand');
    expect(sanitizeThemeId('nope')).toBe(DEFAULT_THEME_ID);
    expect(sanitizeThemeId(null)).toBe(DEFAULT_THEME_ID);
    expect(sanitizeThemeId(42)).toBe(DEFAULT_THEME_ID);
  });
});

describe('colour helpers', () => {
  it('getTheme falls back to the default for unknown ids', () => {
    expect(getTheme('nope').id).toBe(DEFAULT_THEME_ID);
  });

  it('hexToRgb parses components', () => {
    expect(hexToRgb('#eceae6')).toEqual([236, 234, 230]);
  });

  it('themeRgbUnit returns three 0..1 components', () => {
    const rgb = themeRgbUnit('kach', '--bg');
    expect(rgb).toHaveLength(3);
    rgb.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
    rgb.forEach((v) => expect(v).toBeLessThanOrEqual(1));
  });

  it('themeVars returns the token map', () => {
    expect(themeVars('kach')['--bg']).toBe('#eceae6');
  });
});

describe('themeId flows through state', () => {
  it('defaults to the default theme and survives sanitization', () => {
    expect(defaultState().themeId).toBe(DEFAULT_THEME_ID);
    expect(sanitizeState({ themeId: 'sand' }).themeId).toBe('sand');
    expect(sanitizeState({ themeId: 'bogus' }).themeId).toBe(DEFAULT_THEME_ID);
  });

  it('round-trips through share-link params (omitting the default)', () => {
    const def = encodeStateToParams({ ...defaultState(), wdate: '2027-06-12' }, 'nb');
    expect(def.has('theme')).toBe(false);
    const p = encodeStateToParams({ ...defaultState(), themeId: 'sand' }, 'nb');
    expect(p.get('theme')).toBe('sand');
    const decoded = decodeStateFromParams(new URLSearchParams(p.toString()));
    expect(decoded.state.themeId).toBe('sand');
  });

  it('round-trips through the DB row mapper', () => {
    const row = stateToRow({ ...defaultState(), wdate: '2027-06-12', themeId: 'sand' });
    expect(row.theme_id).toBe('sand');
    expect(rowToState({ id: 'x', ...row, lang: 'nb' }).themeId).toBe('sand');
  });
});
