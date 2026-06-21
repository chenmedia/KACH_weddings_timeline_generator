// Verifies the QR helper produces a PNG data URL for the couple share link.
import { describe, it, expect } from 'vitest';
import { qrDataUrl } from '../src/ui/qr.js';

describe('qrDataUrl', () => {
  it('resolves to a PNG data URL', async () => {
    const url = await qrDataUrl('https://example.com/c/abc123');
    expect(url).toMatch(/^data:image\/png;base64,/);
  });
});
