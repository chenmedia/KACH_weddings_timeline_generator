// Authenticated cross-wedding Overview. It surfaces the next relationship
// action for each wedding and hands off to Journey or Timeline with a durable
// URL selection context.
import './home.css';
import { t } from '../../i18n.js';
import { getUser } from '../../auth.js';
import { el } from '../../ui/dom.js';
import { api } from '../../lib/api-client.js';
import { fmtDate, parseISO } from '../../lib/dates.js';
import { pathForWedding } from '../../lib/wedding-context.js';
import { icons } from '../../ui/icons.js';
import { CLIENT_JOURNEY_ENABLED } from '../../runtime-config.js';

const TIMELINE_PATH = '/timeline';
const JOURNEY_PATH = '/journey';
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

function formatDate(value, locale) {
  const date = parseISO(value);
  return date ? fmtDate(date, locale.dateLocale) : '—';
}

function actionRow(locale, wedding, ctx, index) {
  const copy = locale.home.overview;
  const taskLabel = locale.journey.tasks[wedding.nextActionKey] || copy.noAction;
  const stageLabel = locale.journey.stages[wedding.stageKey] || wedding.stageKey;
  const journeyButton = el('button', {
    type: 'button',
    class: 'btn-primary overview-primary',
    text: copy.openJourney,
  });
  journeyButton.addEventListener('click', () => ctx.navigate(pathForWedding(JOURNEY_PATH, wedding.id)));
  const timelineButton = el('button', {
    type: 'button',
    class: 'btn-ghost overview-secondary',
    text: copy.editTimeline,
  });
  timelineButton.addEventListener('click', () => ctx.navigate(pathForWedding(TIMELINE_PATH, wedding.id)));

  const timing = wedding.nextActionTiming || 'upcoming';
  const dueLabel = wedding.nextActionDate
    ? timing === 'today'
      ? copy.today
      : timing === 'overdue'
        ? copy.overdue(formatDate(wedding.nextActionDate, locale))
        : copy.due(formatDate(wedding.nextActionDate, locale))
    : copy.noDate;

  return el('li', { class: `overview-row is-${timing}` }, [
    el('span', { class: 'overview-index', text: String(index + 1).padStart(2, '0') }),
    el('div', { class: 'overview-couple' }, [
      el('h3', { text: wedding.couple || locale.timeline.defaultCouple }),
      el('p', {
        class: 'overview-meta',
        text: [formatDate(wedding.weddingDate, locale), wedding.location].filter(Boolean).join(' · '),
      }),
    ]),
    el('div', { class: 'overview-next' }, [
      el('span', { class: 'overview-stage', text: stageLabel }),
      el('strong', { text: taskLabel }),
      el('span', { class: 'overview-due', text: dueLabel }),
    ]),
    el('div', { class: 'overview-progress' }, [
      el('span', { text: copy.progress(wedding.completedTaskCount, wedding.totalTaskCount) }),
      el('div', { class: 'overview-progress-track', 'aria-hidden': 'true' }, [
        el('span', {
          style: `width:${wedding.totalTaskCount ? Math.round((wedding.completedTaskCount / wedding.totalTaskCount) * 100) : 0}%`,
        }),
      ]),
    ]),
    el('div', { class: 'overview-row-actions' }, [journeyButton, timelineButton]),
  ]);
}

function seasonSummary(locale, summary) {
  const studio = locale.home.studio;
  return el('dl', { class: 'home-season-summary' }, [
    el('div', {}, [el('dt', { text: studio.weddings }), el('dd', { text: String(summary.weddingCount) })]),
    el('div', {}, [
      el('dt', { text: studio.attention }),
      el('dd', { text: String(summary.needsAttentionCount) }),
    ]),
    el('div', {}, [
      el('dt', { text: studio.nextWedding }),
      el('dd', { text: summary.nextWeddingDate ? formatDate(summary.nextWeddingDate, locale) : '—' }),
    ]),
  ]);
}

function loadingOverview(locale) {
  return el(
    'div',
    {
      class: 'home-loading',
      role: 'status',
      'aria-label': locale.dashboard.loading,
    },
    [
      el('span', { class: 'skeleton-line is-wide' }),
      el('span', { class: 'skeleton-line' }),
      el('span', { class: 'skeleton-line' }),
    ],
  );
}

