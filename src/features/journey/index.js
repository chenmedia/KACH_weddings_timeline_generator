import './journey.css';
import { api } from '../../lib/api-client.js';
import { fmtDate, parseISO } from '../../lib/dates.js';
import { getMilestones } from '../../lib/milestones.js';
import { pathForWedding, replaceSelectedWedding, selectedWeddingFromUrl } from '../../lib/wedding-context.js';
import { getLang, t } from '../../i18n.js';
import { el } from '../../ui/dom.js';
import { confirmDialog, toast } from '../../ui/feedback.js';
import { icons } from '../../ui/icons.js';
import {
  JOURNEY_TASKS,
  REFERRAL_MOMENTS,
  activeJourneyTasks,
  applyReferralPreset,
  defaultJourney,
  journeyDates,
  journeyProgress,
  journeyStage,
  nextJourneyAction,
  referralBudget,
  sanitizeJourney,
} from './model.js';

const SHARED_OVERRIDE_KEYS = new Set(['timelineQ', 'plancall', 'finalSync', 'sneak', 'gallery', 'thanks']);
const TEMPLATE_KEYS = ['welcome', 'weddingWeek', 'gallery', 'anniversary'];

let shellCtx = null;
let host = null;
let couples = [];
let currentId = '';
let workspace = null;
let activeTab = 'journey';
let projectDirty = false;
let journeyDirty = false;
let saving = false;

function formatDate(value, locale = t()) {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return date ? fmtDate(date, locale.dateLocale) : '—';
}

