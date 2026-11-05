// @vitest-environment jsdom
/* global document, history */
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
  history.replaceState({}, '', '/');
});

describe('journey feature', () => {
  it('loads a selected couple and exposes all three working tabs', async () => {
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
    await journey.mount(container, {
      authEnabled: true,
      isSignedIn: () => true,
      navigate: vi.fn(),
    });

    expect(container.querySelector('.journey-hero h2').textContent).toBe('Ada & Emil');
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(3);
    tabs[1].click();
    expect(container.querySelectorAll('.referral-row')).toHaveLength(8);
  });
});
