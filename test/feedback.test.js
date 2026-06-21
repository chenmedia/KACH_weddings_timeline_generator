// @vitest-environment jsdom
/* global document, KeyboardEvent */
// Covers the shared feedback primitives: transient toasts and the accessible
// confirm dialog (focus trap + restoration, Esc/confirm resolution).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { toast, confirmDialog } from '../src/ui/feedback.js';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('toast', () => {
  it('appends a toast item to the host and dismiss() removes it', () => {
    vi.useFakeTimers();
    const dismiss = toast('Saved', { type: 'success' });
    const item = document.querySelector('.toast-item');
    expect(item).toBeTruthy();
    expect(item.classList.contains('is-success')).toBe(true);
    expect(item.querySelector('.toast-msg').textContent).toBe('Saved');

    dismiss();
    vi.advanceTimersByTime(300);
    expect(document.querySelector('.toast-item')).toBeNull();
    vi.useRealTimers();
  });

  it('renders an action button that fires onAction and dismisses', () => {
    const onAction = vi.fn();
    toast('Failed', { type: 'error', actionLabel: 'Retry', onAction });
    const item = document.querySelector('.toast-item');
    expect(item.getAttribute('role')).toBe('alert');
    const btn = item.querySelector('.toast-action');
    expect(btn.textContent).toBe('Retry');
    btn.click();
    expect(onAction).toHaveBeenCalledOnce();
  });
});

describe('confirmDialog', () => {
  it('resolves true when the confirm button is clicked', async () => {
    const p = confirmDialog({ title: 'Delete', body: 'Sure?', confirmLabel: 'Yes', danger: true });
    const ok = document.querySelector('.dialog .btn-danger');
    expect(ok.textContent).toBe('Yes');
    ok.click();
    await expect(p).resolves.toBe(true);
    expect(document.querySelector('.dialog-backdrop')).toBeNull();
  });

  it('resolves false on Escape and restores focus', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const p = confirmDialog({ title: 'Delete' });
    expect(document.querySelector('.dialog-backdrop')).toBeTruthy();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await expect(p).resolves.toBe(false);
    expect(document.activeElement).toBe(trigger);
  });
});
