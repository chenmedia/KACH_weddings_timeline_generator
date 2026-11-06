import { addDays, parseISO, toISO } from '../../lib/dates.js';

export const PLAN_KEYS = ['essential', 'signature', 'premium', 'custom'];

export const REFERRAL_MOMENTS = [
  { key: 'welcome', dateKey: 'bdate' },
  { key: 'engagement', dateKey: 'timelineQ' },
  { key: 'weddingWeek', dateKey: 'weddingWeek' },
  { key: 'weddingCare', dateKey: 'day' },
  { key: 'gallery', dateKey: 'gallery' },
  { key: 'parentPrint', dateKey: 'parentPrint' },
  { key: 'holiday', dateKey: 'holiday' },
  { key: 'anniversary', dateKey: 'anniversary' },
];

const REFERRAL_KEYS = new Set(REFERRAL_MOMENTS.map((moment) => moment.key));

export const REFERRAL_PRESETS = {
  essential: ['welcome', 'weddingCare', 'gallery', 'anniversary'],
  signature: ['welcome', 'engagement', 'weddingWeek', 'weddingCare', 'gallery', 'anniversary'],
  premium: REFERRAL_MOMENTS.map((moment) => moment.key),
};

export const JOURNEY_TASKS = [
  { id: 'welcomeGuide', stage: 'welcome', dateKey: 'bdate', referralKey: 'welcome' },
  { id: 'foclSetup', stage: 'welcome', dateKey: 'bdate' },
  { id: 'storyCall', stage: 'welcome', dateKey: 'bdate' },
  { id: 'questionnaire', stage: 'planning', dateKey: 'timelineQ' },
  { id: 'engagementSession', stage: 'planning', dateKey: 'timelineQ', referralKey: 'engagement' },
  { id: 'planningCall', stage: 'planning', dateKey: 'plancall' },
  { id: 'finalMeeting', stage: 'final', dateKey: 'finalSync' },
  { id: 'weddingEncouragement', stage: 'final', dateKey: 'weddingWeek', referralKey: 'weddingWeek' },
  { id: 'weddingCare', stage: 'wedding', dateKey: 'day', referralKey: 'weddingCare' },
  { id: 'backupCheck', stage: 'wedding', dateKey: 'day' },
  { id: 'sneakPreview', stage: 'delivery', dateKey: 'sneak' },
  { id: 'galleryDelivery', stage: 'delivery', dateKey: 'gallery', referralKey: 'gallery' },
  { id: 'reviewRequest', stage: 'delivery', dateKey: 'thanks' },
  { id: 'parentPrint', stage: 'nurture', dateKey: 'parentPrint', referralKey: 'parentPrint' },
  { id: 'holidayGift', stage: 'nurture', dateKey: 'holiday', referralKey: 'holiday' },
  { id: 'anniversaryTouch', stage: 'nurture', dateKey: 'anniversary', referralKey: 'anniversary' },
];

const TASK_IDS = new Set(JOURNEY_TASKS.map((task) => task.id));
export const MESSAGE_TEMPLATE_KEYS = ['welcome', 'weddingWeek', 'gallery', 'anniversary'];
const DATE_OVERRIDE_KEYS = new Set(['weddingWeek', 'parentPrint', 'holiday', 'anniversary']);

function dateString(value) {
  if (typeof value !== 'string') return '';
  const parsed = parseISO(value);
  return parsed && toISO(parsed) === value ? value : '';
}

function cleanText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanFoclUrl(value) {
  const raw = cleanText(value, 2048);
  if (!raw) return '';
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function cleanCost(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100000, Math.max(0, Math.round(number)));
}

function defaultReferrals(plan = 'signature') {
  const enabled = new Set(REFERRAL_PRESETS[plan] || REFERRAL_PRESETS.signature);
  return Object.fromEntries(
    REFERRAL_MOMENTS.map(({ key }) => [key, { enabled: enabled.has(key), costNok: 0 }]),
  );
}

export function defaultJourney() {
  return {
    plan: 'signature',
    packageName: '',
    foclUrl: '',
    lastTouch: '',
    completedTasks: [],
    enabledTasks: JOURNEY_TASKS.map((task) => task.id),
    referralMoments: defaultReferrals('signature'),
    messageTemplates: {},
    journeyDateOverrides: {},
  };
}

export function sanitizeJourney(input = {}) {
  const plan = PLAN_KEYS.includes(input.plan) ? input.plan : 'signature';
  const fallback = defaultReferrals(plan);
  const incomingMoments = input.referralMoments || {};
  const referralMoments = {};

  for (const { key } of REFERRAL_MOMENTS) {
    const value = incomingMoments[key] || {};
    referralMoments[key] = {
      enabled: typeof value.enabled === 'boolean' ? value.enabled : fallback[key].enabled,
      costNok: cleanCost(value.costNok),
    };
  }

  const completedTasks = Array.isArray(input.completedTasks)
    ? [...new Set(input.completedTasks.filter((id) => TASK_IDS.has(id)))]
    : [];
  const enabledTasks = Array.isArray(input.enabledTasks)
    ? [...new Set(input.enabledTasks.filter((id) => TASK_IDS.has(id)))]
    : JOURNEY_TASKS.map((task) => task.id);
  const messageTemplates = Object.fromEntries(
    MESSAGE_TEMPLATE_KEYS.map((key) => [key, cleanText(input.messageTemplates?.[key], 4000)]).filter(
      ([, value]) => value,
    ),
  );
  const journeyDateOverrides = {};
  for (const [key, value] of Object.entries(input.journeyDateOverrides || {})) {
    if (!DATE_OVERRIDE_KEYS.has(key)) continue;
    const date = dateString(value);
    if (date) journeyDateOverrides[key] = date;
  }

  return {
    plan,
    packageName: cleanText(input.packageName, 120),
    foclUrl: cleanFoclUrl(input.foclUrl),
    lastTouch: dateString(input.lastTouch),
    completedTasks,
    enabledTasks,
    referralMoments,
    messageTemplates,
    journeyDateOverrides,
  };
}

