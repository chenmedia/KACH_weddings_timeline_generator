// @vitest-environment jsdom
/* global document */
// Smoke test for the feature-registry refactor: the timeline feature must still
// expose a valid descriptor, claim the couple route, and render anonymously.
import { describe, it, expect } from 'vitest';
import timeline from '../src/features/timeline/index.js';

function ctx() {
  return {
    authEnabled: false,
    isSignedIn: () => false,
    getToken: async () => undefined,
    mountUserButton() {},
    navigate() {},
    requestRender() {},
  };
}

describe('timeline feature descriptor', () => {
  it('is a valid feature', () => {
    expect(timeline.id).toBe('timeline');
    expect(timeline.path).toBe('/');
    expect(typeof timeline.mount).toBe('function');
    expect(typeof timeline.mountPublic).toBe('function');
    expect(typeof timeline.reset).toBe('function');
  });

  it('claims the couple read-only route, not the app route', () => {
    expect(timeline.matchPublic('/c/abc123', new URLSearchParams())).toEqual({ slug: 'abc123' });
    expect(timeline.matchPublic('/', new URLSearchParams())).toBeNull();
  });
});

describe('timeline anonymous mount', () => {
  it('renders the controls form and the timeline output', () => {
    const container = document.createElement('div');
    timeline.mount(container, ctx());
    expect(container.querySelector('.controls')).toBeTruthy();
    const output = container.querySelector('#output');
    expect(output).toBeTruthy();
    // default state ships a wedding date, so the milestone timeline renders
    expect(output.querySelector('.timeline')).toBeTruthy();
    timeline.reset();
  });
});
