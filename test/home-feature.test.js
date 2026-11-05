// @vitest-environment jsdom
/* global document, sessionStorage */
// Smoke test for the Home overview: greeting + primary actions. "New couple"
// flags a handoff and navigates to the Brudepar feature; "all couples" just
// navigates. (Recent couples are DB-backed and covered elsewhere.)
import { afterEach, describe, it, expect, vi } from 'vitest';
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
    expect(container.querySelector('.home-image img').getAttribute('src')).toBe(
      '/images/kach-journey-detail.jpg',
    );
    const buttons = container.querySelectorAll('.home-actions button');
    expect(buttons.length).toBe(2);

    buttons[0].click(); // "new couple"
    expect(sessionStorage.getItem(NEW_KEY)).toBe('1');
    expect(calls).toContain('/timeline');
  });

  it('loads one operational dashboard and opens the selected journey', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          summary: { weddingCount: 1, needsAttentionCount: 0, nextWeddingDate: '2027-06-12' },
          weddings: [
            {
              id,
              couple: 'Ada & Emil',
              weddingDate: '2027-06-12',
              location: 'Oslo',
              stageKey: 'planning',
              nextActionKey: 'planningCall',
              nextActionDate: '2027-03-08',
              nextActionTiming: 'upcoming',
              completedTaskCount: 2,
              totalTaskCount: 8,
            },
          ],
        }),
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const calls = [];
    const container = document.createElement('div');
    home.mount(container, {
      navigate: (path) => calls.push(path),
      authEnabled: true,
      isSignedIn: () => true,
    });

    await vi.waitFor(() => expect(container.querySelectorAll('.overview-row')).toHaveLength(1));
    expect(container.querySelectorAll('.home-season-summary > div')).toHaveLength(3);
    expect(container.querySelector('.overview-index').textContent).toBe('01');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    container.querySelector('.overview-primary').click();
    expect(calls).toContain(`/journey?wedding=${id}`);
  });
});

afterEach(() => vi.unstubAllGlobals());
