import { el } from '../ui/dom.js';

let activeCleanup = null;

export function accountIdentity(user) {
  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '';
  const fullName = user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  const emailName = email.split('@')[0] || '';
  const name = fullName || emailName || 'KACH Weddings';
  const initialsSource = fullName ? [user?.firstName, user?.lastName].filter(Boolean) : [emailName || 'K'];
  const initials = initialsSource
    .map((part) => String(part).trim().charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return {
    email,
    name,
    initials: initials || 'K',
    imageUrl: user?.hasImage && user?.imageUrl ? user.imageUrl : '',
  };
}

export function closeAccountSurface({ restoreFocus = false } = {}) {
  const cleanup = activeCleanup;
  activeCleanup = null;
  cleanup?.(restoreFocus);
}

function avatar(identity, size = 'small') {
  const box = el('span', {
    class: `account-avatar is-${size}`,
    'aria-hidden': 'true',
  });
  if (identity.imageUrl) {
    box.appendChild(el('img', { src: identity.imageUrl, alt: '' }));
  } else {
    box.textContent = identity.initials;
  }
  return box;
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

function accountDetails(identity, copy) {
  return el('dl', { class: 'account-details' }, [
    el('div', {}, [el('dt', { text: copy.email }), el('dd', { text: identity.email || '-' })]),
    el('div', {}, [el('dt', { text: copy.workspace }), el('dd', { text: 'KACH Weddings' })]),
    el('div', {}, [el('dt', { text: copy.access }), el('dd', { text: copy.accessValue })]),
  ]);
}

function placeAccountMenu(menu, trigger) {
  const viewportGap = 16;
  const anchorGap = 10;
  const triggerRect = trigger.getBoundingClientRect();
  const sidebarRect = trigger.closest('.sidebar')?.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const menuWidth = menuRect.width || Math.min(296, window.innerWidth - viewportGap * 2);
  const menuHeight = menuRect.height || menu.scrollHeight;
  const isIconRail = Boolean(sidebarRect && sidebarRect.width < 120);

  let left = isIconRail ? Math.max(triggerRect.right, sidebarRect.right) + 12 : triggerRect.left;
  left = Math.max(viewportGap, Math.min(left, window.innerWidth - menuWidth - viewportGap));

  const opensAbove = triggerRect.top - anchorGap - menuHeight >= viewportGap;
  let top = opensAbove ? triggerRect.top - anchorGap - menuHeight : triggerRect.bottom + anchorGap;
  top = Math.max(viewportGap, Math.min(top, window.innerHeight - menuHeight - viewportGap));

  menu.classList.toggle('is-rail-menu', isIconRail);
  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(top)}px`;
}

function openProfilePanel({ identity, copy, trigger, onSignOut }) {
  closeAccountSurface();
  const backdrop = el('div', { class: 'account-backdrop', 'aria-hidden': 'true' });
  const close = el('button', {
    class: 'account-panel-close',
    type: 'button',
    text: '×',
    'aria-label': copy.close,
  });
  const signOutButton = el('button', {
    class: 'account-signout',
    type: 'button',
    text: copy.signOut,
  });
  const panel = el('aside', {
    class: 'account-panel',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'account-panel-title',
  });
  panel.append(
    el('header', { class: 'account-panel-head' }, [
      el('p', { class: 'account-kicker', text: copy.kicker }),
      el('h2', { id: 'account-panel-title', text: copy.title }),
      el('p', { class: 'account-panel-intro', text: copy.intro }),
      close,
    ]),
    el('section', { class: 'account-profile' }, [
      avatar(identity, 'large'),
      el('div', {}, [el('h3', { text: identity.name }), el('p', { text: identity.email || copy.noEmail })]),
    ]),
    accountDetails(identity, copy),
    el('div', { class: 'account-panel-foot' }, [el('p', { text: copy.securityNote }), signOutButton]),
  );

  const cleanup = (restoreFocus) => {
    backdrop.remove();
    panel.remove();
    document.body.classList.remove('account-lock');
    document.removeEventListener('keydown', onKeydown);
    if (restoreFocus && trigger.isConnected) trigger.focus();
  };
  const onKeydown = (event) => {
    if (event.key === 'Escape') {
      closeAccountSurface({ restoreFocus: true });
    } else if (event.key === 'Tab') {
      trapTab(event, panel);
    }
  };
  const closePanel = () => closeAccountSurface({ restoreFocus: true });
  close.addEventListener('click', closePanel);
  backdrop.addEventListener('click', closePanel);
  signOutButton.addEventListener('click', async () => {
    signOutButton.disabled = true;
    signOutButton.textContent = copy.signingOut;
    try {
      await onSignOut();
      closeAccountSurface();
    } catch {
      signOutButton.disabled = false;
      signOutButton.textContent = copy.signOut;
    }
  });

  activeCleanup = cleanup;
  document.body.append(backdrop, panel);
  document.body.classList.add('account-lock');
  document.addEventListener('keydown', onKeydown);
  close.focus();
}

export function buildAccountControl({ user, locale, onSignOut }) {
  const copy = locale.account;
  const identity = accountIdentity(user);
  const wrapper = el('div', { class: 'side-account', 'aria-label': locale.nav.account });
  const trigger = el('button', {
    class: 'account-trigger',
    type: 'button',
    'aria-haspopup': 'menu',
    'aria-expanded': 'false',
    'aria-label': copy.open,
  });
  trigger.append(
    avatar(identity),
    el('span', { class: 'account-trigger-copy' }, [
      el('strong', { text: identity.name }),
      el('small', { text: copy.title }),
    ]),
    el('span', { class: 'account-trigger-mark', text: '↗', 'aria-hidden': 'true' }),
  );

  const openMenu = () => {
    closeAccountSurface();
    const menu = el('div', { class: 'account-menu', role: 'menu' });
    const profileButton = el('button', {
      class: 'account-menu-action',
      type: 'button',
      role: 'menuitem',
      text: copy.profile,
    });
    const signOutButton = el('button', {
      class: 'account-menu-action is-muted',
      type: 'button',
      role: 'menuitem',
      text: copy.signOut,
    });
    menu.append(
      el('div', { class: 'account-menu-head' }, [
        el('span', { class: 'account-kicker', text: copy.kicker }),
        el('strong', { text: identity.name }),
        el('small', { text: identity.email || copy.noEmail }),
      ]),
      profileButton,
      signOutButton,
    );
    document.body.appendChild(menu);
    placeAccountMenu(menu, trigger);
    wrapper.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');

    const onOutside = (event) => {
      if (!wrapper.contains(event.target) && !menu.contains(event.target)) closeAccountSurface();
    };
    const reposition = () => placeAccountMenu(menu, trigger);
    const onKeydown = (event) => {
      if (event.key === 'Escape') closeAccountSurface({ restoreFocus: true });
    };
    const cleanup = (restoreFocus) => {
      menu.remove();
      wrapper.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('pointerdown', onOutside);
      document.removeEventListener('keydown', onKeydown);
      document.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      if (restoreFocus && trigger.isConnected) trigger.focus();
    };
    activeCleanup = cleanup;
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);

    profileButton.addEventListener('click', () => {
      openProfilePanel({ identity, copy, trigger, onSignOut });
    });
    signOutButton.addEventListener('click', async () => {
      signOutButton.disabled = true;
      signOutButton.textContent = copy.signingOut;
      try {
        await onSignOut();
        closeAccountSurface();
      } catch {
        signOutButton.disabled = false;
        signOutButton.textContent = copy.signOut;
      }
    });
    profileButton.focus();
  };

  trigger.addEventListener('click', () => {
    if (wrapper.classList.contains('is-open')) closeAccountSurface();
    else openMenu();
  });
  wrapper.appendChild(trigger);
  return wrapper;
}
