// Structural blueprint of the timeline. All human-readable text lives in the
// locale files (src/locales/*) keyed by phase- and item-key, so the timeline
// can be rendered in any language. Adding a milestone = add an entry here +
// its strings in every locale.
//
// type: 'booking' (no fixed date) | 'rel' (relative to wedding date W)
//     | 'final' (final payment) | 'delivery' | 'delivery+'
// offset: days relative to W (or to delivery, for 'delivery+')
// isDay: the wedding day itself (never moved)

export const PHASES = [
  {
    key: 'velkommen',
    items: [
      { key: 'welcome', type: 'booking' },
      { key: 'getToKnow', type: 'booking' },
    ],
  },
  {
    key: 'planlegging',
    items: [
      { key: 'timelineQ', type: 'rel' },
      { key: 'plancall', type: 'rel' },
    ],
  },
  {
    key: 'forDagen',
    items: [{ key: 'finalSync', type: 'rel', offset: -10 }],
  },
  {
    key: 'selveDagen',
    items: [{ key: 'day', type: 'rel', offset: 0, isDay: true }],
  },
  {
    key: 'etterDagen',
    items: [
      { key: 'sneak', type: 'rel', offset: 3 },
      { key: 'final', type: 'final' },
      { key: 'gallery', type: 'delivery' },
      { key: 'thanks', type: 'delivery+', offset: 7 },
    ],
  },
];

// Where the off-rail feature cards are woven into the timeline.
export const ASIDE_AFTER_PHASE = { planlegging: 'parfoto' }; // card shown atop this phase
export const ASIDE_AFTER_ITEM = { gallery: 'album' }; // card shown after this item

// Business rules / timing for milestone scheduling. Kept here (not scattered
// through the logic) so the cadence can be tuned without reading the code.
export const TIMING = {
  // Run-of-day questionnaire goes out on the 1st of the month, this many months
  // before the wedding; the planning call follows the given number of days later.
  questionnaireMonthsBefore: 3,
  planCallDaysAfterQuestionnaire: 7,
  // Couple session: a summer slot is also offered when the booking was made
  // before 1 June of the year before the wedding (i.e. very early bookings).
  coupleSessionSummerCutoff: { monthIndex: 5, day: 1, yearsBeforeWedding: 1 },
};

export const SUPPORTED_LANGS = ['nb', 'en'];
export const DEFAULT_LANG = 'nb';

export const SITE_URL = 'www.kachweddings.no';

// Cookieless analytics: set VITE_PLAUSIBLE_DOMAIN at build time to enable.
export const PLAUSIBLE_DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN || '';
export const PLAUSIBLE_SRC = import.meta.env.VITE_PLAUSIBLE_SRC || 'https://plausible.io/js/script.js';
export const PLAUSIBLE_SRI = import.meta.env.VITE_PLAUSIBLE_SRI || '';
