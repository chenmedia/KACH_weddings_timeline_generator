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
  index,
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
  journeyDefaults: jsonb('journey_defaults').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// One per couple — mirrors the in-app `state` inputs.
export const timelines = pgTable('timelines', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: text('owner_id').notNull(),
  templateId: uuid('template_id').references(() => templates.id, { onDelete: 'set null' }),
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
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Photographer-only relationship workflow. Canonical wedding facts and shared
// milestone dates remain on timelines + milestone_overrides.
export const clientJourneys = pgTable(
  'client_journeys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    timelineId: uuid('timeline_id')
      .notNull()
      .references(() => timelines.id, { onDelete: 'cascade' }),
    ownerId: text('owner_id').notNull(),
    version: integer('version').notNull().default(1),
    plan: text('plan').notNull().default('signature'),
    packageName: text('package_name'),
    foclUrl: text('focl_url'),
    lastTouch: date('last_touch'),
    completedTasks: jsonb('completed_tasks').notNull().default([]),
    enabledTasks: jsonb('enabled_tasks')
      .notNull()
      .default([
        'welcomeGuide',
        'foclSetup',
        'storyCall',
        'questionnaire',
        'engagementSession',
        'planningCall',
        'finalMeeting',
        'weddingEncouragement',
        'weddingCare',
        'backupCheck',
        'sneakPreview',
        'galleryDelivery',
        'reviewRequest',
        'parentPrint',
        'holidayGift',
        'anniversaryTouch',
      ]),
    referralMoments: jsonb('referral_moments').notNull().default({}),
    messageTemplates: jsonb('message_templates').notNull().default({}),
    journeyDateOverrides: jsonb('journey_date_overrides').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ uniqTimeline: unique().on(t.timelineId) }),
);

// One evolving, normalized client card per wedding. `data` deliberately keeps
// the FOCL-shaped details flexible while the source metadata stays queryable.
export const clientProfiles = pgTable(
  'client_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    timelineId: uuid('timeline_id')
      .notNull()
      .references(() => timelines.id, { onDelete: 'cascade' }),
    ownerId: text('owner_id').notNull(),
    version: integer('version').notNull().default(1),
    data: jsonb('data').notNull().default({}),
    source: text('source').notNull().default('manual'), // manual|focl-chatgpt|focl-api
    sourceId: text('source_id'),
    sourceUrl: text('source_url'),
    syncStatus: text('sync_status').notNull().default('not_connected'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ uniqTimeline: unique().on(t.timelineId) }),
);

// Short-lived, reviewable FOCL import plans created by the KACH MCP server.
// Applying a plan requires the same project/profile versions seen at preview
// time, preventing an assistant from overwriting newer photographer edits.
export const foclImportSessions = pgTable(
  'focl_import_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    timelineId: uuid('timeline_id')
      .notNull()
      .references(() => timelines.id, { onDelete: 'cascade' }),
    ownerId: text('owner_id').notNull(),
    status: text('status').notNull().default('pending'), // pending|applied|expired|superseded
    sourceId: text('source_id'),
    payload: jsonb('payload').notNull(),
    changes: jsonb('changes').notNull().default([]),
    expectedProjectVersion: integer('expected_project_version').notNull(),
    expectedProfileVersion: integer('expected_profile_version').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    appliedAt: timestamp('applied_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerStatusIdx: index().on(t.ownerId, t.status, t.createdAt),
    timelineCreatedIdx: index().on(t.timelineId, t.createdAt),
  }),
);

// Couple-facing review state. Comments are separate so feedback can be placed
// directly on a milestone and resolved without losing the conversation.
export const timelineReviews = pgTable(
  'timeline_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    timelineId: uuid('timeline_id')
      .notNull()
      .references(() => timelines.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('open'), // open|changes_requested|approved
    decidedBy: text('decided_by'),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ uniqTimeline: unique().on(t.timelineId) }),
);

export const timelineComments = pgTable(
  'timeline_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    timelineId: uuid('timeline_id')
      .notNull()
      .references(() => timelines.id, { onDelete: 'cascade' }),
    itemKey: text('item_key'),
    authorName: text('author_name').notNull(),
    body: text('body').notNull(),
    kind: text('kind').notNull().default('comment'), // comment|change_request
    status: text('status').notNull().default('open'), // open|resolved
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (t) => ({ timelineCreatedIdx: index().on(t.timelineId, t.createdAt) }),
);

export const weddingActivityEvents = pgTable(
  'wedding_activity_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    timelineId: uuid('timeline_id')
      .notNull()
      .references(() => timelines.id, { onDelete: 'cascade' }),
    ownerId: text('owner_id').notNull(),
    actorType: text('actor_type').notNull().default('owner'), // owner|couple|system
    actorName: text('actor_name'),
    action: text('action').notNull(),
    itemKey: text('item_key'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ timelineCreatedIdx: index().on(t.timelineId, t.createdAt) }),
);

export const weddingVersions = pgTable(
  'wedding_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    timelineId: uuid('timeline_id')
      .notNull()
      .references(() => timelines.id, { onDelete: 'cascade' }),
    ownerId: text('owner_id').notNull(),
    sequence: integer('sequence').notNull(),
    source: text('source').notNull().default('manual'),
    summary: text('summary'),
    snapshot: jsonb('snapshot').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqSequence: unique().on(t.timelineId, t.sequence),
    timelineCreatedIdx: index().on(t.timelineId, t.createdAt),
  }),
);

// Studio-wide notification inbox. Each event has a stable dedupe key so
// repeated dashboard reconciliation does not create duplicate alerts.
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: text('owner_id').notNull(),
    timelineId: uuid('timeline_id').references(() => timelines.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    itemKey: text('item_key'),
    dedupeKey: text('dedupe_key').notNull(),
    payload: jsonb('payload').notNull().default({}),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqOwnerDedupe: unique().on(t.ownerId, t.dedupeKey),
    ownerCreatedIdx: index().on(t.ownerId, t.createdAt),
    ownerReadIdx: index().on(t.ownerId, t.readAt),
  }),
);

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
