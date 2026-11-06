import { JOURNEY_TASKS, MESSAGE_TEMPLATE_KEYS, defaultJourney, sanitizeJourney } from './model.js';

const LIMITS = {
  delw: { min: 1, max: 20, fallback: 4 },
  sendDays: { min: 0, max: 60, fallback: 1 },
  termDays: { min: 1, max: 60, fallback: 10 },
};

function cleanText(value, max = 120) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function boundedInteger(value, key) {
  const limits = LIMITS[key];
  const number = Number(value);
  if (!Number.isFinite(number)) return limits.fallback;
  return Math.min(limits.max, Math.max(limits.min, Math.round(number)));
}

export function defaultWorkflowTemplate() {
  const journey = defaultJourney();
  return {
    id: '',
    name: '',
    isDefault: false,
    timelineDefaults: {
      delw: 4,
      sendDays: 1,
      termDays: 10,
      includeEngage: false,
      includeAlbum: false,
    },
    journeyDefaults: {
      plan: journey.plan,
      enabledTasks: journey.enabledTasks,
      referralMoments: journey.referralMoments,
      messageTemplates: {},
    },
  };
}

export function sanitizeWorkflowTemplate(input = {}) {
  const timeline = input.timelineDefaults || input.timeline || input;
  const journey = sanitizeJourney({
    ...defaultJourney(),
    ...(input.journeyDefaults || input.journey || {}),
  });
  return {
    id: cleanText(input.id, 80),
    name: cleanText(input.name, 120),
    isDefault: input.isDefault === true,
    timelineDefaults: {
      delw: boundedInteger(timeline.delw, 'delw'),
      sendDays: boundedInteger(timeline.sendDays, 'sendDays'),
      termDays: boundedInteger(timeline.termDays, 'termDays'),
      includeEngage: timeline.includeEngage === true,
      includeAlbum: timeline.includeAlbum === true,
    },
    journeyDefaults: {
      plan: journey.plan,
      enabledTasks: journey.enabledTasks,
      referralMoments: journey.referralMoments,
      messageTemplates: journey.messageTemplates,
    },
    createdAt: input.createdAt || null,
    updatedAt: input.updatedAt || null,
  };
}

export function workflowTemplateFromRow(row) {
  return sanitizeWorkflowTemplate({
    id: row.id,
    name: row.name,
    isDefault: row.isDefault,
    timelineDefaults: {
      delw: row.delwDefault,
      sendDays: row.sendDaysDefault,
      termDays: row.termDaysDefault,
      includeEngage: row.includeEngage,
      includeAlbum: row.includeAlbum,
    },
    journeyDefaults: row.journeyDefaults,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function workflowTemplateToRow(input) {
  const template = sanitizeWorkflowTemplate(input);
  return {
    name: template.name,
    isDefault: template.isDefault,
    delwDefault: template.timelineDefaults.delw,
    sendDaysDefault: template.timelineDefaults.sendDays,
    termDaysDefault: template.timelineDefaults.termDays,
    includeEngage: template.timelineDefaults.includeEngage,
    includeAlbum: template.timelineDefaults.includeAlbum,
    enabledItemKeys: [],
    journeyDefaults: template.journeyDefaults,
    updatedAt: new Date(),
  };
}

export function applyWorkflowTemplate(project, journey, input) {
  const template = sanitizeWorkflowTemplate(input);
  const current = sanitizeJourney(journey);
  const nextJourney = sanitizeJourney({
    ...current,
    plan: template.journeyDefaults.plan,
    packageName: template.name,
    enabledTasks: template.journeyDefaults.enabledTasks,
    referralMoments: template.journeyDefaults.referralMoments,
    messageTemplates: template.journeyDefaults.messageTemplates,
  });
  return {
    project: {
      ...project,
      templateId: template.id || project?.templateId || null,
      delw: String(template.timelineDefaults.delw),
      sendDays: String(template.timelineDefaults.sendDays),
      termDays: String(template.timelineDefaults.termDays),
      tEngage: template.timelineDefaults.includeEngage,
      tAlbum: template.timelineDefaults.includeAlbum,
    },
    journey: nextJourney,
  };
}

export function workflowTemplateSummary(template) {
  const clean = sanitizeWorkflowTemplate(template);
  return {
    taskCount: clean.journeyDefaults.enabledTasks.length,
    referralCount: Object.values(clean.journeyDefaults.referralMoments).filter((item) => item.enabled).length,
    messageCount: MESSAGE_TEMPLATE_KEYS.filter((key) => clean.journeyDefaults.messageTemplates[key]).length,
    totalTaskCount: JOURNEY_TASKS.length,
  };
}
