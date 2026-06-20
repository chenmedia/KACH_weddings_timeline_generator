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

function toolCard({ title, summary, icon, soon, onClick = null }) {
  const children = [
    el('span', { class: 'tool-icon', html: icon || '' }),
    el('span', { class: 'tool-title', text: title }),
    el('span', { class: 'tool-summary', text: summary || '' }),
  ];
  if (soon) children.push(el('span', { class: 'tool-badge', text: t().home.soon }));
  const card = el(
    'button',
    { type: 'button', class: 'tool-card' + (soon ? ' is-soon' : ''), ...(soon ? { disabled: '' } : {}) },
    children,
  );
  if (!soon && onClick) card.addEventListener('click', onClick);
  return card;
}

function mount(container, ctx) {
  const locale = t();
  const wrap = el('section', { class: 'home no-print' });
  wrap.appendChild(el('h2', { class: 'home-greeting', text: greeting(locale) }));
  if (locale.home.intro) wrap.appendChild(el('div', { class: 'home-intro', text: locale.home.intro }));

  const grid = el('div', { class: 'tool-grid grid-auto' });

  // Real, registered tools (anything with a title; home excludes itself).
  getFeatures()
    .filter((f) => f.id !== 'home' && typeof f.title === 'function')
    .forEach((f) => {
      grid.appendChild(
        toolCard({
          title: f.title(locale),
          summary: f.summary ? f.summary(locale) : '',
          icon: f.icon,
          soon: f.status === 'soon',
          onClick: () => ctx.navigate(f.path || '/'),
        }),
      );
    });

  // Teasers for tools not built yet (promoted to real features later).
  (locale.home.comingSoon || []).forEach((c) => {
    grid.appendChild(toolCard({ title: c.title, summary: c.summary, icon: icons[c.icon] || '', soon: true }));
  });

  wrap.appendChild(grid);
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
