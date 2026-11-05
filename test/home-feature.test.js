// @vitest-environment jsdom
/* global document */
// Smoke test for the Home overview: primary actions now enter the unified
// client workspace rather than a separate timeline dashboard.
import { afterEach, describe, it, expect, vi } from 'vitest';
import home from '../src/features/home/index.js';

describe('home feature descriptor', () => {
  it('is a valid feature at the root path', () => {
    expect(home.id).toBe('home');
    expect(home.path).toBe('/');
    expect(typeof home.mount).toBe('function');
  });
});

describe('home overview mount', () => {
  it('renders greeting + actions and starts new couples in the unified workspace', () => {
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
    expect(calls).toContain('/journey?new=1&tab=timeline');
  });

  it('loads one operational dashboard and opens the selected journey', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const overdueId = '22222222-2222-4222-8222-222222222222';
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          summary: { weddingCount: 2, needsAttentionCount: 1, nextWeddingDate: '2027-06-12' },
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
            {
              id: overdueId,
              couple: 'Nora & Elias',
              weddingDate: '2027-08-14',
              location: 'Bergen',
              stageKey: 'welcome',
              nextActionKey: 'welcomeGuide',
              nextActionDate: '2026-11-01',
              nextActionTiming: 'overdue',
              completedTaskCount: 0,
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

    await vi.waitFor(() => expect(container.querySelectorAll('.overview-row')).toHaveLength(2));
    expect(container.querySelectorAll('.home-season-summary > div')).toHaveLength(3);
    expect(container.querySelector('.overview-index').textContent).toBe('01');
    expect(container.querySelectorAll('.overview-filters button')).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    container.querySelector('.overview-primary').click();
    expect(calls).toContain(`/journey?wedding=${id}`);
    container.querySelector('.overview-secondary').click();
    expect(calls).toContain(`/journey?wedding=${id}&tab=timeline`);

    container.querySelectorAll('.overview-filters button')[1].click();
    expect(container.querySelectorAll('.overview-row')).toHaveLength(1);
    expect(container.querySelector('.overview-couple h3').textContent).toBe('Nora & Elias');
    expect(container.querySelector('.overview-filter-empty').hidden).toBe(true);
  });
});

afterEach(() => vi.unstubAllGlobals());
