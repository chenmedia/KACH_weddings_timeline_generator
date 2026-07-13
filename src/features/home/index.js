// Home feature — the post-login overview. Since the left sidebar now handles
// tool navigation (and lists the roadmap), Home is a lightweight landing:
// greeting, primary actions, and quick access to recent couples. Selecting a
// couple (or "new") hands off to the Brudepar feature via a sessionStorage flag,
// so no cross-feature routing coupling is needed.
import './home.css';
import { t } from '../../i18n.js';
import { getUser } from '../../auth.js';
import { el } from '../../ui/dom.js';
import { icons } from '../../ui/icons.js';
import { api } from '../../lib/api-client.js';
import { fmtDate, parseISO } from '../../lib/dates.js';

const TIMELINE_PATH = '/timeline';
export const OPEN_KEY = 'kach:openTimeline';
export const NEW_KEY = 'kach:newTimeline';

function greeting(locale) {
  const g = locale.home.greeting;
  const h = new Date().getHours();
  const part = h < 5 ? g.night : h < 12 ? g.morning : h < 18 ? g.afternoon : g.evening;
  const name = getUser()?.firstName;
  return name ? `${part}, ${name}` : part;
}

function setFlag(key, val) {
  try {
    sessionStorage.setItem(key, val);
  } catch {
    /* ignore */
  }
}

// A recent-couple card: opens that couple's editor in the Brudepar feature.
function coupleCard(locale, tl, onOpen) {
  const name = tl.couple || locale.timeline.defaultCouple;
  const date = tl.wdate ? fmtDate(parseISO(tl.wdate), locale.dateLocale) : '—';
  const card = el('button', { type: 'button', class: 'tool-card' }, [
    el('span', { class: 'tool-icon', html: icons.timeline, 'aria-hidden': 'true' }),
    el('span', { class: 'tool-body' }, [
      el('span', { class: 'tool-title', text: name }),
      el('span', { class: 'tool-summary', text: date }),
    ]),
    el('span', { class: 'tool-arrow', html: icons.arrow, 'aria-hidden': 'true' }),
  ]);
  card.addEventListener('click', () => onOpen(tl.id));
  return el('li', { class: 'tool-cell' }, [card]);
}

function mount(container, ctx) {
  const locale = t();
  const wrap = el('section', { class: 'home no-print', 'aria-label': locale.home.intro });
  wrap.appendChild(el('h2', { class: 'home-greeting', text: greeting(locale) }));

  const goNew = () => {
    setFlag(NEW_KEY, '1');
    ctx.navigate(TIMELINE_PATH);
  };
  const goList = () => ctx.navigate(TIMELINE_PATH);

  const newBtn = el('button', { class: 'btn-primary', type: 'button', text: locale.dashboard.newBtn });
  newBtn.addEventListener('click', goNew);
  const allBtn = el('button', { class: 'btn-ghost', type: 'button', text: locale.home.allCouples });
  allBtn.addEventListener('click', goList);
  wrap.appendChild(el('div', { class: 'home-actions cluster' }, [newBtn, allBtn]));

  container.appendChild(wrap);

  // Recent couples — DB-backed, so only in the authenticated app. Anonymous
  // localStorage mode has a single implicit timeline and no list.
  if (ctx.authEnabled && ctx.isSignedIn && ctx.isSignedIn()) {
    const grid = el('ul', { class: 'tool-grid', role: 'list' });
    const section = el('section', { class: 'tool-section' }, [
      el('h3', { class: 'tool-section-title', text: locale.home.recent }),
      grid,
    ]);
    wrap.appendChild(section);
    const openCouple = (id) => {
      setFlag(OPEN_KEY, id);
      ctx.navigate(TIMELINE_PATH);
    };
    grid.appendChild(el('li', { class: 'dash-empty', text: locale.dashboard.loading }));
    api
      .list()
      .then(({ timelines }) => {
        grid.innerHTML = '';
        if (!timelines.length) {
          grid.appendChild(el('li', { class: 'dash-empty', text: locale.dashboard.empty }));
          return;
        }
        timelines.slice(0, 6).forEach((tl) => grid.appendChild(coupleCard(locale, tl, openCouple)));
      })
      .catch(() => {
        grid.innerHTML = '';
        grid.appendChild(el('li', { class: 'dash-empty', text: locale.dashboard.error }));
      });
  }
}

const homeFeature = {
  id: 'home',
  path: '/',
  requiresAuth: true,
  navLabel: (locale) => (locale.nav && locale.nav.home) || 'Home',
  icon: icons.home,
  mount,
};

export default homeFeature;