export function applyReferralPreset(journey, plan) {
  if (!REFERRAL_PRESETS[plan]) return sanitizeJourney(journey);
  const current = sanitizeJourney(journey);
  const enabled = new Set(REFERRAL_PRESETS[plan]);
  return {
    ...current,
    plan,
    referralMoments: Object.fromEntries(
      REFERRAL_MOMENTS.map(({ key }) => [
        key,
        { ...current.referralMoments[key], enabled: enabled.has(key) },
      ]),
    ),
  };
}

export function referralBudget(journey) {
  const clean = sanitizeJourney(journey);
  return Object.values(clean.referralMoments).reduce(
    (total, moment) => total + (moment.enabled ? moment.costNok : 0),
    0,
  );
}

function addYears(date, years) {
  const next = new Date(date.getTime());
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function firstDecemberAfter(date) {
  const thisYear = new Date(date.getFullYear(), 11, 1);
  return thisYear > date ? thisYear : new Date(date.getFullYear() + 1, 11, 1);
}

export function journeyDates(project, milestoneProjection, journey) {
  const clean = sanitizeJourney(journey);
  const dates = { bdate: dateString(project?.bdate) };
  const sources = { bdate: 'project' };

  for (const row of milestoneProjection?.rows || []) {
    if (!row.dateISO) continue;
    dates[row.key] = row.dateISO;
    sources[row.key] = project?.overrides?.[row.key]?.date ? 'manual' : 'calculated';
  }

  const day = parseISO(dates.day || project?.wdate);
  const gallery = parseISO(dates.gallery);
  const defaults = {
    weddingWeek: day ? toISO(addDays(day, -5)) : '',
    parentPrint: gallery ? toISO(addDays(gallery, 14)) : '',
    holiday: day ? toISO(firstDecemberAfter(day)) : '',
    anniversary: day ? toISO(addYears(day, 1)) : '',
  };

  for (const key of DATE_OVERRIDE_KEYS) {
    const manual = clean.journeyDateOverrides[key];
    dates[key] = manual || defaults[key];
    sources[key] = manual ? 'manual' : 'calculated';
  }

  return { dates, sources };
}

export function activeJourneyTasks(journey) {
  const clean = sanitizeJourney(journey);
  return JOURNEY_TASKS.filter(
    (task) =>
      clean.enabledTasks.includes(task.id) &&
      (!task.referralKey || clean.referralMoments[task.referralKey]?.enabled),
  );
}

export function journeyProgress(journey) {
  const clean = sanitizeJourney(journey);
  const tasks = activeJourneyTasks(clean);
  const completed = tasks.filter((task) => clean.completedTasks.includes(task.id)).length;
  return {
    completed,
    total: tasks.length,
    percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
  };
}

export function journeyStage(project, dates, today = new Date()) {
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const wedding = parseISO(dates.day || project?.wdate);
  const questionnaire = parseISO(dates.timelineQ);
  const finalMeeting = parseISO(dates.finalSync);
  const gallery = parseISO(dates.gallery);
  if (!wedding) return 'welcome';
  if (questionnaire && now < questionnaire) return 'welcome';
  if (finalMeeting && now < finalMeeting) return 'planning';
  if (now < wedding) return 'final';
  if (toISO(now) === toISO(wedding)) return 'wedding';
  if (!gallery || now <= gallery) return 'delivery';
  return 'nurture';
}

export function nextJourneyAction(project, milestoneProjection, journey, today = new Date()) {
  const clean = sanitizeJourney(journey);
  const { dates, sources } = journeyDates(project, milestoneProjection, clean);
  const incomplete = activeJourneyTasks(clean).filter((task) => !clean.completedTasks.includes(task.id));
  const dated = incomplete
    .map((task) => ({
      ...task,
      dateISO: dates[task.dateKey] || '',
      source: sources[task.dateKey] || 'journey',
    }))
    .sort((a, b) => {
      if (!a.dateISO && !b.dateISO) return 0;
      if (!a.dateISO) return 1;
      if (!b.dateISO) return -1;
      return a.dateISO.localeCompare(b.dateISO);
    });
  if (!dated.length) return null;

  const todayISO = toISO(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const action = dated[0];
  return {
    ...action,
    timing:
      action.dateISO && action.dateISO < todayISO
        ? 'overdue'
        : action.dateISO === todayISO
          ? 'today'
          : 'upcoming',
  };
}

export function journeySummary(project, milestoneProjection, journey, today = new Date()) {
  const clean = sanitizeJourney(journey);
  const derived = journeyDates(project, milestoneProjection, clean);
  const progress = journeyProgress(clean);
  const nextAction = nextJourneyAction(project, milestoneProjection, clean, today);
  return {
    stageKey: nextAction?.stage || journeyStage(project, derived.dates, today),
    nextActionKey: nextAction?.id || '',
    nextActionDate: nextAction?.dateISO || '',
    nextActionSource: nextAction?.source || '',
    nextActionTiming: nextAction?.timing || '',
    completedTaskCount: progress.completed,
    totalTaskCount: progress.total,
    lastTouch: clean.lastTouch,
    foclConfigured: !!clean.foclUrl,
  };
}

export function isReferralKey(key) {
  return REFERRAL_KEYS.has(key);
}
