// @vitest-environment jsdom
/* global document */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { accountIdentity, buildAccountControl, closeAccountSurface } from '../src/app/account.js';
import en from '../src/locales/en.js';

const user = {
  firstName: 'Kai',
  lastName: 'Chen',
  fullName: 'Kai Chen',
  hasImage: false,
  primaryEmailAddress: { emailAddress: 'kai@chenmedia.no' },
  emailAddresses: [{ emailAddress: 'kai@chenmedia.no' }],
};

describe('KACH account identity', () => {
  it('uses human initials instead of the default Clerk avatar', () => {
    expect(accountIdentity(user)).toEqual({
      email: 'kai@chenmedia.no',
      name: 'Kai Chen',
      initials: 'KC',
      imageUrl: '',
    });
  });
});

describe('KACH account control', () => {
  it('renders a branded menu and profile panel without Clerk UI', () => {
    const control = buildAccountControl({ user, locale: en, onSignOut: vi.fn() });
    document.body.appendChild(control);

    control.querySelector('.account-trigger').click();
    const menu = document.querySelector('.account-menu');
    expect(menu).toBeTruthy();
    expect(menu.parentElement).toBe(document.body);
    expect(menu.textContent).toContain('KACH studio account');
    expect(document.body.textContent).not.toContain('Secured by');

    menu.querySelector('.account-menu-action').click();
    expect(document.querySelector('.account-panel')).toBeTruthy();
    expect(document.querySelector('.account-panel').textContent).toContain('Your profile');
    expect(document.body.textContent).not.toContain('Clerk');
  });

  it('signs out through the existing secure session handler', async () => {
    const onSignOut = vi.fn().mockResolvedValue(undefined);
    const control = buildAccountControl({ user, locale: en, onSignOut });
    document.body.appendChild(control);
    control.querySelector('.account-trigger').click();
    document.querySelector('.account-menu-action.is-muted').click();

    await vi.waitFor(() => expect(onSignOut).toHaveBeenCalledTimes(1));
  });

  it('portals the menu outside the scrolling sidebar and keeps it inside the viewport', () => {
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.getBoundingClientRect = () => ({
      width: 76,
      height: 768,
      top: 0,
      right: 76,
      bottom: 768,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    const control = buildAccountControl({ user, locale: en, onSignOut: vi.fn() });
    sidebar.appendChild(control);
    document.body.appendChild(sidebar);
    const trigger = control.querySelector('.account-trigger');
    trigger.getBoundingClientRect = () => ({
      width: 52,
      height: 52,
      top: 650,
      right: 64,
      bottom: 702,
      left: 12,
      x: 12,
      y: 650,
      toJSON: () => ({}),
    });

    trigger.click();

    const menu = document.querySelector('.account-menu');
    expect(menu.parentElement).toBe(document.body);
    expect(menu.classList.contains('is-rail-menu')).toBe(true);
    expect(Number.parseInt(menu.style.left, 10)).toBeGreaterThan(76);
    expect(Number.parseInt(menu.style.top, 10)).toBeGreaterThanOrEqual(16);
  });
});

afterEach(() => {
  closeAccountSurface();
  document.body.innerHTML = '';
  document.body.className = '';
});
