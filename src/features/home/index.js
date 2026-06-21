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

function toolCard({ title, summary, icon, soon = false, primary = false, openLabel = '', onClick = null }) {
  const children = [
    el('span', { class: 'tool-icon', html: icon || '' }),
    el('span', { class: 'tool-title', text: title }),
    el('span', { class: 'tool-summary', text: summary || '' }),
  ];
  if (soon) {
    children.push(el('span', { class: 'tool-badge', text: t().home.soon }));
  } else if (primary && openLabel) {
    // Explicit "Open →" affordance so the primary tool reads as the main action.
    children.push(el('span', { class: 'tool-open', text: openLabel }));
  }
  const cls = ['tool-card'];
  if (soon) cls.push('is-soon');
  if (primary && !soon) cls.push('is-primary');
  const card = el(
    'button',
    { type: 'button', class: cls.join(' '), ...(soon ? { disabled: '' } : {}) },
    children,
  );
  if (!soon && onClick) card.addEventListener('click', onClick);
  return card;
}

function section(labelText, cards) {
  if (!cards.length) return null;
  const grid = el('div', { class: 'tool-grid grid-auto' }, cards);
  return el('div', { class: 'home-section' }, [
    labelText ? el('div', { class: 'home-section-label', text: labelText }) : null,
    grid,
  ]);
}

function mount(container, ctx) {
  const locale = t();
  const wrap = el('section', { class: 'home no-print' });

  // Hero: greeting + warm lead + a thin editorial rule.
  wrap.appendChild(el('h2', { class: 'home-greeting', text: greeting(locale) }));
  if (locale.home.lead) wrap.appendChild(el('p', { class: 'home-lead', text: locale.home.lead }));
  wrap.appendChild(el('div', { class: 'home-rule' }));

  // Primary section: real, registered tools (anything with a title; home excludes itself).
  const ready = getFeatures()
    .filter((f) => f.id !== 'home' && typeof f.title === 'function')
    .map((f) =>
      toolCard({
        title: f.title(locale),
        summary: f.summary ? f.summary(locale) : '',
        icon: f.icon,
        soon: f.status === 'soon',
        primary: true,
        openLabel: locale.home.open,
        onClick: () => ctx.navigate(f.path || '/'),
      }),
    );
  const readySection = section(locale.home.intro, ready);
  if (readySection) wrap.appendChild(readySection);

  // Coming-soon section: teasers for tools not built yet (promoted to real features later).
  const soon = (locale.home.comingSoon || []).map((c) =>
    toolCard({ title: c.title, summary: c.summary, icon: icons[c.icon] || '', soon: true }),
  );
  const soonSection = section(locale.home.soon, soon);
  if (soonSection) wrap.appendChild(soonSection);

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
