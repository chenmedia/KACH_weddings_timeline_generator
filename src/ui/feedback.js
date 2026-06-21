// Global, dependency-free feedback primitives shared across features:
//   toast(msg, {...})        — transient notification, optional action (Undo/Retry)
//   confirmDialog({...})     — accessible modal confirm (focus-trapped, Esc/backdrop)
// Prefer these over native alert()/confirm(). One toast host is created lazily.
import { el } from './dom.js';

let toastHost = null;
function host() {
  if (!toastHost) {
    toastHost = el('div', {
      class: 'toast-host no-print',
      role: 'region',
      'aria-live': 'polite',
      'aria-label': 'Notifications',
    });
  }
  if (!toastHost.isConnected) document.body.appendChild(toastHost);
  return toastHost;
}

/**
 * Show a toast. Returns a dismiss() function.
 * @param {string} message
 * @param {{ type?: 'info'|'success'|'error', actionLabel?: string,
 *           onAction?: () => void, duration?: number }} [opts]
 */
export function toast(message, opts = {}) {
  const { type = 'info', actionLabel, onAction } = opts;
  const duration = opts.duration ?? (actionLabel ? 6000 : 3500);
  const node = el('div', { class: `toast-item is-${type}`, role: type === 'error' ? 'alert' : 'status' }, [
    el('span', { class: 'toast-msg', text: message }),
  ]);
  let timer;
  const dismiss = () => {
    clearTimeout(timer);
    node.classList.remove('show');
    setTimeout(() => node.remove(), 300);
  };
  if (actionLabel && onAction) {
    const btn = el('button', { type: 'button', class: 'toast-action', text: actionLabel });
    btn.addEventListener('click', () => {
      onAction();
      dismiss();
    });
    node.appendChild(btn);
  }
  host().appendChild(node);
  requestAnimationFrame(() => node.classList.add('show'));
  if (duration > 0) timer = setTimeout(dismiss, duration);
  return dismiss;
}

/**
 * Accessible confirm dialog. Resolves true on confirm; false on cancel/Esc/backdrop.
 * @param {{ title?: string, body?: string, confirmLabel?: string,
 *           cancelLabel?: string, danger?: boolean }} [opts]
 * @returns {Promise<boolean>}
 */
export function confirmDialog(opts = {}) {
  const { title = '', body = '', confirmLabel = 'OK', cancelLabel = 'Cancel', danger = false } = opts;
  return new Promise((resolve) => {
    const prevFocus = /** @type {any} */ (document.activeElement);
    const titleId = 'dlg-' + Math.random().toString(36).slice(2, 8);
    const cancelBtn = el('button', { type: 'button', class: 'btn-ghost', text: cancelLabel });
    const okBtn = el('button', {
      type: 'button',
      class: danger ? 'btn-danger' : 'btn-primary',
      text: confirmLabel,
    });
    const panel = el(
      'div',
      { class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
      [
        title ? el('h2', { class: 'dialog-title', id: titleId, text: title }) : null,
        body ? el('p', { class: 'dialog-body', text: body }) : null,
        el('div', { class: 'dialog-actions cluster' }, [cancelBtn, okBtn]),
      ],
    );
    const backdrop = el('div', { class: 'dialog-backdrop no-print' }, [panel]);

    const close = (val) => {
      document.removeEventListener('keydown', onKey);
      backdrop.remove();
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      resolve(val);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(false);
      } else if (e.key === 'Tab') {
        const f = [cancelBtn, okBtn];
        const i = f.indexOf(/** @type {any} */ (document.activeElement));
        if (e.shiftKey && i <= 0) {
          e.preventDefault();
          okBtn.focus();
        } else if (!e.shiftKey && i === f.length - 1) {
          e.preventDefault();
          cancelBtn.focus();
        }
      }
    };
    cancelBtn.addEventListener('click', () => close(false));
    okBtn.addEventListener('click', () => close(true));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close(false);
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(backdrop);
    okBtn.focus();
  });
}
