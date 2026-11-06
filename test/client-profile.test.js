import { describe, expect, it } from 'vitest';
import {
  defaultClientProfile,
  normalizeFoclImport,
  sanitizeClientProfile,
} from '../src/lib/client-profile.js';
import { mergeFoclProfile, prepareFoclImport } from '../src/lib/focl-sync.js';

describe('client profile', () => {
  it('normalizes the stable FOCL bridge payload', () => {
    const result = normalizeFoclImport({
      foclWeddingId: 'focl-42',
      foclUrl: 'https://getfocl.app/weddings/42',
      wedding: { weddingDate: '2027-06-12', venue: 'Oslo rådhus' },
      clients: [
        { name: 'Ada', email: 'ada@example.com' },
        { name: 'Emil', phone: '+47 123 45 678' },
      ],
      vendors: [{ type: 'Florist', name: 'Markblomst', website: 'https://example.com' }],
      timeline: [{ title: 'First look', startTime: '13:30', location: 'Hagen' }],
    });

    expect(result.sourceId).toBe('focl-42');
    expect(result.project).toMatchObject({
      couple: 'Ada & Emil',
      wdate: '2027-06-12',
      place: 'Oslo rådhus',
    });
    expect(result.profile.vendors[0].name).toBe('Markblomst');
    expect(result.profile.foclTimeline[0].title).toBe('First look');
  });

  it('keeps only safe, bounded profile values', () => {
    const profile = sanitizeClientProfile({
      partners: [{ name: 'A'.repeat(500) }, { name: 'B' }, { name: 'C' }],
      vendors: [{ name: 'Vendor', website: 'javascript:alert(1)' }],
      notes: 'N'.repeat(5000),
    });
    expect(profile.partners).toHaveLength(2);
    expect(profile.partners[0].name).toHaveLength(160);
    expect(profile.vendors[0].website).toBe('');
    expect(profile.notes).toHaveLength(4000);
  });

  it('provides an editable empty profile', () => {
    const profile = defaultClientProfile();
    expect(profile.partners).toHaveLength(1);
    expect(profile.locations).toEqual([]);
  });

  it('normalizes the extended FOCL planning sections', () => {
    const result = normalizeFoclImport({
      clients: [{ name: 'Ada' }],
      shotList: [{ title: 'First look', people: ['Ada', 'Emil'] }],
      documents: [{ title: 'Run sheet', url: 'https://getfocl.app/document/1' }],
      checklist: [{ title: 'Confirm florist', completed: true }],
      weddingBrief: { summary: 'A relaxed city wedding', priorities: ['Family'] },
    });
    expect(result.profile.shotList[0].title).toBe('First look');
    expect(result.profile.documents[0].url).toBe('https://getfocl.app/document/1');
    expect(result.profile.checklist[0].status).toBe('completed');
    expect(result.profile.brief.priorities).toEqual(['Family']);
  });

  it('preserves manual KACH sections when FOCL returns no values', () => {
    const merged = mergeFoclProfile(
      {
        vendors: [{ name: 'Manual florist', role: 'Florist' }],
        notes: 'Photographer-only note',
      },
      { vendors: [], notes: '' },
    );
    expect(merged.vendors[0].name).toBe('Manual florist');
    expect(merged.notes).toBe('Photographer-only note');
  });

  it('creates an inspectable change set before import', () => {
    const preview = prepareFoclImport(
      {
        foclWeddingId: 'focl-9',
        wedding: { couple: 'Ada & Emil', weddingDate: '2027-06-12', venue: 'Oslo' },
        clients: [{ name: 'Ada' }, { name: 'Emil' }],
      },
      {},
      { couple: 'A & E', wdate: '2027-06-13', place: '' },
    );
    expect(preview.changes.map((change) => change.field)).toEqual(
      expect.arrayContaining(['project.couple', 'project.wdate', 'project.place', 'profile.partners']),
    );
    expect(preview.counts.partners).toBe(2);
  });
});
