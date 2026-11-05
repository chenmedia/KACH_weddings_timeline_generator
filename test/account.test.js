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
    expect(control.querySelector('.account-menu')).toBeTruthy();
    expect(control.textContent).toContain('KACH studio account');
    expect(control.textContent).not.toContain('Secured by');

    control.querySelector('.account-menu-action').click();
    expect(document.querySelector('.account-panel')).toBeTruthy();
    expect(document.querySelector('.account-panel').textContent).toContain('Your profile');
    expect(document.body.textContent).not.toContain('Clerk');
  });

  it('signs out through the existing secure session handler', async () => {
    const onSignOut = vi.fn().mockResolvedValue(undefined);
    const control = buildAccountControl({ user, locale: en, onSignOut });
    document.body.appendChild(control);
    control.querySelector('.account-trigger').click();
    control.querySelector('.account-menu-action.is-muted').click();

    await vi.waitFor(() => expect(onSignOut).toHaveBeenCalledTimes(1));
  });
});

afterEach(() => {
  closeAccountSurface();
  document.body.innerHTML = '';
  document.body.className = '';
});
