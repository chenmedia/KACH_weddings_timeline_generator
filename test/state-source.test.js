import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LocalStorageSource, ApiSource, createStateSource } from '../src/lib/state-source.js';
import { defaultState } from '../src/lib/state.js';

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

describe('LocalStorageSource', () => {
  beforeEach(() => {
    globalThis.localStorage = fakeStorage();
  });
  afterEach(() => {
    delete globalThis.localStorage;
  });

  it('round-trips state and clears', async () => {
    const src = new LocalStorageSource();
    await src.save({ ...defaultState(), couple: 'X', wdate: '2027-06-12' });
    const loaded = await src.load();
    expect(loaded.couple).toBe('X');
    await src.clear();
    expect(await src.load()).toBeNull();
  });
});

describe('ApiSource', () => {
  afterEach(() => {
    delete globalThis.fetch;
  });

  it('POSTs to create, captures id, then GETs by id', async () => {
    const calls = [];
    globalThis.fetch = async (url, opts) => {
      calls.push({ url, method: opts?.method || 'GET' });
      return { ok: true, json: async () => ({ id: 't9', couple: 'Y' }) };
    };
    const src = new ApiSource();
    const row = await src.save({ couple: 'Y', wdate: '2027-06-12' });
    expect(row.id).toBe('t9');
    expect(src.timelineId).toBe('t9');
    const loaded = await src.load();
    expect(loaded.couple).toBe('Y');
    expect(calls[0].method).toBe('POST');
    expect(calls[1].url).toContain('/timelines/t9');
  });
});

describe('createStateSource', () => {
  it('defaults to localStorage and is opt-in for the API', () => {
    expect(createStateSource()).toBeInstanceOf(LocalStorageSource);
    expect(createStateSource({ apiEnabled: true })).toBeInstanceOf(ApiSource);
  });
});
