import { normalizeFoclImport, sanitizeClientProfile } from './client-profile.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function meaningfulContact(contact) {
  return contact && Object.values(contact).some(Boolean);
}

function meaningfulBrief(brief) {
  return brief && (brief.summary || brief.style || brief.logistics || brief.priorities?.length);
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * FOCL owns the fields it actually provides. Empty or omitted FOCL sections do
 * not erase photographer edits in KACH; clearing data remains a deliberate UI
 * action. Journey tasks, referrals and milestone overrides live elsewhere and
 * are therefore never touched by an import.
 */
export function mergeFoclProfile(currentInput, incomingInput) {
  const current = sanitizeClientProfile(currentInput);
  const incoming = sanitizeClientProfile(incomingInput);
  const merged = { ...current };

  for (const key of [
    'partners',
    'contacts',
    'locations',
    'vendors',
    'familyGroups',
    'foclTimeline',
    'shotList',
    'documents',
    'checklist',
  ]) {
    const values = incoming[key];
    const hasUsefulValues =
      key === 'partners' ? values.some(meaningfulContact) : Array.isArray(values) && values.length > 0;
    if (hasUsefulValues) merged[key] = values;
  }

  if (meaningfulContact(incoming.planner)) merged.planner = incoming.planner;
  if (meaningfulBrief(incoming.brief)) merged.brief = incoming.brief;
  if (incoming.notes) merged.notes = incoming.notes;
  return sanitizeClientProfile(merged);
}

function addChange(changes, field, label, before, after) {
  if (!same(before, after)) changes.push({ field, label, before, after });
}

export function prepareNormalizedFoclImport(normalized, currentProfile = {}, currentProject = {}) {
  const hasUsefulData =
    normalized.sourceId ||
    normalized.sourceUrl ||
    normalized.project.couple ||
    normalized.profile.partners.some((partner) => partner.name);
  if (!hasUsefulData) throw new Error('FOCL payload contains no recognizable wedding data');

  const profile = mergeFoclProfile(currentProfile, normalized.profile);
  const project = {
    couple: normalized.project.couple || currentProject.couple || '',
    wdate: ISO_DATE.test(normalized.project.wdate) ? normalized.project.wdate : currentProject.wdate || '',
    bdate: ISO_DATE.test(normalized.project.bdate) ? normalized.project.bdate : currentProject.bdate || '',
    place: normalized.project.place || currentProject.place || '',
  };
  const beforeProfile = sanitizeClientProfile(currentProfile);
  const changes = [];
  addChange(changes, 'project.couple', 'Couple', currentProject.couple || '', project.couple);
  addChange(changes, 'project.wdate', 'Wedding date', currentProject.wdate || '', project.wdate);
  addChange(changes, 'project.bdate', 'Booking date', currentProject.bdate || '', project.bdate);
  addChange(changes, 'project.place', 'Venue', currentProject.place || '', project.place);

  const sections = [
    ['partners', 'Partners'],
    ['planner', 'Planner'],
    ['contacts', 'Contacts'],
    ['locations', 'Locations'],
    ['vendors', 'Vendors'],
    ['familyGroups', 'Family photo groups'],
    ['foclTimeline', 'FOCL day timeline'],
    ['shotList', 'Shot list'],
    ['documents', 'Documents'],
    ['checklist', 'Checklist'],
    ['brief', 'Wedding brief'],
    ['notes', 'Notes'],
  ];
  for (const [key, label] of sections) {
    addChange(changes, `profile.${key}`, label, beforeProfile[key], profile[key]);
  }

  return {
    normalized,
    profile,
    project,
    changes,
    counts: {
      partners: profile.partners.filter((item) => item.name).length,
      vendors: profile.vendors.length,
      timelineItems: profile.foclTimeline.length,
      shots: profile.shotList.length,
      documents: profile.documents.length,
      checklistItems: profile.checklist.length,
    },
  };
}

export function prepareFoclImport(input, currentProfile = {}, currentProject = {}) {
  return prepareNormalizedFoclImport(normalizeFoclImport(input), currentProfile, currentProject);
}