function loadTimelineOnlyOverview(content, locale, ctx) {
  api
    .list()
    .then(({ timelines }) => {
      content.innerHTML = '';
      content.appendChild(el('h3', { class: 'overview-title', text: locale.home.recent }));
      if (!timelines.length) {
        content.appendChild(el('p', { class: 'dash-empty', text: locale.dashboard.empty }));
        return;
      }
      const list = el('ul', { class: 'overview-list', role: 'list' });
      timelines.slice(0, 6).forEach((timeline, index) => {
        const open = el('button', {
          type: 'button',
          class: 'btn-ghost',
          text: locale.home.overview.editTimeline,
        });
        open.addEventListener('click', () => ctx.navigate(pathForWedding(TIMELINE_PATH, timeline.id)));
        list.appendChild(
          el('li', { class: 'overview-row is-timeline-only' }, [
            el('span', { class: 'overview-index', text: String(index + 1).padStart(2, '0') }),
            el('div', { class: 'overview-couple' }, [
              el('h3', { text: timeline.couple || locale.timeline.defaultCouple }),
              el('p', { class: 'overview-meta', text: formatDate(timeline.wdate, locale) }),
            ]),
            el('div', { class: 'overview-row-actions' }, [open]),
          ]),
        );
      });
      content.appendChild(list);
    })
    .catch(() => {
      content.innerHTML = '';
      content.appendChild(el('p', { class: 'dash-empty', text: locale.dashboard.error }));
    });
}

function mount(container, ctx) {
  const locale = t();
  const wrap = el('section', { class: 'home no-print', 'aria-label': locale.home.intro });

  const goNew = () => {
    setFlag(NEW_KEY, '1');
    ctx.navigate(TIMELINE_PATH);
  };
  const newBtn = el('button', { class: 'btn-primary', type: 'button', text: locale.dashboard.newBtn });
  newBtn.addEventListener('click', goNew);
  const allBtn = el('button', { class: 'btn-ghost', type: 'button', text: locale.home.allCouples });
  allBtn.addEventListener('click', () => ctx.navigate(TIMELINE_PATH));
  wrap.appendChild(
    el('section', { class: 'home-hero' }, [
      el('div', { class: 'home-hero-copy' }, [
        el('p', { class: 'home-kicker', text: locale.home.studio.kicker }),
        el('h2', { class: 'home-greeting', text: greeting(locale) }),
        el('p', { class: 'home-intro', text: locale.home.studio.intro }),
        el('div', { class: 'home-actions cluster' }, [newBtn, allBtn]),
      ]),
      el('figure', { class: 'home-image' }, [
        el('img', { src: '/images/kach-journey-detail.jpg', alt: locale.home.studio.imageAlt }),
        el('figcaption', { text: locale.home.studio.imageCaption }),
      ]),
    ]),
  );
  container.appendChild(wrap);

  if (!(ctx.authEnabled && ctx.isSignedIn && ctx.isSignedIn())) return;

  const status = loadingOverview(locale);
  const content = el('div', { class: 'home-overview', 'aria-live': 'polite' }, [status]);
  wrap.appendChild(content);

  if (!CLIENT_JOURNEY_ENABLED) {
    loadTimelineOnlyOverview(content, locale, ctx);
    return;
  }

  api
    .dashboard()
    .then(({ summary, weddings }) => {
      content.innerHTML = '';
      content.appendChild(seasonSummary(locale, summary));
      content.appendChild(el('h3', { class: 'overview-title', text: locale.home.overview.nextActions }));
      if (!weddings.length) {
        content.appendChild(el('p', { class: 'dash-empty', text: locale.dashboard.empty }));
        return;
      }
      const list = el('ul', { class: 'overview-list', role: 'list' });
      weddings.forEach((wedding, index) => list.appendChild(actionRow(locale, wedding, ctx, index)));
      content.appendChild(list);
    })
    .catch(() => {
      content.innerHTML = '';
      content.appendChild(el('p', { class: 'dash-empty', text: locale.dashboard.error }));
    });
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
