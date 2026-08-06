// @vitest-environment jsdom
/* global document, sessionStorage */
// Smoke test for the Home overview: greeting + primary actions. "New couple"
// flags a handoff and navigates to the Brudepar feature; "all couples" just
// navigates. (Recent couples are DB-backed and covered elsewhere.)
import { describe, it, expect } from 'vitest';
import home, { NEW_KEY } from '../src/features/home/index.js';

describe('home feature descriptor', () => {
  it('is a valid feature at the root path', () => {
    expect(home.id).toBe('home');
    expect(home.path).toBe('/');
    expect(typeof home.mount).toBe('function');
  });
});

describe('home overview mount', () => {
  it('renders greeting + actions; "new couple" hands off and navigates to /timeline', () => {
    const calls = [];
    const container = document.createElement('div');
    // Anonymous ctx → no DB-backed recent list, just greeting + actions.
    home.mount(container, { navigate: (p) => calls.push(p), authEnabled: false });

    expect(container.querySelector('.home-greeting')).toBeTruthy();
    const buttons = container.querySelectorAll('.home-actions button');
    expect(buttons.length).toBe(2);

    buttons[0].click(); // "new couple"
    expect(sessionStorage.getItem(NEW_KEY)).toBe('1');
    expect(calls).toContain('/timeline');
  });
});