function validHttpsUrl(value) {
  if (!value) return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function setDirty(kind) {
  if (kind === 'project') projectDirty = true;
  else journeyDirty = true;
  const button = host?.querySelector('.journey-save');
  if (button) button.disabled = saving || !(projectDirty || journeyDirty);
}

function refreshMilestones() {
  workspace.milestones = getMilestones(workspace.project, t());
}

function inputField({ id, label, type = 'text', value = '', placeholder = '', onInput }) {
  const input = el('input', { id, type, value, ...(placeholder ? { placeholder } : {}) });
  input.addEventListener('input', () => onInput(input.value, input));
  return el('div', { class: 'journey-field' }, [el('label', { for: id, text: label }), input]);
}

function journeyLoading(locale) {
  return el(
    'div',
    {
      class: 'journey-loading',
      role: 'status',
      'aria-label': locale.dashboard.loading,
    },
    [
      el('span', { class: 'journey-loading-rail' }),
      el('span', { class: 'journey-loading-image' }),
      el('span', { class: 'journey-loading-card' }),
    ],
  );
}

async function switchCouple(nextId, resetControl) {
  if (!nextId || nextId === currentId) return;
  const locale = t();
  if (projectDirty || journeyDirty) {
    const discard = await confirmDialog({
      title: locale.journey.unsaved.title,
      body: locale.journey.unsaved.body,
      confirmLabel: locale.journey.unsaved.discard,
      cancelLabel: locale.feedback.cancel,
      danger: true,
    });
    if (!discard) {
      resetControl?.();
      return;
    }
  }
  await loadWorkspace(nextId);
}

function coupleSelector(locale) {
  const select = el('select', { id: 'journey-couple-select', 'aria-label': locale.journey.selectCouple });
  couples.forEach((couple) => {
    const label = `${couple.couple || locale.timeline.defaultCouple} · ${formatDate(couple.wdate, locale)}`;
    const option = el('option', { value: couple.id, text: label });
    if (couple.id === currentId) option.selected = true;
    select.appendChild(option);
  });
  select.addEventListener('change', async () => {
    const nextId = select.value;
    await switchCouple(nextId, () => {
      select.value = currentId;
    });
  });
  return el('div', { class: 'journey-selector' }, [
    el('label', { for: 'journey-couple-select', text: locale.journey.selectCouple }),
    select,
  ]);
}

function clientRail(locale) {
  const year = workspace.project.wdate?.slice(0, 4) || new Date().getFullYear();
  const list = el('nav', {
    class: 'journey-client-list',
    'aria-label': locale.journey.selectCouple,
  });
  couples.forEach((couple, index) => {
    const button = el('button', {
      type: 'button',
      class: couple.id === currentId ? 'is-active' : '',
      'aria-current': couple.id === currentId ? 'true' : 'false',
    });
    button.append(
      el('span', { class: 'journey-client-number', text: String(index + 1).padStart(2, '0') }),
      el('span', { class: 'journey-client-name', text: couple.couple || locale.timeline.defaultCouple }),
      el('span', { class: 'journey-client-date', text: formatDate(couple.wdate, locale) }),
    );
    button.addEventListener('click', () => switchCouple(couple.id));
    list.appendChild(button);
  });
  return el('aside', { class: 'journey-client-rail' }, [
    el('p', { class: 'journey-studio-kicker', text: `${year} ${locale.journey.studio.season}` }),
    el('h2', { text: locale.journey.studio.stories(couples.length) }),
    el('p', { class: 'journey-client-intro', text: locale.journey.studio.clientIntro }),
    list,
    el('blockquote', { text: locale.journey.studio.promise }),
  ]);
}

function summaryHeader(locale) {
  const project = workspace.project;
  const journey = workspace.journey;
  const progress = journeyProgress(journey);
  const next = nextJourneyAction(project, workspace.milestones, journey);
  const hero = el('section', { class: 'journey-hero' }, [
    el('img', {
      src: '/images/kach-journey-hero.jpeg',
      alt: locale.journey.studio.heroAlt,
    }),
    el('div', { class: 'journey-hero-shade', 'aria-hidden': 'true' }),
    el('div', { class: 'journey-hero-copy' }, [
      el('p', { class: 'journey-studio-kicker', text: locale.journey.studio.heroKicker }),
      el('h2', { text: project.couple || locale.timeline.defaultCouple }),
      el('p', {
        class: 'journey-heading-meta',
        text: [formatDate(project.wdate, locale), project.place].filter(Boolean).join(' · '),
      }),
    ]),
    el('div', { class: 'journey-hero-progress' }, [
      el('span', { text: `${locale.journey.progress} ${progress.percent}%` }),
      el('i', { 'aria-hidden': 'true' }, [el('b', { style: `width:${progress.percent}%` })]),
    ]),
    el('button', {
      type: 'button',
      class: 'journey-edit-couple',
      text: `${locale.journey.studio.editCouple} ↗`,
    }),
  ]);
  hero.querySelector('.journey-edit-couple').addEventListener('click', () => {
    shellCtx.navigate(pathForWedding('/timeline', currentId));
  });

  const foclContent = [
    el('img', { src: '/images/kach-journey-detail.jpg', alt: '' }),
    el('span', {}, [
      el('small', { text: 'FOCL planning' }),
      el('strong', {
        text: journey.foclUrl ? `${locale.journey.openFocl} ↗` : `${locale.journey.setupFocl} ↗`,
      }),
    ]),
  ];
  const foclTile = journey.foclUrl
    ? el(
        'a',
        {
          class: 'journey-summary-card journey-focl-card',
          href: journey.foclUrl,
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        foclContent,
      )
    : el('button', { type: 'button', class: 'journey-summary-card journey-focl-card' }, foclContent);
  if (!journey.foclUrl) {
    foclTile.addEventListener('click', () => {
      activeTab = 'templates';
      renderWorkspace();
      host.querySelector('#journey-focl-url')?.focus();
    });
  }

  const summary = el(
    'section',
    {
      class: 'journey-summary-grid',
      'aria-label': locale.journey.studio.clientSummary,
    },
    [
      el('article', { class: 'journey-summary-card journey-next-card' }, [
        el('p', { text: locale.journey.studio.nextThoughtfulAction }),
        el('h3', { text: next ? locale.journey.tasks[next.id] : locale.home.overview.noAction }),
        el('span', { text: next?.dateISO ? formatDate(next.dateISO, locale) : '—' }),
        el('button', { type: 'button', text: `${locale.journey.studio.viewJourney} ↗` }),
      ]),
      el('article', { class: 'journey-summary-card journey-touch-card' }, [
        el('p', { text: locale.journey.lastTouch }),
        el('h3', { text: formatDate(journey.lastTouch, locale) }),
        el('span', { text: locale.journey.studio.personalTouchNote }),
      ]),
      el('article', { class: 'journey-summary-card journey-budget-card' }, [
        el('p', { text: locale.journey.studio.experienceBudget }),
        el('h3', { text: `${referralBudget(journey).toLocaleString(locale.dateLocale)} NOK` }),
        el('span', {
          text: locale.journey.referrals.plans[journey.plan] || locale.journey.referrals.plans.custom,
        }),
      ]),
      foclTile,
    ],
  );
  summary.querySelector('.journey-next-card button').addEventListener('click', () => {
    activeTab = 'journey';
    renderWorkspace();
    host.querySelector('.journey-ledger-intro')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  return el('div', { class: 'journey-studio' }, [
    clientRail(locale),
    el('div', { class: 'journey-studio-main' }, [hero, summary]),
  ]);
}

function tabBar(locale) {
  const bar = el('div', { class: 'journey-tabs', role: 'tablist', 'aria-label': locale.journey.title });
  for (const key of ['journey', 'referrals', 'templates']) {
    const button = el('button', {
      type: 'button',
      role: 'tab',
      class: activeTab === key ? 'is-active' : '',
      'aria-selected': String(activeTab === key),
      text: locale.journey.tabs[key],
    });
    button.addEventListener('click', () => {
      activeTab = key;
      renderWorkspace();
    });
    bar.appendChild(button);
  }
  return bar;
}

function milestoneDateControl(locale, row) {
  const project = workspace.project;
  const manual = !!project.overrides?.[row.key]?.date;
  let value = row.dateISO || '';
  let kind = 'override';
  if (row.key === 'day') {
    value = project.wdate || '';
    kind = 'wdate';
  } else if (row.key === 'welcome') {
    value = project.bdate || '';
    kind = 'bdate';
  } else if (!SHARED_OVERRIDE_KEYS.has(row.key)) {
    return el('div', { class: 'journey-date-readonly' }, [
      el('span', { text: row.dateLabel || '—' }),
      row.dateISO ? el('small', { text: locale.journey.calculated }) : null,
    ]);
  }

  const input = el('input', { type: 'date', value, 'aria-label': row.title });
  input.addEventListener('change', () => {
    if (kind === 'wdate') project.wdate = input.value;
    else if (kind === 'bdate') project.bdate = input.value;
    else {
      project.overrides = project.overrides || {};
      const current = project.overrides[row.key] || {};
      if (input.value) project.overrides[row.key] = { ...current, date: input.value };
      else {
        delete current.date;
        if (Object.keys(current).length) project.overrides[row.key] = current;
        else delete project.overrides[row.key];
      }
    }
    refreshMilestones();
    setDirty('project');
  });

  const controls = [input, el('small', { text: manual ? locale.journey.manual : locale.journey.calculated })];
  if (manual && kind === 'override') {
    const reset = el('button', {
      type: 'button',
      class: 'journey-reset-date',
      text: locale.journey.resetDate,
    });
    reset.addEventListener('click', () => {
      const current = project.overrides[row.key] || {};
      delete current.date;
      if (Object.keys(current).length) project.overrides[row.key] = current;
      else delete project.overrides[row.key];
      refreshMilestones();
      setDirty('project');
      renderWorkspace();
    });
    controls.push(reset);
  }
  return el('div', { class: 'journey-date-control' }, controls);
}

function milestoneList(locale) {
  const list = el('ol', { class: 'journey-milestones' });
  const referralNumbers = { welcome: 1, timelineQ: 2, day: 4, gallery: 5 };
  for (const [index, row] of (workspace.milestones?.rows || []).entries()) {
    const referralNumber = referralNumbers[row.key];
    list.appendChild(
      el('li', { class: row.isDay ? 'is-day' : '' }, [
        el('span', { class: 'journey-milestone-number', text: String(index + 1).padStart(2, '0') }),
        el('div', { class: 'journey-milestone-copy' }, [
          el('span', { class: 'journey-stage-name', text: row.phase }),
          el('h4', { text: row.title }),
          row.desc ? el('p', { text: row.desc }) : null,
          referralNumber
            ? el('span', {
                class: 'journey-referral-badge',
                text: `✦ ${locale.journey.studio.referralMoment} ${referralNumber}`,
              })
            : null,
        ]),
        milestoneDateControl(locale, row),
      ]),
    );
  }
  return list;
}

function checklist(locale) {
  const journey = workspace.journey;
  const derived = journeyDates(workspace.project, workspace.milestones, journey);
  const next = nextJourneyAction(workspace.project, workspace.milestones, journey);
  const stage = next?.stage || journeyStage(workspace.project, derived.dates);
  const activeIds = new Set(activeJourneyTasks(journey).map((task) => task.id));
  const tasks = JOURNEY_TASKS.filter((task) => task.stage === stage && activeIds.has(task.id));
  const completedInStage = tasks.filter((task) => journey.completedTasks.includes(task.id)).length;
  const list = el('div', { class: 'journey-checklist' });
  tasks.forEach((task) => {
    const input = el('input', { type: 'checkbox', id: `task-${task.id}` });
    input.checked = journey.completedTasks.includes(task.id);
    input.addEventListener('change', () => {
      const completed = new Set(journey.completedTasks);
      if (input.checked) completed.add(task.id);
      else completed.delete(task.id);
      journey.completedTasks = [...completed];
      setDirty('journey');
    });
    list.appendChild(
      el('label', { for: `task-${task.id}`, class: 'journey-task' }, [
        input,
        el('span', {}, [
          el('strong', { text: locale.journey.tasks[task.id] }),
          el('small', { text: formatDate(derived.dates[task.dateKey], locale) }),
        ]),
      ]),
    );
  });
  return el('aside', { class: 'journey-stage-panel' }, [
    el('div', { class: 'journey-stage-heading' }, [
      el('p', {
        class: 'journey-stage-kicker',
        text: `${locale.journey.studio.stage} · ${locale.journey.stages[stage]}`,
      }),
      el('strong', { text: `${completedInStage} / ${tasks.length}` }),
    ]),
    el('h3', { text: locale.journey.checklistTitle }),
    el('p', { class: 'journey-stage-intro', text: locale.journey.studio.stageIntro }),
    list,
  ]);
}

function journeyPanel(locale) {
  return el('div', {}, [
    el('header', { class: 'journey-ledger-intro' }, [
      el('p', { class: 'journey-studio-kicker', text: locale.journey.studio.contractToAnniversary }),
      el('h2', {}, [
        document.createTextNode(`${locale.journey.studio.relationship} `),
        el('em', { text: locale.journey.studio.notSequence }),
      ]),
      el('p', { text: locale.journey.studio.ledgerIntro }),
    ]),
    el('div', { class: 'journey-workspace' }, [
      el('section', { class: 'journey-timeline-panel' }, [milestoneList(locale)]),
      checklist(locale),
    ]),
  ]);
}

function referralPanel(locale) {
  const journey = workspace.journey;
  const copy = locale.journey.referrals;
  const total = el('strong', { class: 'referral-total-value', text: `${referralBudget(journey)} NOK` });
  const planBar = el('div', { class: 'referral-plans', role: 'group', 'aria-label': copy.title });
  for (const plan of ['essential', 'signature', 'premium']) {
    const button = el('button', {
      type: 'button',
      class: journey.plan === plan ? 'is-active' : '',
      text: copy.plans[plan],
    });
    button.addEventListener('click', () => {
      workspace.journey = applyReferralPreset(journey, plan);
      setDirty('journey');
      renderWorkspace();
    });
    planBar.appendChild(button);
  }

  const list = el('div', { class: 'referral-list' });
  REFERRAL_MOMENTS.forEach(({ key }) => {
    const moment = journey.referralMoments[key];
    const toggle = el('input', { type: 'checkbox', id: `referral-${key}` });
    toggle.checked = moment.enabled;
    const cost = el('input', {
      type: 'number',
      min: '0',
      max: '100000',
      step: '50',
      value: String(moment.costNok),
      'aria-label': `${copy.moments[key].title} — ${copy.cost}`,
    });
    const update = () => {
      moment.enabled = toggle.checked;
      moment.costNok = Math.max(0, Math.round(Number(cost.value) || 0));
      journey.plan = 'custom';
      total.textContent = `${referralBudget(journey)} NOK`;
      setDirty('journey');
    };
    toggle.addEventListener('change', update);
    cost.addEventListener('input', update);
    list.appendChild(
      el('article', { class: 'referral-row' }, [
        el('div', { class: 'referral-copy' }, [
          el('h3', { text: copy.moments[key].title }),
          el('p', { text: copy.moments[key].desc }),
        ]),
        el('label', { class: 'referral-toggle', for: `referral-${key}` }, [
          toggle,
          el('span', { text: copy.enabled }),
        ]),
        el('div', { class: 'referral-cost' }, [el('span', { text: copy.cost }), cost]),
      ]),
    );
  });

  return el('section', { class: 'referral-panel' }, [
    el('div', { class: 'journey-section-heading' }, [
      el('h3', { text: copy.title }),
      el('p', { text: copy.intro }),
    ]),
    planBar,
    list,
    el('div', { class: 'referral-total' }, [el('span', { text: copy.total }), total]),
  ]);
}

async function copyTemplate(text, locale) {
  try {
    await navigator.clipboard.writeText(text);
    toast(locale.journey.templates.copied, { type: 'success' });
  } catch {
    toast(locale.feedback.saveFailed, { type: 'error' });
  }
}

function templateCard(locale, key) {
  const template = locale.journey.templates[key];
  const button = el('button', { type: 'button', class: 'btn-ghost', text: locale.journey.templates.copy });
  button.addEventListener('click', () => copyTemplate(template.body, locale));
  return el('article', { class: 'message-template' }, [
    el('div', {}, [el('h4', { text: template.title }), el('p', { text: template.body })]),
    button,
  ]);
}

function templatesPanel(locale) {
  const journey = workspace.journey;
  const copy = locale.journey.templates;
  const focl = inputField({
    id: 'journey-focl-url',
    label: copy.foclTitle,
    value: journey.foclUrl,
    placeholder: copy.foclPlaceholder,
    onInput: (value, input) => {
      journey.foclUrl = value.trim();
      const valid = validHttpsUrl(journey.foclUrl);
      input.setAttribute('aria-invalid', String(!valid));
      setDirty('journey');
    },
  });
  focl.appendChild(el('p', { class: 'journey-field-hint', text: copy.foclHint }));

  const settings = el('div', { class: 'journey-settings-grid' }, [
    inputField({
      id: 'journey-package',
      label: locale.journey.packageName,
      value: journey.packageName,
      onInput: (value) => {
        journey.packageName = value;
        setDirty('journey');
      },
    }),
    inputField({
      id: 'journey-last-touch',
      label: locale.journey.lastTouch,
      type: 'date',
      value: journey.lastTouch,
      onInput: (value) => {
        journey.lastTouch = value;
        setDirty('journey');
      },
    }),
  ]);

  return el('div', { class: 'templates-panel' }, [
    el('section', { class: 'focl-panel' }, [
      el('div', { class: 'journey-section-heading' }, [
        el('h3', { text: copy.foclTitle }),
        el('p', { text: copy.foclHint }),
      ]),
      focl,
      settings,
      el(
        'ul',
        { class: 'integration-placeholders' },
        copy.integrationAreas.map((text) => el('li', { text })),
      ),
    ]),
    el('section', { class: 'templates-list' }, [
      el('div', { class: 'journey-section-heading' }, [
        el('h3', { text: copy.title }),
        el('p', { text: copy.intro }),
      ]),
      ...TEMPLATE_KEYS.map((key) => templateCard(locale, key)),
    ]),
  ]);
}

async function saveWorkspace() {
  if (saving || !(projectDirty || journeyDirty)) return;
  const locale = t();
  const save = host.querySelector('.journey-save');
  if (journeyDirty && !validHttpsUrl(workspace.journey.foclUrl)) {
    toast(locale.journey.feedback.invalidFocl, { type: 'error' });
    return;
  }
  saving = true;
  save.disabled = true;
  save.textContent = locale.journey.saving;
  try {
    if (projectDirty) {
      const saved = await api.update(currentId, {
        ...workspace.project,
        projectVersion: workspace.projectVersion,
      });
      workspace.project = { ...workspace.project, ...saved };
      workspace.projectVersion = saved.projectVersion;
      projectDirty = false;
    }
    if (journeyDirty) {
      const saved = await api.updateJourney(
        currentId,
        sanitizeJourney(workspace.journey),
        workspace.journeyVersion,
      );
      workspace.journey = saved.journey;
      workspace.journeyVersion = saved.journeyVersion;
      journeyDirty = false;
    }
    workspace = await api.workspace(currentId, getLang());
    saving = false;
    toast(locale.journey.saved, { type: 'success' });
    renderWorkspace();
  } catch (error) {
    saving = false;
    const message =
      error?.code === 'VERSION_CONFLICT'
        ? locale.journey.feedback.conflict
        : locale.journey.feedback.saveFailed;
    toast(message, { type: 'error' });
    renderWorkspace();
  }
}

function renderWorkspace() {
  if (!host || !workspace) return;
  const locale = t();
  host.innerHTML = '';
  host.appendChild(
    el('div', { class: 'journey-topline' }, [
      coupleSelector(locale),
      el('button', {
        type: 'button',
        class: 'btn-primary journey-save',
        text: saving ? locale.journey.saving : locale.journey.save,
        ...(saving || !(projectDirty || journeyDirty) ? { disabled: '' } : {}),
      }),
    ]),
  );
  host.querySelector('.journey-save').addEventListener('click', saveWorkspace);
  host.appendChild(summaryHeader(locale));
  host.appendChild(tabBar(locale));
  const panel = el('div', { class: 'journey-tab-panel', role: 'tabpanel' });
  panel.appendChild(
    activeTab === 'journey'
      ? journeyPanel(locale)
      : activeTab === 'referrals'
        ? referralPanel(locale)
        : templatesPanel(locale),
  );
  host.appendChild(panel);
}

async function loadWorkspace(id) {
  if (!id) return;
  currentId = id;
  replaceSelectedWedding(id);
  workspace = null;
  projectDirty = false;
  journeyDirty = false;
  host.innerHTML = '';
  host.appendChild(journeyLoading(t()));
  try {
    workspace = await api.workspace(id, getLang());
    workspace.journey = sanitizeJourney(workspace.journey || defaultJourney());
    renderWorkspace();
  } catch {
    host.innerHTML = '';
    host.appendChild(el('p', { class: 'dash-empty', text: t().journey.feedback.loadFailed }));
  }
}

async function mount(container, ctx) {
  shellCtx = ctx;
  const locale = t();
  const wrap = el('section', { class: 'journey-feature no-print' });
  host = el('div', { class: 'journey-content' }, [journeyLoading(locale)]);
  wrap.appendChild(host);
  container.appendChild(wrap);

  try {
    const result = await api.list();
    couples = result.timelines || [];
    if (!couples.length) {
      host.innerHTML = '';
      const create = el('button', {
        type: 'button',
        class: 'btn-primary',
        text: locale.journey.createCouple,
      });
      create.addEventListener('click', () => shellCtx.navigate('/timeline'));
      host.appendChild(
        el('div', { class: 'journey-empty' }, [el('p', { text: locale.journey.noCouples }), create]),
      );
      return;
    }
    const requested = selectedWeddingFromUrl();
    const selected = couples.find((couple) => couple.id === requested) || couples[0];
    await loadWorkspace(selected.id);
  } catch {
    host.innerHTML = '';
    host.appendChild(el('p', { class: 'dash-empty', text: locale.journey.feedback.loadFailed }));
  }
}

function reset() {
  shellCtx = null;
  host = null;
  couples = [];
  currentId = '';
  workspace = null;
  activeTab = 'journey';
  projectDirty = false;
  journeyDirty = false;
  saving = false;
}

const journeyFeature = {
  id: 'journey',
  path: '/journey',
  requiresAuth: true,
  navLabel: (locale) => locale.nav.journey,
  title: (locale) => locale.tools.journey.title,
  summary: (locale) => locale.tools.journey.summary,
  icon: icons.journey,
  status: 'ready',
  mount,
  reset,
};

export default journeyFeature;
