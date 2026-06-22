// Drizzle schema for the KACH Weddings backend (Phase 1+).
// The DB stores timeline INPUTS + overrides only; milestone dates are computed
// at read time by src/lib/milestones.js. owner_id is the Clerk user id (text).
import {
  pgTable,
  text,
  uuid,
  date,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';

// Optional profile row (Clerk auth.users is the source of truth for identity).
export const photographers = pgTable('photographers', {
  id: text('id').primaryKey(), // Clerk user id
  displayName: text('display_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Package types: which milestones apply + default timing.
export const templates = pgTable('templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: text('owner_id').notNull(),
  name: text('name').notNull(),
  isDefault: boolean('is_default').default(false),
  delwDefault: integer('delw_default').default(4),
  sendDaysDefault: integer('send_days_default').default(1),
  termDaysDefault: integer('term_days_default').default(10),
  includeEngage: boolean('include_engage').default(false),
  includeAlbum: boolean('include_album').default(false),
  enabledItemKeys: jsonb('enabled_item_keys').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// One per couple — mirrors the in-app `state` inputs.
export const timelines = pgTable('timelines', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: text('owner_id').notNull(),
  templateId: uuid('template_id').references(() => templates.id),
  couple: text('couple').notNull().default(''),
  wdate: date('wdate').notNull(),
  bdate: date('bdate'),
  place: text('place'),
  delw: integer('delw').default(4),
  sendDays: integer('send_days').default(1),
  termDays: integer('term_days').default(10),
  finalOverride: date('final_override'),
  tEngage: boolean('t_engage').default(false),
  tAlbum: boolean('t_album').default(false),
  themeId: text('theme_id').default('kach'), // visual template — see src/lib/themes.js
  shareSlug: text('share_slug').unique(),
  shareEnabled: boolean('share_enabled').default(false),
  shareExpiresAt: timestamp('share_expires_at', { withTimezone: true }),
  viewCount: integer('view_count').default(0),
  lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
  status: text('status').default('lead'), // lead|booked|shooting_done|delivered|archived
  lang: text('lang').default('nb'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const milestoneOverrides = pgTable(
  'milestone_overrides',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    timelineId: uuid('timeline_id')
      .notNull()
      .references(() => timelines.id, { onDelete: 'cascade' }),
    itemKey: text('item_key').notNull(),
    hidden: boolean('hidden').default(false),
    date: date('date'),
    note: text('note'),
  },
  (t) => ({ uniqItem: unique().on(t.timelineId, t.itemKey) }),
);

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  timelineId: uuid('timeline_id')
    .notNull()
    .references(() => timelines.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(), // deposit|final|extra
  amountNok: numeric('amount_nok', { precision: 10, scale: 2 }),
  dueDate: date('due_date'),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  status: text('status').default('due'), // due|paid|overdue|waived
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const integrationLinks = pgTable(
  'integration_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    timelineId: uuid('timeline_id')
      .notNull()
      .references(() => timelines.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // google_calendar|gmail|hubspot
    externalId: text('external_id'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  },
  (t) => ({ uniqLink: unique().on(t.timelineId, t.provider, t.externalId) }),
);

export const oauthConnections = pgTable(
  'oauth_connections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: text('owner_id').notNull(),
    provider: text('provider').notNull(), // google
    accessToken: text('access_token').notNull(), // encrypted at rest (see /api/_lib/crypto.js)
    refreshToken: text('refresh_token'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    scope: text('scope'),
  },
  (t) => ({ uniqConn: unique().on(t.ownerId, t.provider) }),
);
