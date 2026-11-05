import { sanitizeJourney } from '../../src/features/journey/model.js';

function toDateString(value) {
  if (!value) return '';
  if (value instanceof Date) {
    const pad = (number) => String(number).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value).slice(0, 10);
}

export function rowToJourney(row) {
  if (!row) return sanitizeJourney();
  return sanitizeJourney({
    plan: row.plan,
    packageName: row.packageName,
    foclUrl: row.foclUrl,
    lastTouch: toDateString(row.lastTouch),
    completedTasks: row.completedTasks,
    referralMoments: row.referralMoments,
    journeyDateOverrides: row.journeyDateOverrides,
  });
}

export function journeyToRow(input) {
  const journey = sanitizeJourney(input);
  return {
    plan: journey.plan,
    packageName: journey.packageName || null,
    foclUrl: journey.foclUrl || null,
    lastTouch: journey.lastTouch || null,
    completedTasks: journey.completedTasks,
    referralMoments: journey.referralMoments,
    journeyDateOverrides: journey.journeyDateOverrides,
  };
}
