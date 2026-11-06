import './journey.css';
import { api } from '../../lib/api-client.js';
import { fmtDate, parseISO } from '../../lib/dates.js';
import { getMilestones } from '../../lib/milestones.js';
import { defaultState } from '../../lib/state.js';
import {
  pathForWeddingTab,
  replaceSelectedWedding,
  selectedWeddingFromUrl,
} from '../../lib/wedding-context.js';
import { getLang, t } from '../../i18n.js';
import { el } from '../../ui/dom.js';
import { confirmDialog, toast } from '../../ui/feedback.js';
import { icons } from '../../ui/icons.js';
import {
  JOURNEY_TASKS,
  MESSAGE_TEMPLATE_KEYS,
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
import {
  defaultWorkflowTemplate,
  sanitizeWorkflowTemplate,
  workflowTemplateSummary,
} from './workflow-templates.js';
import { buildSharingWorkspace, buildTimelineWorkspace } from './timeline-workspace.js';
import { buildClientCard } from './client-card.js';
import { buildHistoryWorkspace } from './history-workspace.js';
import { defaultClientProfile, sanitizeClientProfile } from '../../lib/client-profile.js';

const SHARED_OVERRIDE_KEYS = new Set(['timelineQ', 'plancall', 'finalSync', 'sneak', 'gallery', 'thanks']);
const WORKSPACE_TAB_KEYS = ['journey', 'client', 'timeline', 'sharing', 'referrals', 'templates', 'activity'];
const WORKSPACE_TABS = new Set(WORKSPACE_TAB_KEYS);

let host = null;
let couples = [];
let currentId = '';
let workspace = null;
let activeTab = 'journey';
let projectDirty = false;
let journeyDirty = false;
let profileDirty = false;
let saving = false;
let workflowTemplates = [];
let templateEditor = null;

function tabFromUrl(search = location.search) {
  const tab = new URLSearchParams(search).get('tab') || 'journey';
  return WORKSPACE_TABS.has(tab) ? tab : 'journey';
}

function setWorkspaceTab(tab, { focus = true } = {}) {
  activeTab = WORKSPACE_TABS.has(tab) ? tab : 'journey';
  const url = new URL(location.href);
  if (activeTab === 'journey') url.searchParams.delete('tab');
  else url.searchParams.set('tab', activeTab);
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  renderWorkspace();
  if (focus) host?.scrollIntoView?.({ behavior: 'auto', block: 'start' });
  if (focus) host?.querySelector(`#journey-tab-${activeTab}`)?.focus();
}

function formatDate(value, locale = t()) {
  const date = typeof value === 'string' ? parseISO(value) : value;
  return date ? fmtDate(date, locale.dateLocale) : '-';
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
  else if (kind === 'profile') profileDirty = true;
  else journeyDirty = true;
  host?.querySelectorAll('.journey-save, .journey-mobile-save').forEach((button) => {
    button.disabled = saving || !(projectDirty || journeyDirty || profileDirty);
  });
  host?.querySelector('.journey-mobile-save')?.classList.add('is-visible');
  const status = host?.querySelector('.journey-save-status');
  if (status) {
    status.textContent = t().journey.statusUnsaved;
    status.classList.add('is-dirty');
  }
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
  if (projectDirty || journeyDirty || profileDirty) {
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
    setWorkspaceTab('timeline');
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
      setWorkspaceTab('templates');
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
        el('span', { text: next?.dateISO ? formatDate(next.dateISO, locale) : '-' }),
        el('button', { type: 'button', text: locale.journey.studio.openTasks }),
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
    setWorkspaceTab('journey');
    host.querySelector('.journey-stage-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  return el('div', { class: 'journey-studio' }, [
    clientRail(locale),
    el('div', { class: 'journey-studio-main' }, [hero, summary]),
  ]);
}

function tabBar(locale) {
  const bar = el('div', { class: 'journey-tabs', role: 'tablist', 'aria-label': locale.journey.title });
  const mobileSelect = el('select', {
    id: 'journey-mobile-tab-select',
    'aria-label': locale.journey.workspaceNavigation,
  });
  for (const key of WORKSPACE_TAB_KEYS) {
    const button = el('button', {
      id: `journey-tab-${key}`,
      type: 'button',
      role: 'tab',
      class: activeTab === key ? 'is-active' : '',
      'aria-selected': String(activeTab === key),
      'aria-controls': 'journey-tabpanel',
      tabindex: activeTab === key ? '0' : '-1',
      text: locale.journey.tabs[key],
    });
    button.addEventListener('click', () => {
      setWorkspaceTab(key);
    });
    button.addEventListener('keydown', (event) => {
      const current = WORKSPACE_TAB_KEYS.indexOf(key);
      let next = null;
      if (event.key === 'ArrowRight') next = (current + 1) % WORKSPACE_TAB_KEYS.length;
      else if (event.key === 'ArrowLeft') {
        next = (current - 1 + WORKSPACE_TAB_KEYS.length) % WORKSPACE_TAB_KEYS.length;
      } else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = WORKSPACE_TAB_KEYS.length - 1;
      if (next === null) return;
      event.preventDefault();
      setWorkspaceTab(WORKSPACE_TAB_KEYS[next]);
    });
    bar.appendChild(button);
    const option = el('option', { value: key, text: locale.journey.tabs[key] });
    if (activeTab === key) option.selected = true;
    mobileSelect.appendChild(option);
  }
  mobileSelect.addEventListener('change', () => {
    setWorkspaceTab(mobileSelect.value, { focus: false });
    host?.scrollIntoView?.({ behavior: 'auto', block: 'start' });
    host?.querySelector('#journey-mobile-tab-select')?.focus();
  });
  return el('div', { class: 'journey-tab-navigation' }, [
    bar,
    el('div', { class: 'journey-mobile-tabs' }, [
      el('label', { for: 'journey-mobile-tab-select', text: locale.journey.workspaceNavigation }),
      mobileSelect,
    ]),
  ]);
}

function compactClientHeader(locale) {
  const project = workspace.project;
  const overview = el('button', {
    type: 'button',
    class: 'journey-context-overview',
    text: `← ${locale.journey.studio.viewJourney}`,
  });
  overview.addEventListener('click', () => setWorkspaceTab('journey'));
  return el('header', { class: 'journey-compact-header' }, [
    el('div', {}, [
      el('p', { class: 'journey-studio-kicker', text: locale.journey.currentClient }),
      el('h2', { text: project.couple || locale.timeline.defaultCouple }),
      el('p', {
        class: 'journey-compact-meta',
        text: [formatDate(project.wdate, locale), project.place].filter(Boolean).join(' · '),
      }),
    ]),
    overview,
  ]);
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
      el('span', { text: row.dateLabel || '-' }),
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
                text: `${locale.journey.studio.referralMoment} ${referralNumber}`,
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
        text: `${locale.journey.studio.stage}: ${locale.journey.stages[stage]}`,
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

function timelinePanel(locale) {
  return buildTimelineWorkspace({
    locale,
    state: workspace.project,
    onChange: () => {
      refreshMilestones();
      setDirty('project');
    },
    onReset: (defaults) => {
      const metadata = {
        id: workspace.project.id,
        status: workspace.project.status,
        shareSlug: workspace.project.shareSlug,
        shareEnabled: workspace.project.shareEnabled,
        shareExpiresAt: workspace.project.shareExpiresAt,
        viewCount: workspace.project.viewCount,
        lastViewedAt: workspace.project.lastViewedAt,
      };
      workspace.project = { ...defaults, ...metadata };
      refreshMilestones();
      setDirty('project');
      renderWorkspace();
    },
    onOpenSharing: () => setWorkspaceTab('sharing'),
  });
}

function clientPanel(locale) {
  return buildClientCard({
    locale,
    workspace,
    onProfileChange: (rerender = false) => {
      setDirty('profile');
      if (rerender) renderWorkspace();
    },
    onJourneyChange: () => setDirty('journey'),
    onImport: async (payload) => {
      if (projectDirty || journeyDirty || profileDirty) {
        const saved = await saveWorkspace();
        if (!saved) throw new Error('save failed');
      }
      const result = await api.importFocl(currentId, payload);
      workspace = await api.workspace(currentId, getLang());
      workspace.profile.data = sanitizeClientProfile(workspace.profile.data);
      couples = couples.map((couple) =>
        couple.id === currentId
          ? { ...couple, couple: result.project.couple, wdate: result.project.wdate }
          : couple,
      );
      toast(locale.clientCard.imported(result.imported), { type: 'success' });
      renderWorkspace();
    },
  });
}

function sharingPanel(locale) {
  return buildSharingWorkspace({
    locale,
    timelineId: currentId,
    state: workspace.project,
    review: workspace.review,
    milestones: workspace.milestones,
    onResolve: async (commentId, status) => {
      const result = await api.updateReview(currentId, { commentId, status });
      workspace.review = result.review;
      renderWorkspace();
    },
    onReset: async () => {
      const result = await api.updateReview(currentId, { resetReview: true });
      workspace.review = result.review;
      renderWorkspace();
    },
  });
}

function historyPanel(locale) {
  return buildHistoryWorkspace({
    locale,
    activity: workspace.activity || [],
    versions: workspace.versions || [],
    milestones: workspace.milestones,
    onCreate: async () => {
      if (projectDirty || journeyDirty || profileDirty) {
        const saved = await saveWorkspace();
        if (!saved) return;
      }
      try {
        await api.createVersion(currentId, locale.activity.manualSummary);
        workspace = await api.workspace(currentId, getLang());
        workspace.profile.data = sanitizeClientProfile(workspace.profile.data);
        toast(locale.activity.created, { type: 'success' });
        renderWorkspace();
      } catch {
        toast(locale.activity.failed, { type: 'error' });
      }
    },
    onRestore: async (version) => {
      const confirmed = await confirmDialog({
        title: locale.activity.restoreConfirm.title,
        body: locale.activity.restoreConfirm.body(version.sequence),
        confirmLabel: locale.activity.restore,
        cancelLabel: locale.feedback.cancel,
        danger: true,
      });
      if (!confirmed) return;
      try {
        await api.restoreVersion(currentId, version.id);
        await loadWorkspace(currentId);
        toast(locale.activity.restored, { type: 'success' });
      } catch {
        toast(locale.activity.failed, { type: 'error' });
      }
    },
  });
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
      'aria-label': `${copy.moments[key].title} - ${copy.cost}`,
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
  const body = workspace.journey.messageTemplates?.[key] || template.body;
  const button = el('button', { type: 'button', class: 'btn-ghost', text: locale.journey.templates.copy });
  button.addEventListener('click', () => copyTemplate(body, locale));
  return el('article', { class: 'message-template' }, [
    el('div', {}, [el('h4', { text: template.title }), el('p', { text: body })]),
    button,
  ]);
}

function templateNumberField({ id, label, value, min, max, onInput }) {
  const input = el('input', {
    id,
    type: 'number',
    min: String(min),
    max: String(max),
    value: String(value),
  });
  input.addEventListener('input', () => onInput(Number(input.value)));
  return el('div', { class: 'journey-field' }, [el('label', { for: id, text: label }), input]);
}

function templateToggle(id, label, checked, onChange) {
  const input = el('input', { id, type: 'checkbox' });
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  return el('label', { class: 'workflow-template-toggle', for: id }, [input, el('span', { text: label })]);
}

function templateEditorPanel(locale) {
  const copy = locale.journey.templates.workflow;
  const draft = sanitizeWorkflowTemplate(
    templateEditor?.id
      ? templateEditor
      : { ...defaultWorkflowTemplate(), isDefault: !workflowTemplates.length },
  );
  const form = el('form', { class: 'workflow-template-editor' });
  const name = el('input', {
    id: 'workflow-template-name',
    type: 'text',
    value: draft.name,
    maxlength: '120',
    placeholder: copy.namePlaceholder,
  });
  name.addEventListener('input', () => {
    draft.name = name.value;
    name.setAttribute('aria-invalid', 'false');
  });

  const timing = el('div', { class: 'workflow-template-timing' }, [
    templateNumberField({
      id: 'workflow-template-delivery',
      label: copy.deliveryWeeks,
      value: draft.timelineDefaults.delw,
      min: 1,
      max: 20,
      onInput: (value) => {
        draft.timelineDefaults.delw = value;
      },
    }),
    templateNumberField({
      id: 'workflow-template-send',
      label: copy.sendDays,
      value: draft.timelineDefaults.sendDays,
      min: 0,
      max: 60,
      onInput: (value) => {
        draft.timelineDefaults.sendDays = value;
      },
    }),
    templateNumberField({
      id: 'workflow-template-expiry',
      label: copy.expiryDays,
      value: draft.timelineDefaults.termDays,
      min: 1,
      max: 60,
      onInput: (value) => {
        draft.timelineDefaults.termDays = value;
      },
    }),
  ]);

  const tasks = el('div', { class: 'workflow-template-checklist' });
  for (const task of JOURNEY_TASKS) {
    tasks.appendChild(
      templateToggle(
        `workflow-task-${task.id}`,
        locale.journey.tasks[task.id] || task.id,
        draft.journeyDefaults.enabledTasks.includes(task.id),
        (checked) => {
          const selected = new Set(draft.journeyDefaults.enabledTasks);
          if (checked) selected.add(task.id);
          else selected.delete(task.id);
          draft.journeyDefaults.enabledTasks = [...selected];
        },
      ),
    );
  }

  const referrals = el('div', { class: 'workflow-template-referrals' });
  for (const { key } of REFERRAL_MOMENTS) {
    const moment = draft.journeyDefaults.referralMoments[key];
    const toggle = el('input', { id: `workflow-referral-${key}`, type: 'checkbox' });
    toggle.checked = moment.enabled;
    toggle.addEventListener('change', () => {
      moment.enabled = toggle.checked;
      draft.journeyDefaults.plan = 'custom';
    });
    const cost = el('input', {
      type: 'number',
      min: '0',
      max: '100000',
      step: '50',
      value: String(moment.costNok),
      'aria-label': `${locale.journey.referrals.moments[key].title} - ${copy.cost}`,
    });
    cost.addEventListener('input', () => {
      moment.costNok = Math.max(0, Math.round(Number(cost.value) || 0));
      draft.journeyDefaults.plan = 'custom';
    });
    referrals.appendChild(
      el('div', { class: 'workflow-template-referral' }, [
        el('label', { for: `workflow-referral-${key}` }, [
          toggle,
          el('span', { text: locale.journey.referrals.moments[key].title }),
        ]),
        el('div', {}, [el('span', { text: copy.cost }), cost]),
      ]),
    );
  }

  const messages = el('div', { class: 'workflow-template-messages' });
  for (const key of MESSAGE_TEMPLATE_KEYS) {
    const base = locale.journey.templates[key];
    const textarea = el('textarea', {
      id: `workflow-message-${key}`,
      rows: '4',
      placeholder: base.body,
    });
    textarea.value = draft.journeyDefaults.messageTemplates[key] || '';
    textarea.addEventListener('input', () => {
      draft.journeyDefaults.messageTemplates[key] = textarea.value;
    });
    messages.appendChild(
      el('div', { class: 'journey-field' }, [el('label', { for: textarea.id, text: base.title }), textarea]),
    );
  }

  const makeDefault = templateToggle(
    'workflow-template-default',
    copy.makeDefault,
    draft.isDefault,
    (checked) => {
      draft.isDefault = checked;
    },
  );
  if (draft.id && draft.isDefault) makeDefault.querySelector('input').disabled = true;

  const cancel = el('button', { type: 'button', class: 'btn-ghost', text: copy.cancel });
  cancel.addEventListener('click', () => {
    templateEditor = null;
    renderWorkspace();
  });
  const save = el('button', { type: 'submit', class: 'btn-primary', text: copy.save });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!name.value.trim()) {
      name.setAttribute('aria-invalid', 'true');
      name.focus();
      return;
    }
    save.disabled = true;
    try {
      const payload = sanitizeWorkflowTemplate({ ...draft, name: name.value });
      if (payload.id) await api.updateWorkflowTemplate(payload.id, payload);
      else await api.createWorkflowTemplate(payload);
      const result = await api.workflowTemplates();
      workflowTemplates = result.templates || [];
      templateEditor = null;
      toast(payload.id ? copy.updated : copy.created, { type: 'success' });
      renderWorkspace();
    } catch {
      save.disabled = false;
      toast(copy.saveFailed, { type: 'error' });
    }
  });

  form.append(
    el('div', { class: 'workflow-template-editor-head' }, [
      el('div', {}, [
        el('p', { class: 'journey-stage-kicker', text: copy.kicker }),
        el('h3', { text: draft.id ? copy.editTitle : copy.createTitle }),
      ]),
      cancel,
    ]),
    el('div', { class: 'journey-field' }, [el('label', { for: name.id, text: copy.name }), name]),
    makeDefault,
    el('fieldset', {}, [el('legend', { text: copy.timingTitle }), timing]),
    el('fieldset', {}, [
      el('legend', { text: copy.checklistTitle }),
      el('p', { class: 'workflow-template-help', text: copy.checklistIntro }),
      tasks,
    ]),
    el('fieldset', {}, [el('legend', { text: copy.referralsTitle }), referrals]),
    el('fieldset', {}, [
      el('legend', { text: copy.messagesTitle }),
      el('p', { class: 'workflow-template-help', text: copy.messagesIntro }),
      messages,
    ]),
    el('div', { class: 'workflow-template-editor-actions' }, [cancel.cloneNode(true), save]),
  );
  form.querySelector('.workflow-template-editor-actions .btn-ghost').addEventListener('click', () => {
    templateEditor = null;
    renderWorkspace();
  });
  return form;
}

