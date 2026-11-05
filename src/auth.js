// Thin wrapper around Clerk's browser SDK. Auth is OPT-IN: with no publishable
// key the module is inert and the app runs anonymously on localStorage.
//
// Clerk JS v6 split the SDK and its UI components into two hosted bundles served
// from the Frontend API: clerk-js (sets window.Clerk) and @clerk/ui (sets
// window.__internal_ClerkUICtor). Both must be loaded and the UI constructor
// passed to clerk.load({ ui: { ClerkUI } }) — otherwise mountSignIn() throws
// "Clerk was not loaded with Ui components". We load them from the FAPI rather
// than bundling, so component chunks resolve against Clerk's own host.

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

// One KACH appearance definition for every Clerk surface. Clerk merges this
// global theme into sign-in, sign-up, verification and recovery steps. The
// user profile opened from UserButton receives it explicitly below because
// Clerk treats nested components as a separate appearance boundary.
const CLERK_VARIABLES = {
  borderRadius: '2px',
  colorBackground: '#f6f4f1',
  colorBorder: '#d8d4cd',
  colorDanger: '#8f3f32',
  colorForeground: '#1a1816',
  colorInput: '#ffffff',
  colorInputForeground: '#1a1816',
  colorModalBackdrop: 'rgba(26, 24, 22, 0.48)',
  colorMuted: '#ece8e2',
  colorMutedForeground: '#6b675f',
  colorNeutral: '#8c877e',
  colorPrimary: '#1a1816',
  colorPrimaryForeground: '#ffffff',
  colorRing: '#987760',
  colorShadow: '#3a3733',
  colorShimmer: '#d8d4cd',
  colorSuccess: '#5e5d50',
  colorWarning: '#987760',
  fontFamily: "'Montserrat', -apple-system, 'Helvetica Neue', Arial, sans-serif",
  fontFamilyButtons: "'Montserrat', -apple-system, 'Helvetica Neue', Arial, sans-serif",
  fontSize: '0.8125rem',
  fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
  spacing: '1rem',
};

const CLERK_ELEMENTS = {
  rootBox: { width: '100%' },
  cardBox: { width: '100%', boxShadow: 'none' },
  card: {
    width: '100%',
    border: '1px solid #d8d4cd',
    borderRadius: '2px',
    boxShadow: 'none',
  },
  header: { gap: '0.45rem' },
  headerTitle: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: '2rem',
    fontWeight: 500,
    lineHeight: 1.05,
    letterSpacing: '-0.025em',
  },
  headerSubtitle: { color: '#6b675f', lineHeight: 1.6 },
  socialButtonsBlockButton: {
    minHeight: '44px',
    border: '1px solid #8c877e',
    borderRadius: '2px',
    boxShadow: 'none',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    '&:hover': { backgroundColor: '#ece8e2', borderColor: '#1a1816' },
  },
  socialButtonsBlockButtonText: { fontSize: '0.6875rem', fontWeight: 600 },
  dividerLine: { backgroundColor: '#d8d4cd' },
  dividerText: { color: '#6b675f', fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '1rem' },
  formFieldLabel: {
    color: '#3a3733',
    fontSize: '0.6875rem',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  formFieldInput: {
    minHeight: '44px',
    border: '1px solid #8c877e',
    borderRadius: '2px',
    boxShadow: 'none',
    '&:focus': { borderColor: '#1a1816', boxShadow: '0 0 0 2px rgba(152, 119, 96, 0.2)' },
  },
  formButtonPrimary: {
    minHeight: '44px',
    borderRadius: '2px',
    boxShadow: 'none',
    fontSize: '0.6875rem',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    '&:hover': { backgroundColor: '#3a3733' },
    '&:active': { transform: 'translateY(1px)' },
  },
  footer: { background: 'transparent' },
  footerActionLink: {
    color: '#1a1816',
    fontWeight: 600,
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
  },
  identityPreview: { border: '1px solid #d8d4cd', borderRadius: '2px', boxShadow: 'none' },
  identityPreviewEditButton: { color: '#1a1816' },
  alert: { borderRadius: '2px', boxShadow: 'none' },
  otpCodeFieldInput: {
    border: '1px solid #8c877e',
    borderRadius: '2px',
    boxShadow: 'none',
    fontVariantNumeric: 'tabular-nums',
  },
  formResendCodeLink: { color: '#1a1816', fontWeight: 600 },
  backLink: { color: '#1a1816', fontWeight: 600 },
  userButtonTrigger: {
    borderRadius: '2px',
    '&:focus': { boxShadow: '0 0 0 2px #987760' },
  },
  userButtonAvatarBox: { width: '32px', height: '32px', borderRadius: '2px' },
  userButtonPopoverCard: {
    backgroundColor: '#f6f4f1',
    border: '1px solid #d8d4cd',
    borderRadius: '2px',
    boxShadow: '0 18px 48px rgba(58, 55, 51, 0.14)',
  },
  userButtonPopoverActionButton: {
    borderRadius: '2px',
    '&:hover': { backgroundColor: '#ece8e2' },
  },
  userPreviewMainIdentifier: { color: '#1a1816', fontWeight: 600 },
  userPreviewSecondaryIdentifier: { color: '#6b675f' },
  navbar: { backgroundColor: '#eceae6', borderRight: '1px solid #d8d4cd' },
  navbarButton: { borderRadius: '2px', '&:hover': { backgroundColor: '#e7e3dd' } },
  profileSectionTitleText: {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: '1.25rem',
    fontWeight: 500,
  },
  profileSectionPrimaryButton: { color: '#1a1816', fontWeight: 600 },
};

