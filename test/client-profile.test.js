import { describe, expect, it } from 'vitest';
import {
  defaultClientProfile,
  normalizeFoclImport,
  sanitizeClientProfile,
} from '../src/lib/client-profile.js';

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
});
