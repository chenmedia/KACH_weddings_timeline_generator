// Home feature — the post-login launcher for the KACH Weddings tool suite.
// Renders an editorial greeting + a grid of tool cards built from the feature
// registry, so every new tool appears here automatically. "Coming soon" teasers
// are listed from the locale until they become real features.
import './home.css';
import { t } from '../../i18n.js';
import { getUser } from '../../auth.js';
import { el } from '../../ui/dom.js';
import { icons } from '../../ui/icons.js';
import { getFeatures } from '../../app/registry.js';

function greeting(locale) {
  const g = locale.home.greeting;
  const h = new Date().getHours();
  const part = h < 5 ? g.night : h < 12 ? g.morning : h < 18 ? g.afternoon : g.evening;
  const name = getUser()?.firstName;
  return name ? `${part}, ${name}` : part;
}

// One tool tile. Ready tools are buttons (keyboard-focusable, navigate on
// activate); coming-soon teasers are plain, non-interactive elements so they
// stay out of the tab order — the section heading already conveys their status.
// The icon + arrow are decorative, hidden from assistive tech.
function toolCard({ title, summary, icon, soon, onClick = null }) {
  const body = el('span', { class: 'tool-body' }, [
    el('span', { class: 'tool-title', text: title }),
    el('span', { class: 'tool-summary', text: summary || '' }),
  ]);
  const media = el('span', { class: 'tool-icon', html: icon || '', 'aria-hidden': 'true' });

  const card = soon
    ? el('div', { class: 'tool-card is-soon' }, [media, body])
    : el('button', { type: 'button', class: 'tool-card' }, [
        media,
        body,
        el('span', { class: 'tool-arrow', html: icons.arrow, 'aria-hidden': 'true' }),
      ]);
  if (!soon && onClick) card.addEventListener('click', onClick);

  return el('li', { class: 'tool-cell' }, [card]);
}

// A labelled group of tool cards, rendered as a real list for screen readers.
function toolSection(label, cards) {
  return el('section', { class: 'tool-section' }, [
    el('h3', { class: 'tool-section-title', text: label }),
    el('ul', { class: 'tool-grid', role: 'list' }, cards),
  ]);
}

function mount(container, ctx) {
  const locale = t();
  const wrap = el('section', { class: 'home no-print', 'aria-label': locale.home.intro });
  wrap.appendChild(el('h2', { class: 'home-greeting', text: greeting(locale) }));

  // Real, registered tools (anything with a title; home excludes itself).
  const ready = getFeatures()
    .filter((f) => f.id !== 'home' && typeof f.title === 'function')
    .map((f) =>
      toolCard({
        title: f.title(locale),
        summary: f.summary ? f.summary(locale) : '',
        icon: f.icon,
        soon: f.status === 'soon',
        onClick: () => ctx.navigate(f.path || '/'),
      }),
    );
  if (ready.length) wrap.appendChild(toolSection(locale.home.intro, ready));

  // Teasers for tools not built yet (promoted to real features later).
  const soon = (locale.home.comingSoon || []).map((c) =>
    toolCard({ title: c.title, summary: c.summary, icon: icons[c.icon] || '', soon: true }),
  );
  if (soon.length) wrap.appendChild(toolSection(locale.home.soon, soon));

  container.appendChild(wrap);
}

const homeFeature = {
  id: 'home',
  path: '/',
  requiresAuth: true,
  navLabel: (locale) => (locale.nav && locale.nav.home) || 'Home',
  mount,
};

export default homeFeature;