/** A fresh object keeps Clerk free to merge component-specific overrides. */
export function clerkAppearance(elements = {}) {
  return {
    theme: 'simple',
    variables: { ...CLERK_VARIABLES },
    elements: { ...CLERK_ELEMENTS, ...elements },
  };
}

export function clerkSignInOptions() {
  return {
    appearance: clerkAppearance(),
    // Keep registration, verification and recovery inside the styled app
    // instead of handing new users to Clerk's separately hosted Account Portal.
    withSignUp: true,
  };
}

/** @type {any} */
let _clerk = null;
/** @type {Promise<any> | null} */
let _scriptsPromise = null;

export function isAuthEnabled() {
  return !!PUBLISHABLE_KEY;
}

// The Frontend API host is base64-encoded in the publishable key:
// pk_<env>_<base64("<fapi-host>$")> (Clerk strips the base64 padding).
function frontendApiHost() {
  try {
    const raw = PUBLISHABLE_KEY.split('_')[2] || '';
    const padded = raw + '='.repeat((4 - (raw.length % 4)) % 4);
    return atob(padded).replace(/\$+$/, '');
  } catch {
    return '';
  }
}

function injectScript(src, attrs) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    for (const [k, v] of Object.entries(attrs || {})) s.setAttribute(k, v);
    s.src = src;
    s.addEventListener('load', () => resolve(undefined));
    s.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
    document.head.appendChild(s);
  });
}

function loadClerkScripts() {
  if (_scriptsPromise) return _scriptsPromise;
  _scriptsPromise = (async () => {
    const host = frontendApiHost();
    if (!host) throw new Error('Invalid Clerk publishable key');
    const base = `https://${host}/npm`;
    // SDK first (it owns window.Clerk), then the UI bundle.
    await injectScript(`${base}/@clerk/clerk-js@6/dist/clerk.browser.js`, {
      'data-clerk-publishable-key': PUBLISHABLE_KEY,
    });
    await injectScript(`${base}/@clerk/ui@1/dist/ui.browser.js`);
    return /** @type {any} */ (window).Clerk;
  })();
  return _scriptsPromise;
}

/** Load Clerk once. Returns the instance, or null when auth is disabled. */
export async function initAuth() {
  if (!PUBLISHABLE_KEY) return null;
  if (_clerk) return _clerk;
  const clerk = await loadClerkScripts();
  const ClerkUI = /** @type {any} */ (window).__internal_ClerkUICtor;
  await clerk.load({
    ...(ClerkUI ? { ui: { ClerkUI } } : {}),
    appearance: clerkAppearance(),
    afterSignOutUrl: location.origin,
  });
  _clerk = clerk;
  return clerk;
}

export function getUser() {
  return _clerk?.user || null;
}

export function isSignedIn() {
  return !!_clerk?.user;
}

/** Session JWT for Authorization: Bearer, or undefined. */
export async function getToken() {
  try {
    return (await _clerk?.session?.getToken()) || undefined;
  } catch {
    return undefined;
  }
}

export function onAuthChange(cb) {
  _clerk?.addListener((payload) => cb(payload));
}

export function mountSignIn(el) {
  _clerk?.mountSignIn(el, clerkSignInOptions());
}

export function mountUserButton(el) {
  _clerk?.mountUserButton(el, {
    appearance: clerkAppearance(),
    userProfileMode: 'modal',
    userProfileProps: {
      appearance: clerkAppearance({
        card: {
          width: 'min(920px, calc(100vw - 32px))',
          maxHeight: 'min(720px, calc(100dvh - 32px))',
          border: '1px solid #d8d4cd',
          borderRadius: '2px',
          boxShadow: '0 28px 80px rgba(58, 55, 51, 0.18)',
        },
      }),
    },
  });
}

export async function signOut() {
  await _clerk?.signOut();
}
