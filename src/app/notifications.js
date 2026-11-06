import { api } from '../lib/api-client.js';
import { pathForWeddingTab } from '../lib/wedding-context.js';
import { el } from '../ui/dom.js';
import { icons } from '../ui/icons.js';

let activeCleanup = null;

export function closeNotificationCenter({ restoreFocus = false } = {}) {
  const cleanup = activeCleanup;
  activeCleanup = null;
  cleanup?.(restoreFocus);
}

export function notificationTargetPath(notification) {
  if (!notification?.timelineId) return '/';
  return pathForWeddingTab(notification.timelineId, notification.payload?.targetTab || 'journey');
}

function formatTimestamp(value, locale) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale.dateLocale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatDueDate(value, locale) {
  const date = new Date(`${String(value || '').slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale.dateLocale, { dateStyle: 'medium' }).format(date);
}

export function notificationPresentation(notification, locale) {
  const copy = locale.notifications;
  const payload = notification.payload || {};
  const couple = payload.couple || locale.timeline.defaultCouple;
  if (notification.kind === 'task.overdue') {
    const task = locale.journey.tasks[payload.taskKey] || copy.fallbackTask;
    return {
      title: copy.types.overdueTitle,
      body: copy.types.overdueBody(couple, task, formatDueDate(payload.dueDate, locale)),
    };
  }
  if (notification.kind === 'review.comment') {
    return {
      title: copy.types.commentTitle,
      body: copy.types.commentBody(payload.actorName || copy.couple, couple),
    };
  }
  if (notification.kind === 'review.changes_requested') {
    return {
      title: copy.types.changeTitle,
      body: copy.types.changeBody(payload.actorName || copy.couple, couple),
    };
  }
  if (notification.kind === 'review.approved') {
    return {
      title: copy.types.approvedTitle,
      body: copy.types.approvedBody(payload.actorName || copy.couple, couple),
    };
  }
  if (notification.kind === 'sync.failed') {
    return {
      title: copy.types.syncTitle,
      body: copy.types.syncBody(payload.provider || 'FOCL', couple),
    };
  }
  return { title: copy.types.defaultTitle, body: copy.types.defaultBody(couple) };
}

function trapTab(event, container) {
  const items = container.querySelectorAll(
    'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function loadingState(copy) {
  return el('div', { class: 'notification-loading', role: 'status', 'aria-label': copy.loading }, [
    el('span'),
    el('span'),
    el('span'),
  ]);
}

export function buildNotificationControl({ locale, navigate, beforeOpen = null }) {
  const copy = locale.notifications;
  const trigger = el('button', {
    type: 'button',
    class: 'side-item notification-trigger',
    title: copy.title,
    'aria-haspopup': 'dialog',
    'aria-expanded': 'false',
    'aria-label': copy.open,
  });
  trigger.innerHTML =
    `<span class="side-ico" aria-hidden="true">${icons.notifications}</span>` +
    `<span class="side-label">${copy.title}</span>`;
  const badge = el('span', { class: 'notification-badge', 'aria-hidden': 'true' });
  trigger.appendChild(badge);

  const state = {
    loading: true,
    error: false,
    items: [],
    unreadCount: 0,
    body: null,
    markAll: null,
    unreadLabel: null,
  };

  const syncTrigger = () => {
    const count = state.unreadCount;
    badge.hidden = count < 1;
    badge.textContent = count > 99 ? '99+' : String(count);
    trigger.setAttribute('aria-label', count ? copy.openUnread(count) : copy.open);
    if (state.unreadLabel) state.unreadLabel.textContent = copy.unread(count);
  };

  const markOneRead = (notification) => {
    if (notification.readAt) return;
    notification.readAt = new Date().toISOString();
    state.unreadCount = Math.max(0, state.unreadCount - 1);
    syncTrigger();
    api.markNotificationsRead([notification.id]).catch(() => {});
  };

  const renderPanelBody = () => {
    if (!state.body?.isConnected) return;
    state.body.innerHTML = '';
    if (state.markAll) state.markAll.disabled = state.loading || state.unreadCount === 0;
    if (state.loading) {
      state.body.appendChild(loadingState(copy));
      return;
    }
    if (state.error) {
      const retry = el('button', { type: 'button', class: 'btn-ghost', text: copy.retry });
      retry.addEventListener('click', () => load());
      state.body.appendChild(
        el('div', { class: 'notification-state' }, [el('p', { text: copy.error }), retry]),
      );
      return;
    }
    if (!state.items.length) {
      state.body.appendChild(
        el('div', { class: 'notification-state is-empty' }, [
          el('h3', { text: copy.emptyTitle }),
          el('p', { text: copy.emptyBody }),
        ]),
      );
      return;
    }
    const list = el('ol', { class: 'notification-list' });
    state.items.forEach((notification) => {
      const presentation = notificationPresentation(notification, locale);
      const open = el('button', { type: 'button', class: 'notification-item-action' }, [
        el('span', { class: 'notification-item-topline' }, [
          !notification.readAt ? el('span', { class: 'notification-new', text: copy.newLabel }) : null,
          el('time', {
            datetime: notification.createdAt,
            text: formatTimestamp(notification.createdAt, locale),
          }),
        ]),
        el('strong', { text: presentation.title }),
        el('p', { text: presentation.body }),
        el('span', { class: 'notification-open-label', text: copy.openItem }),
      ]);
      open.addEventListener('click', () => {
        markOneRead(notification);
        const target = notificationTargetPath(notification);
        closeNotificationCenter();
        navigate(target);
      });
      list.appendChild(el('li', { class: notification.readAt ? '' : 'is-unread' }, [open]));
    });
    state.body.appendChild(list);
  };

  const load = async ({ silent = false } = {}) => {
    if (!silent) {
      state.loading = true;
      state.error = false;
      renderPanelBody();
    }
    try {
      const result = await api.notifications();
      state.items = result.notifications || [];
      state.unreadCount = Number(result.unreadCount) || 0;
      state.error = false;
    } catch {
      if (!silent) state.error = true;
    } finally {
      state.loading = false;
      syncTrigger();
      renderPanelBody();
    }
  };

  const openPanel = () => {
    beforeOpen?.();
    closeNotificationCenter();
    const backdrop = el('div', { class: 'notification-backdrop', 'aria-hidden': 'true' });
    const panel = el('aside', {
      class: 'notification-panel',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'notification-panel-title',
    });
    const close = el('button', {
      type: 'button',
      class: 'notification-close',
      text: '×',
      'aria-label': copy.close,
    });
    const markAll = el('button', {
      type: 'button',
      class: 'notification-mark-all',
      text: copy.markAll,
      ...(state.unreadCount ? {} : { disabled: '' }),
    });
    const body = el('div', { class: 'notification-panel-body', 'aria-live': 'polite' });
    const unreadLabel = el('span', { text: copy.unread(state.unreadCount) });
    state.body = body;
    state.markAll = markAll;
    state.unreadLabel = unreadLabel;
    panel.append(
      el('header', { class: 'notification-panel-head' }, [
        el('div', {}, [
          el('p', { class: 'notification-kicker', text: copy.kicker }),
          el('h2', { id: 'notification-panel-title', text: copy.title }),
          el('p', { text: copy.intro }),
        ]),
        close,
      ]),
      el('div', { class: 'notification-toolbar' }, [unreadLabel, markAll]),
      body,
    );

    const cleanup = (restoreFocus) => {
      backdrop.remove();
      panel.remove();
      state.body = null;
      state.markAll = null;
      state.unreadLabel = null;
      trigger.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('notification-lock');
      document.removeEventListener('keydown', onKeydown);
      if (restoreFocus && trigger.isConnected) trigger.focus();
    };
    const onKeydown = (event) => {
      if (event.key === 'Escape') closeNotificationCenter({ restoreFocus: true });
      else if (event.key === 'Tab') trapTab(event, panel);
    };
    const closePanel = () => closeNotificationCenter({ restoreFocus: true });
    close.addEventListener('click', closePanel);
    backdrop.addEventListener('click', closePanel);
    markAll.addEventListener('click', () => {
      const now = new Date().toISOString();
      state.items.forEach((notification) => {
        notification.readAt = notification.readAt || now;
      });
      state.unreadCount = 0;
      syncTrigger();
      renderPanelBody();
      api.markAllNotificationsRead().catch(() => load());
    });

    activeCleanup = cleanup;
    trigger.setAttribute('aria-expanded', 'true');
    document.body.append(backdrop, panel);
    document.body.classList.add('notification-lock');
    document.addEventListener('keydown', onKeydown);
    renderPanelBody();
    close.focus();
  };

  trigger.addEventListener('click', openPanel);
  syncTrigger();
  load();
  const poll = window.setInterval(() => {
    if (!trigger.isConnected) {
      window.clearInterval(poll);
      return;
    }
    load({ silent: true });
  }, 60_000);
  return trigger;
}
