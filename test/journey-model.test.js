import { describe, expect, it } from 'vitest';
import nb from '../src/locales/nb.js';
import { getMilestones } from '../src/lib/milestones.js';
import {
  applyReferralPreset,
  defaultJourney,
  journeyDates,
  journeyProgress,
  journeySummary,
  referralBudget,
  sanitizeJourney,
} from '../src/features/journey/model.js';

const project = {
  couple: 'Ada & Emil',
  wdate: '2027-06-12',
  bdate: '2026-11-05',
  place: 'Oslo',
  delw: '4',
  sendDays: '1',
  termDays: '10',
  finalOverride: '',
  tEngage: true,
  tAlbum: false,
  themeId: 'kach',
  overrides: {},
};

describe('journey model', () => {
  it('provides a signature default without assuming gift costs', () => {
    const journey = defaultJourney();
    expect(journey.plan).toBe('signature');
    expect(journey.referralMoments.welcome.enabled).toBe(true);
    expect(referralBudget(journey)).toBe(0);
  });

  it('sanitizes unknown tasks, invalid dates, URLs and negative costs', () => {
    const journey = sanitizeJourney({
      foclUrl: 'javascript:alert(1)',
      lastTouch: 'not-a-date',
      completedTasks: ['welcomeGuide', 'not-real', 'welcomeGuide'],
      referralMoments: { welcome: { enabled: true, costNok: -99 }, evil: { enabled: true } },
      journeyDateOverrides: { anniversary: '2028-06-12', evil: '2028-01-01' },
    });
    expect(journey.foclUrl).toBe('');
    expect(journey.lastTouch).toBe('');
    expect(journey.completedTasks).toEqual(['welcomeGuide']);
    expect(journey.referralMoments.welcome.costNok).toBe(0);
    expect(journey.referralMoments.evil).toBeUndefined();
    expect(journey.journeyDateOverrides).toEqual({ anniversary: '2028-06-12' });
  });

  it('applies presets while preserving entered costs', () => {
    const journey = defaultJourney();
    journey.referralMoments.parentPrint.costNok = 850;
    const premium = applyReferralPreset(journey, 'premium');
    expect(premium.referralMoments.parentPrint.enabled).toBe(true);
    expect(premium.referralMoments.parentPrint.costNok).toBe(850);
  });

  it('derives journey-only dates from the canonical milestone projection', () => {
    const milestones = getMilestones(project, nb);
    const { dates, sources } = journeyDates(project, milestones, defaultJourney());
    expect(dates.weddingWeek).toBe('2027-06-07');
    expect(dates.parentPrint).toBe('2027-07-24');
    expect(dates.holiday).toBe('2027-12-01');
    expect(dates.anniversary).toBe('2028-06-12');
    expect(sources.gallery).toBe('calculated');
  });

  it('keeps explicit journey-only overrides and calculates progress from active tasks', () => {
    const journey = sanitizeJourney({
      ...defaultJourney(),
      completedTasks: ['welcomeGuide', 'foclSetup'],
      journeyDateOverrides: { anniversary: '2028-06-20' },
    });
    const milestones = getMilestones(project, nb);
    expect(journeyDates(project, milestones, journey).dates.anniversary).toBe('2028-06-20');
    expect(journeyProgress(journey)).toMatchObject({ completed: 2 });
  });

  it('builds a language-neutral dashboard summary', () => {
    const milestones = getMilestones(project, nb);
    const summary = journeySummary(project, milestones, defaultJourney(), new Date(2027, 0, 1));
    expect(summary.stageKey).toBe('welcome');
    expect(summary.nextActionKey).toBeTruthy();
    expect(summary.totalTaskCount).toBeGreaterThan(0);
  });
});