function workflowTemplateCard(locale, template) {
  const copy = locale.journey.templates.workflow;
  const summary = workflowTemplateSummary(template);
  const apply = el('button', { type: 'button', class: 'btn-primary', text: copy.apply });
  apply.addEventListener('click', async () => {
    const confirmed = await confirmDialog({
      title: copy.applyConfirmTitle,
      body: copy.applyConfirmBody(template.name),
      confirmLabel: copy.apply,
      cancelLabel: copy.cancel,
    });
    if (!confirmed) return;
    if (projectDirty || journeyDirty || profileDirty) {
      const saved = await saveWorkspace();
      if (!saved) return;
    }
    try {
      await api.applyWorkflowTemplate(template.id, currentId);
      toast(copy.applied, { type: 'success' });
      await loadWorkspace(currentId);
    } catch {
      toast(copy.actionFailed, { type: 'error' });
    }
  });
  const edit = el('button', { type: 'button', class: 'btn-ghost', text: copy.edit });
  edit.addEventListener('click', () => {
    templateEditor = template;
    renderWorkspace();
  });
  const remove = el('button', { type: 'button', class: 'workflow-template-delete', text: copy.remove });
  remove.addEventListener('click', async () => {
    const confirmed = await confirmDialog({
      title: copy.deleteConfirmTitle,
      body: copy.deleteConfirmBody(template.name),
      confirmLabel: copy.remove,
      cancelLabel: copy.cancel,
      danger: true,
    });
    if (!confirmed) return;
    try {
      await api.deleteWorkflowTemplate(template.id);
      const result = await api.workflowTemplates();
      workflowTemplates = result.templates || [];
      toast(copy.deleted, { type: 'success' });
      renderWorkspace();
    } catch {
      toast(copy.actionFailed, { type: 'error' });
    }
  });
  return el('article', { class: 'workflow-template-card' }, [
    el('div', { class: 'workflow-template-card-copy' }, [
      template.isDefault ? el('span', { class: 'workflow-template-default', text: copy.defaultLabel }) : null,
      el('h4', { text: template.name }),
      el('p', {
        text: [
          copy.timing(template.timelineDefaults.delw),
          copy.taskCount(summary.taskCount),
          copy.referralCount(summary.referralCount),
          copy.messageCount(summary.messageCount),
        ].join(' · '),
      }),
    ]),
    el('div', { class: 'workflow-template-card-actions' }, [apply, edit, remove]),
  ]);
}

