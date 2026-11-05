// @vitest-environment jsdom
/* global document, history, sessionStorage */
// Smoke test for the feature-registry refactor: the timeline feature must still
// expose a valid descriptor, claim the couple route, and render anonymously.
import { describe, it, expect, vi } from 'vitest';
import timeline from '../src/features/timeline/index.js';

function ctx() {
  return {
    authEnabled: false,
    isSignedIn: () => false,
    getToken: async () => undefined,
    navigate() {},
    requestRender() {},
  };
}

describe('timeline feature descriptor', () => {
  it('is a valid feature', () => {
    expect(timeline.id).toBe('timeline');
    expect(timeline.path).toBe('/timeline');
    expect(timeline.hideFromNav).toBe(true);
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

  it('redirects signed-in legacy editor links to the unified client workspace', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    history.replaceState({}, '', `/timeline?wedding=${id}`);
    sessionStorage.clear();
    const navigate = vi.fn();
    timeline.mount(document.createElement('div'), {
      ...ctx(),
      authEnabled: true,
      isSignedIn: () => true,
      navigate,
    });

    expect(navigate).toHaveBeenCalledWith(`/journey?wedding=${id}&tab=timeline`);
    timeline.reset();
  });
});
