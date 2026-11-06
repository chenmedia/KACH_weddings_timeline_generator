import { describe, expect, it } from 'vitest';
import { defaultJourney } from '../src/features/journey/model.js';
import {
  applyWorkflowTemplate,
  sanitizeWorkflowTemplate,
  workflowTemplateSummary,
} from '../src/features/journey/workflow-templates.js';

describe('workflow templates', () => {
  it('sanitizes package defaults and rejects unknown workflow values', () => {
    const template = sanitizeWorkflowTemplate({
      name: '  Signatur  ',
      isDefault: true,
      timelineDefaults: {
        delw: 100,
        sendDays: -2,
        termDays: 14,
        includeEngage: true,
      },
      journeyDefaults: {
        plan: 'premium',
        enabledTasks: ['welcomeGuide', 'not-real'],
        messageTemplates: { welcome: 'Hei!', evil: 'ignored' },
      },
    });
    expect(template.name).toBe('Signatur');
    expect(template.timelineDefaults).toMatchObject({ delw: 20, sendDays: 0, termDays: 14 });
    expect(template.journeyDefaults.enabledTasks).toEqual(['welcomeGuide']);
    expect(template.journeyDefaults.messageTemplates).toEqual({ welcome: 'Hei!' });
  });

  it('applies package defaults while preserving client-specific work', () => {
    const journey = defaultJourney();
    journey.foclUrl = 'https://getfocl.app/project/ada';
    journey.lastTouch = '2026-11-06';
    journey.completedTasks = ['welcomeGuide'];
    journey.journeyDateOverrides = { anniversary: '2028-06-20' };
    const template = sanitizeWorkflowTemplate({
      id: 'template-1',
      name: 'Premium',
      timelineDefaults: { delw: 6, sendDays: 2, termDays: 14, includeEngage: true },
      journeyDefaults: {
        plan: 'premium',
        enabledTasks: ['welcomeGuide', 'galleryDelivery'],
        messageTemplates: { gallery: 'Galleriet er klart.' },
      },
    });
    const result = applyWorkflowTemplate({ couple: 'Ada & Emil' }, journey, template);
    expect(result.project).toMatchObject({ templateId: 'template-1', delw: '6', tEngage: true });
    expect(result.journey).toMatchObject({
      packageName: 'Premium',
      foclUrl: journey.foclUrl,
      lastTouch: journey.lastTouch,
      completedTasks: ['welcomeGuide'],
      journeyDateOverrides: journey.journeyDateOverrides,
      enabledTasks: ['welcomeGuide', 'galleryDelivery'],
      messageTemplates: { gallery: 'Galleriet er klart.' },
    });
    expect(workflowTemplateSummary(template)).toMatchObject({
      taskCount: 2,
      messageCount: 1,
    });
  });
});
