// Shared JSDoc type definitions. Import in other files via:
//   /** @param {import('./types.js').State} state */
// These give editor IntelliSense and `npm run typecheck` coverage without TS.

/**
 * @typedef {Object} Override
 * @property {boolean} [hidden]  Hide this milestone entirely.
 * @property {string}  [date]    Custom yyyy-mm-dd date overriding the computed one.
 * @property {string}  [note]    Custom note replacing the default description.
 */

/**
 * @typedef {Object} State
 * @property {string} couple
 * @property {string} wdate          Wedding date (yyyy-mm-dd).
 * @property {string} bdate          Booking date (yyyy-mm-dd) or ''.
 * @property {string} place
 * @property {string} delw           Gallery delivery in weeks (numeric string).
 * @property {string} sendDays       Days after wedding the invoice is sent.
 * @property {string} termDays       Payment term in days.
 * @property {string} finalOverride  Custom final-payment date or ''.
 * @property {boolean} tEngage       Couple session included.
 * @property {boolean} tAlbum        Album included.
 * @property {Object.<string, Override>} overrides
 * @property {number} [_v]           Stored schema version (persistence only).
 */

/**
 * @typedef {Object} Milestone
 * @property {string} key
 * @property {string} phaseKey
 * @property {string} phase
 * @property {string} tag
 * @property {Date|null} date
 * @property {string|null} dateISO
 * @property {string} dateLabel
 * @property {string} weekday
 * @property {string} title
 * @property {string} desc
 * @property {string} who
 * @property {boolean} isDay
 * @property {boolean} isBooking
 * @property {boolean} isSoft
 * @property {boolean} isPast
 */

/**
 * @typedef {Object} MilestoneSet
 * @property {Date} W
 * @property {Milestone[]} rows
 */

/**
 * A resolved locale object (see src/locales/*.js). Loosely typed on purpose.
 * @typedef {Object} Locale
 * @property {string} code
 * @property {string} label
 * @property {string} dateLocale
 */

export {};
