// @vitest-environment jsdom
/* global document */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildNotificationControl,
  closeNotificationCenter,
  notificationPresentation,
  notificationTargetPath,
} from '../src/app/notifications.js';
import en from '../src/locales/en.js';

const TIMELINE_ID = '11111111-1111-4111-8111-111111111111';

function response(payload) {
  return { ok: true, status: 200, json: async () => payload };
}

function notification(overrides = {}) {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    timelineId: TIMELINE_ID,
    kind: 'task.overdue',
    itemKey: 'welcomeGuide',
    payload: {
      couple: 'Ada & Emil',
      taskKey: 'welcomeGuide',
      dueDate: '2026-11-01',
      targetTab: 'journey',
    },
    readAt: null,
    createdAt: '2026-11-06T10:00:00.000Z',
    ...overrides,
  };
}

describe('notification presentation', () => {
  it('maps an overdue task to readable copy and a durable client link', () => {
    const item = notification();
    const copy = notificationPresentation(item, en);
    expect(copy.title).toBe('Overdue task');
    expect(copy.body).toContain('Ada & Emil');
    expect(copy.body).toContain('Send a personal welcome and guide');
    expect(notificationTargetPath(item)).toBe(`/journey?wedding=${TIMELINE_ID}`);
  });

  it('routes review comments directly to sharing', () => {
    const item = notification({
      kind: 'review.comment',
      payload: { couple: 'Ada & Emil', actorName: 'Ada', targetTab: 'sharing' },
    });
    expect(notificationTargetPath(item)).toBe(`/journey?wedding=${TIMELINE_ID}&tab=sharing`);
    expect(notificationPresentation(item, en).body).toContain('Ada commented');
  });
});

describe('notification center', () => {
  it('shows unread items, opens the relevant client and marks notifications as read', async () => {
    const second = notification({
      id: '33333333-3333-4333-8333-333333333333',
      kind: 'sync.failed',
      payload: { couple: 'Nora & Elias', provider: 'FOCL', targetTab: 'client' },
    });
    const fetchMock = vi.fn((url, options = {}) => {
      if (url === '/api/notifications' && !options.method) {
        return Promise.resolve(response({ notifications: [notification(), second], unreadCount: 2 }));
      }
      if (url === '/api/notifications' && options.method === 'POST') {
        return Promise.resolve(response({ read: [notification().id], unreadCount: 0 }));
      }
      throw new Error(`Unexpected request ${options.method || 'GET'} ${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const navigate = vi.fn();
    const beforeOpen = vi.fn();
    const trigger = buildNotificationControl({ locale: en, navigate, beforeOpen });
    document.body.appendChild(trigger);

    await vi.waitFor(() => expect(trigger.querySelector('.notification-badge').textContent).toBe('2'));
    trigger.click();
    expect(beforeOpen).toHaveBeenCalledOnce();
    expect(document.querySelectorAll('.notification-list li')).toHaveLength(2);
    expect(document.querySelector('.notification-panel').textContent).toContain('Overdue task');

    document.querySelector('.notification-mark-all').click();
    expect(document.querySelector('.notification-toolbar > span').textContent).toBe('0 unread');
    expect(trigger.querySelector('.notification-badge').hidden).toBe(true);
    expect(document.querySelectorAll('.notification-list li.is-unread')).toHaveLength(0);

    document.querySelector('.notification-item-action').click();
    expect(navigate).toHaveBeenCalledWith(`/journey?wedding=${TIMELINE_ID}`);
    expect(document.querySelector('.notification-panel')).toBeNull();
    await vi.waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/notifications',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('renders the empty state and keeps mark-all disabled', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response({ notifications: [], unreadCount: 0 }))),
    );
    const trigger = buildNotificationControl({ locale: en, navigate: vi.fn() });
    document.body.appendChild(trigger);
    await vi.waitFor(() => expect(trigger.querySelector('.notification-badge').hidden).toBe(true));
    trigger.click();
    await vi.waitFor(() =>
      expect(document.querySelector('.notification-state.is-empty').textContent).toContain(
        'Everything is up to date',
      ),
    );
    expect(document.querySelector('.notification-mark-all').disabled).toBe(true);
  });
});

afterEach(() => {
  closeNotificationCenter();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
  document.body.className = '';
});
