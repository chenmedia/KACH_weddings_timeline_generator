// @vitest-environment jsdom
/* global document, history, location, KeyboardEvent */
import { afterEach, describe, expect, it, vi } from 'vitest';
import journey from '../src/features/journey/index.js';
import { defaultJourney } from '../src/features/journey/model.js';
import { getMilestones } from '../src/lib/milestones.js';
import nb from '../src/locales/nb.js';

const ID = '11111111-1111-4111-8111-111111111111';
const project = {
  id: ID,
  couple: 'Ada & Emil',
  wdate: '2027-06-12',
  bdate: '2026-11-05',
  place: 'Oslo',
  delw: '4',
  sendDays: '1',
  termDays: '10',
  finalOverride: '',
  tEngage: true,
  tAlbum: false,
  themeId: 'kach',
  overrides: {},
};

function response(payload) {
  return { ok: true, status: 200, json: async () => payload };
}

afterEach(() => {
  vi.unstubAllGlobals();
  journey.reset();
  document.body.innerHTML = '';
  history.replaceState({}, '', '/');
});

describe('journey feature', () => {
  it('loads a selected couple with journey, timeline, sharing, referral and template tabs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url) => {
        if (url === '/api/timelines') {
          return Promise.resolve(
            response({ timelines: [{ id: ID, couple: project.couple, wdate: project.wdate }] }),
          );
        }
        if (String(url).startsWith(`/api/weddings/${ID}/workspace`)) {
          return Promise.resolve(
            response({
              project,
              projectVersion: 1,
              milestones: getMilestones(project, nb),
              journey: defaultJourney(),
              journeyVersion: 0,
            }),
          );
        }
        throw new Error(`Unexpected URL ${url}`);
      }),
    );
    const container = document.createElement('div');
    document.body.appendChild(container);
    await journey.mount(container, {
      authEnabled: true,
      isSignedIn: () => true,
      navigate: vi.fn(),
    });

    expect(container.querySelector('.journey-hero h2').textContent).toBe('Ada & Emil');
    expect(container.querySelector('.journey-hero img').getAttribute('src')).toBe(
      '/images/kach-journey-hero.jpeg',
    );
    expect(container.querySelectorAll('.journey-client-list button')).toHaveLength(1);
    expect(container.querySelectorAll('.journey-summary-card')).toHaveLength(4);
    expect(container.querySelector('.journey-ledger-intro h2').textContent).toContain('En relasjon');
    expect(container.querySelectorAll('.journey-milestone-number').length).toBeGreaterThan(8);
    let tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(5);
    expect(tabs[0].getAttribute('tabindex')).toBe('0');
    expect(tabs[1].getAttribute('tabindex')).toBe('-1');
    tabs[1].click();
    expect(container.querySelector('.journey-timeline-workspace')).toBeTruthy();
    expect(container.querySelector('.journey-timeline-preview .timeline')).toBeTruthy();
    expect(container.querySelector('.journey-compact-header h2').textContent).toBe('Ada & Emil');
    expect(container.querySelector('.journey-hero')).toBeNull();
    expect(container.querySelector('.journey-save-status').textContent).toBe('Alle endringer lagret');
    expect(container.querySelector('[data-action="share"]').textContent).toBe('Åpne deling');
    expect(location.search).toContain('tab=timeline');
    tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs[1].getAttribute('tabindex')).toBe('0');
    tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(container.querySelector('.journey-sharing-workspace .share-panel')).toBeTruthy();
    expect(document.activeElement.id).toBe('journey-tab-sharing');
    tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
    tabs[0].click();
    expect(container.querySelector('.journey-hero h2').textContent).toBe('Ada & Emil');
    tabs = container.querySelectorAll('[role="tab"]');
    tabs[2].click();
    expect(container.querySelector('.journey-sharing-workspace .share-panel')).toBeTruthy();
    tabs = container.querySelectorAll('[role="tab"]');
    tabs[3].click();
    expect(container.querySelectorAll('.referral-row')).toHaveLength(8);
  });
});