function workflowTemplateManager(locale) {
  const copy = locale.journey.templates.workflow;
  if (templateEditor) return templateEditorPanel(locale);
  const create = el('button', { type: 'button', class: 'btn-primary', text: copy.create });
  create.addEventListener('click', () => {
    templateEditor = defaultWorkflowTemplate();
    templateEditor.isDefault = !workflowTemplates.length;
    renderWorkspace();
  });
  const content = workflowTemplates.length
    ? el(
        'div',
        { class: 'workflow-template-library' },
        workflowTemplates.map((template) => workflowTemplateCard(locale, template)),
      )
    : el('div', { class: 'workflow-template-empty' }, [
        el('h4', { text: copy.emptyTitle }),
        el('p', { text: copy.emptyBody }),
      ]);
  return el('section', { class: 'workflow-template-manager' }, [
    el('div', { class: 'workflow-template-manager-head' }, [
      el('div', { class: 'journey-section-heading' }, [
        el('p', { class: 'journey-stage-kicker', text: copy.kicker }),
        el('h3', { text: copy.title }),
        el('p', { text: copy.intro }),
      ]),
      create,
    ]),
    content,
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
    workflowTemplateManager(locale),
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
      ...MESSAGE_TEMPLATE_KEYS.map((key) => templateCard(locale, key)),
    ]),
  ]);
}

