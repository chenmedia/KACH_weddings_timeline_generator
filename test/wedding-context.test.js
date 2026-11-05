// @vitest-environment jsdom
/* global history, location */
import { describe, expect, it } from 'vitest';
import {
  pathForWedding,
  replaceSelectedWedding,
  selectedWeddingFromUrl,
} from '../src/lib/wedding-context.js';

const ID = '11111111-1111-4111-8111-111111111111';

describe('selected wedding URL context', () => {
  it('builds and reads bookmarkable internal links', () => {
    const path = pathForWedding('/journey', ID);
    expect(path).toBe(`/journey?wedding=${ID}`);
    expect(selectedWeddingFromUrl(`?wedding=${ID}`)).toBe(ID);
  });

  it('rejects malformed identifiers', () => {
    expect(pathForWedding('/journey', 'not-an-id')).toBe('/journey');
    expect(selectedWeddingFromUrl('?wedding=not-an-id')).toBe('');
  });

  it('replaces the current selection without a navigation', () => {
    history.replaceState({}, '', '/timeline');
    replaceSelectedWedding(ID);
    expect(location.pathname).toBe('/timeline');
    expect(location.search).toBe(`?wedding=${ID}`);
  });
});
