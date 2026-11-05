import { describe, expect, it } from 'vitest';
import { clerkAppearance, clerkSignInOptions } from '../src/auth.js';

describe('Clerk appearance', () => {
  it('uses the KACH design tokens for every Clerk surface', () => {
    const appearance = clerkAppearance();

    expect(appearance.theme).toBe('simple');
    expect(appearance.variables).toMatchObject({
      borderRadius: '2px',
      colorBackground: '#f6f4f1',
      colorForeground: '#1a1816',
      colorPrimary: '#1a1816',
      colorRing: '#987760',
    });
    expect(appearance.elements.headerTitle.fontFamily).toContain('Cormorant Garamond');
    expect(appearance.elements.formButtonPrimary.textTransform).toBe('uppercase');
    expect(appearance.elements.footer.display).toBe('none');
  });

  it('merges component-specific elements without mutating the shared theme', () => {
    const profile = clerkAppearance({ card: { maxWidth: '920px' } });
    const signIn = clerkAppearance();

    expect(profile.elements.card).toEqual({ maxWidth: '920px' });
    expect(signIn.elements.card).toMatchObject({ width: '100%', borderRadius: '2px' });
  });

  it('keeps sign-up and verification inside the themed sign-in flow', () => {
    const options = clerkSignInOptions();

    expect(options.withSignUp).toBe(true);
    expect(options.appearance.variables.colorPrimary).toBe('#1a1816');
  });
});