async function saveWorkspace() {
  if (saving || !(projectDirty || journeyDirty || profileDirty)) return false;
  const locale = t();
  if (journeyDirty && !validHttpsUrl(workspace.journey.foclUrl)) {
    toast(locale.journey.feedback.invalidFocl, { type: 'error' });
    return false;
  }
  saving = true;
  host.querySelectorAll('.journey-save, .journey-mobile-save').forEach((button) => {
    button.disabled = true;
    button.textContent = locale.journey.saving;
  });
  const status = host.querySelector('.journey-save-status');
  if (status) {
    status.textContent = locale.journey.saving;
    status.classList.remove('is-dirty');
  }
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
    if (profileDirty) {
      const saved = await api.updateClientProfile(currentId, workspace.profile, workspace.profileVersion);
      workspace.profile = saved.profile;
      workspace.profileVersion = saved.profileVersion;
      profileDirty = false;
    }
    workspace = await api.workspace(currentId, getLang());
    couples = couples.map((couple) =>
      couple.id === currentId
        ? { ...couple, couple: workspace.project.couple, wdate: workspace.project.wdate }
        : couple,
    );
    saving = false;
    toast(locale.journey.saved, { type: 'success' });
    renderWorkspace();
    return true;
  } catch (error) {
    saving = false;
    const message =
      error?.code === 'VERSION_CONFLICT'
        ? locale.journey.feedback.conflict
        : locale.journey.feedback.saveFailed;
    toast(message, { type: 'error' });
    renderWorkspace();
    return false;
  }
}

