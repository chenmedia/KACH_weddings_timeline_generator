// @vitest-environment jsdom
/* global document */
// Smoke test for the Home launcher: greeting, a card per ready feature, the
// coming-soon teasers, and that a ready card navigates.
import { describe, it, expect } from 'vitest';
import { registerFeature } from '../src/app/registry.js';
import home from '../src/features/home/index.js';

describe('home feature descriptor', () => {
  it('is a valid feature at the root path', () => {
    expect(home.id).toBe('home');
    expect(home.path).toBe('/');
    expect(typeof home.mount).toBe('function');
  });
});

describe('home launcher mount', () => {
  it('renders greeting + ready tool card + coming-soon teasers; ready card navigates', () => {
    registerFeature({
      id: 'x',
      path: '/x',
      title: () => 'X Tool',
      summary: () => 'does x',
      status: 'ready',
    });
    const calls = [];
    const container = document.createElement('div');
    home.mount(container, { navigate: (p) => calls.push(p) });

    expect(container.querySelector('.home-greeting')).toBeTruthy();
    const cards = container.querySelectorAll('.tool-card');
    expect(cards.length).toBeGreaterThanOrEqual(3); // X + 2 coming-soon teasers
    expect(container.querySelector('.tool-card.is-soon')).toBeTruthy();

    const ready = container.querySelector('.tool-card:not(.is-soon)');
    expect(ready).toBeTruthy();
    ready.click();
    expect(calls).toContain('/x');
  });
});