function renderWorkspace() {
  if (!host || !workspace) return;
  const locale = t();
  host.innerHTML = '';
  host.classList.toggle('is-operational', activeTab !== 'journey');
  const dirty = projectDirty || journeyDirty || profileDirty;
  host.appendChild(
    el('div', { class: 'journey-topline' }, [
      coupleSelector(locale),
      el('div', { class: 'journey-save-cluster' }, [
        el('span', {
          class: `journey-save-status${dirty ? ' is-dirty' : ''}`,
          text: saving
            ? locale.journey.saving
            : dirty
              ? locale.journey.statusUnsaved
              : locale.journey.statusSaved,
          'aria-live': 'polite',
        }),
        el('button', {
          type: 'button',
          class: 'btn-primary journey-save',
          text: saving ? locale.journey.saving : locale.journey.save,
          ...(saving || !dirty ? { disabled: '' } : {}),
        }),
      ]),
    ]),
  );
  host.querySelector('.journey-save').addEventListener('click', saveWorkspace);
  host.appendChild(activeTab === 'journey' ? summaryHeader(locale) : compactClientHeader(locale));
  host.appendChild(tabBar(locale));
  const panel = el('div', {
    id: 'journey-tabpanel',
    class: 'journey-tab-panel',
    role: 'tabpanel',
    'aria-labelledby': `journey-tab-${activeTab}`,
  });
  const panels = {
    journey: journeyPanel,
    client: clientPanel,
    timeline: timelinePanel,
    sharing: sharingPanel,
    activity: historyPanel,
    referrals: referralPanel,
    templates: templatesPanel,
  };
  panel.appendChild((panels[activeTab] || journeyPanel)(locale));
  host.appendChild(panel);
  const mobileSave = el('button', {
    type: 'button',
    class: `btn-primary journey-mobile-save${dirty || saving ? ' is-visible' : ''}`,
    text: saving ? locale.journey.saving : locale.journey.save,
    ...(saving || !dirty ? { disabled: '' } : {}),
  });
  mobileSave.addEventListener('click', saveWorkspace);
  host.appendChild(mobileSave);
}

async function createCouple() {
  const locale = t();
  try {
    const created = await api.create(defaultState());
    const result = await api.list();
    couples = result.timelines || [];
    activeTab = 'timeline';
    const url = new URL(pathForWeddingTab(created.id, 'timeline'), location.origin);
    history.replaceState({}, '', `${url.pathname}${url.search}`);
    await loadWorkspace(created.id);
  } catch {
    toast(locale.feedback.createFailed, { type: 'error' });
  }
}

async function loadWorkspace(id) {
  if (!id) return;
  currentId = id;
  replaceSelectedWedding(id);
  workspace = null;
  projectDirty = false;
  journeyDirty = false;
  profileDirty = false;
  templateEditor = null;
  host.innerHTML = '';
  host.appendChild(journeyLoading(t()));
  try {
    workspace = await api.workspace(id, getLang());
    workspace.journey = sanitizeJourney(workspace.journey || defaultJourney());
    workspace.profile = workspace.profile || {
      data: defaultClientProfile(),
      source: 'manual',
      sourceId: '',
      sourceUrl: '',
      syncStatus: 'not_connected',
      lastSyncedAt: null,
    };
    workspace.profileVersion = workspace.profileVersion || 0;
    workspace.profile.data = sanitizeClientProfile(workspace.profile.data);
    workspace.review = workspace.review || { status: 'open', comments: [] };
    renderWorkspace();
  } catch {
    host.innerHTML = '';
    host.appendChild(el('p', { class: 'dash-empty', text: t().journey.feedback.loadFailed }));
  }
}

async function mount(container) {
  activeTab = tabFromUrl();
  const locale = t();
  const wrap = el('section', { class: 'journey-feature no-print' });
  host = el('div', { class: 'journey-content' }, [journeyLoading(locale)]);
  wrap.appendChild(host);
  container.appendChild(wrap);

  try {
    const templateResult = await api.workflowTemplates().catch(() => ({ templates: [] }));
    workflowTemplates = templateResult.templates || [];
    const params = new URLSearchParams(location.search);
    if (params.get('new') === '1') {
      params.delete('new');
      const clean = `${location.pathname}${params.toString() ? `?${params}` : ''}`;
      history.replaceState({}, '', clean);
      await createCouple();
      return;
    }
    const result = await api.list();
    couples = result.timelines || [];
    if (!couples.length) {
      host.innerHTML = '';
      const create = el('button', {
        type: 'button',
        class: 'btn-primary',
        text: locale.journey.createCouple,
      });
      create.addEventListener('click', createCouple);
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
  host = null;
  couples = [];
  currentId = '';
  workspace = null;
  activeTab = 'journey';
  projectDirty = false;
  journeyDirty = false;
  profileDirty = false;
  saving = false;
  workflowTemplates = [];
  templateEditor = null;
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
