# Codex handover: integrated KACH client journey

## Outcome

Add an authenticated **Client journey** tool at `/journey` inside the existing KACH Weddings Tools app. It must use the same couple records and generated milestone dates as `/timeline`, while adding photographer-only relationship tasks, the eight referral moments, gift budgeting, FOCL links, and reusable message templates.

This is an extension of the current app, not a second application and not an iframe of the ChatGPT Site prototype.

## Non-negotiable architecture decision

The database-backed **Wedding Project** is the system of record. Neither `/journey` nor `/timeline` owns the data.

`src/lib/milestones.js#getMilestones()` remains the shared, versioned scheduling policy. It derives dates from the Wedding Project's stored facts and explicit overrides. Do not create a second calculator and do not persist a second copy of generated dates.

The dashboard is the primary command-centre experience, but it writes through the same API/domain model as the timeline generator. The timeline generator becomes a focused planning view of the same project.

If a shared date is edited from `/journey`, update the existing timeline state and save through `PUT /api/timelines/:id`. This means:

- changing the wedding date, delivery weeks, payment timing, or a timeline override from either UI updates the same database record;
- changing a shared milestone date in `/journey` creates or updates the same `state.overrides[itemKey].date` consumed by `/timeline`;
- exports and the couple-facing timeline stay aligned because they already consume `getMilestones()`;
- journey-only operational data never leaks into `/api/public/timeline/:slug`.

See `docs/adr/0001-wedding-project-source-of-truth.md` for the decision and rejected alternatives.

## Repository and runtime facts

- Repository: `chenmedia/KACH_weddings_timeline_generator`
- Production route: `https://tools.kachweddings.no/timeline`
- Frontend: Vite + dependency-light ES modules
- App shell: `src/app/`
- Feature registration: `src/main.js`
- Auth: Clerk
- Database: Neon Postgres + Drizzle
- Hosting: Vercel
- Locales: `src/locales/nb.js` and `src/locales/en.js`
- CI: lint, formatting, JSDoc typecheck, Vitest, build, and migrations
- Product context: `PRODUCT.md`

## Data ownership matrix

| Data | Canonical owner | Read in journey | Written from journey |
| --- | --- | --- | --- |
| Couple name | `timelines.couple` | `api.get(id)` | Existing timeline `PUT` |
| Wedding date | `timelines.wdate` | `api.get(id)` | Existing timeline `PUT` |
| Booking date | `timelines.bdate` | `api.get(id)` | Existing timeline `PUT` |
| Location | `timelines.place` | `api.get(id)` | Existing timeline `PUT` |
| Scheduling inputs | Database-backed Wedding Project (`timelines` in the current schema) | Workspace API | Same project command/API |
| Generated timeline dates | Shared `getMilestones(state, locale)` policy | Returned as a projection or computed client-side from the same state | Never stored separately |
| Shared date override | `milestone_overrides` via `state.overrides` | `getMilestones()` | Existing timeline `PUT` |
| Checklist completion | New `client_journeys` row | Journey API | Journey API |
| Referral moment on/off + cost | New `client_journeys` row | Journey API | Journey API |
| Experience plan | New `client_journeys` row | Journey API | Journey API |
| Package label | New `client_journeys` row | Journey API | Journey API |
| FOCL project URL | New `client_journeys` row | Journey API | Journey API |
| Last personal touch | New `client_journeys` row | Journey API | Journey API |
| Journey-only date override | New `client_journeys` row | Journey API | Journey API |

## Milestone mapping

The first implementation should map journey stages to canonical timeline keys as follows.

| Journey concept | Canonical timeline key | Date behavior |
| --- | --- | --- |
| Contract signed | `welcome` + `state.bdate` | Display booking date; edit `bdate` |
| Welcome to KACH | `welcome` | Booking-stage item; use `bdate`, with a journey-only follow-up date only if a separate send date is required |
| Getting to know their story | `getToKnow` | Use `bdate`; optional journey-only follow-up date |
| Planning questionnaire | `timelineQ` | Read `getMilestones()` row; edit the same override |
| Planning call | `plancall` | Read `getMilestones()` row; edit the same override |
| Final planning meeting | `finalSync` | Read `getMilestones()` row; edit the same override |
| Wedding day | `day` | Read `getMilestones()` row; changing it means changing `wdate`, not an override |
| Gallery delivery | `gallery` | Read generated delivery date; edit with the existing `gallery` override |
| Thank-you/review follow-up | `thanks` | Read `getMilestones()` row; edit the same override |

Journey-only moments may be anchored to a canonical date but stored separately when they do not belong in the couple-facing timeline:

- wedding-week encouragement: default `day - 5 days`;
- parent connection: default `gallery + 14 days`;
- first holiday season: default 1 December after the wedding;
- first anniversary: default `day + 1 year`.

Keep these rules in one pure module, for example `src/features/journey/model.js`, and store only explicit overrides. Do not duplicate `wdate`, `gallery`, or other canonical dates in the journey row.

## New database shape

Add a one-to-one table keyed by `timeline_id`:

```text
client_journeys
  id uuid primary key
  timeline_id uuid unique not null references timelines(id) on delete cascade
  owner_id text not null
  version integer not null default 1
  plan text not null default 'signature'
  package_name text null
  focl_url text null
  last_touch date null
  completed_tasks jsonb not null default []
  referral_moments jsonb not null default {}
  journey_date_overrides jsonb not null default {}
  created_at timestamptz default now()
  updated_at timestamptz default now()
```

Generate the migration with the existing `drizzle-kit` workflow. Do not hand-edit snapshots unless Drizzle generation is unavailable. The migration must pass the existing fresh-Postgres CI job.

## API contract

Prefer a project-level read endpoint that returns one coherent workspace projection:

```text
GET /api/weddings/:timelineId/workspace
  project       canonical stored facts
  milestones    generated by getMilestones(project, locale)
  journey       photographer-only relationship state
  version       optimistic-concurrency token
```

Keep the existing timeline endpoints for backward compatibility during the first implementation. The new read endpoint may compose existing data internally; it must not create another database copy.

Writes should be intent-specific commands or narrowly scoped patches rather than competing whole-object saves from two UIs:

- update wedding facts;
- override/reset one milestone date;
- update journey checklist/referral data;
- set the FOCL link.

Every write must include the project version/ETag read by the client. Reject stale writes atomically with `412 Precondition Failed` (or a documented `409`) and ask the UI to reload/merge instead of silently overwriting newer data.

Create `api/journeys/[timelineId].js`.

### `GET /api/journeys/:timelineId`

- require Clerk authentication;
- verify that `timelines.id = timelineId` belongs to the authenticated `owner_id`;
- return a sanitized default journey when no row exists yet;
- never return another photographer's data.

Response:

```json
{
  "timelineId": "uuid",
  "journey": {
    "version": 1,
    "plan": "signature",
    "packageName": "",
    "foclUrl": "",
    "lastTouch": "",
    "completedTasks": [],
    "referralMoments": {},
    "journeyDateOverrides": {}
  }
}
```

### `PUT /api/journeys/:timelineId`

- apply the same ownership check;
- sanitize every field and reject unsupported URLs/protocols;
- upsert on `timeline_id`;
- return the sanitized saved state.

Do not add journey fields to the public timeline endpoint.

## Frontend feature contract

Create:

```text
src/features/journey/
  index.js
  journey.css
  model.js
  components.js        # optional; split only when index.js becomes unwieldy
```

Register the feature in `src/main.js` after `timeline`:

```js
startApp({ features: [home, timeline, journey] });
```

Feature descriptor:

```js
{
  id: 'journey',
  path: '/journey',
  requiresAuth: true,
  navLabel: (locale) => locale.nav.journey,
  title: (locale) => locale.tools.journey.title,
  summary: (locale) => locale.tools.journey.summary,
  icon: icons.journey,
  status: 'ready',
  mount,
  reset
}
```

The feature must be photographer-only. It needs no public route.

## Screen structure

Use the existing app shell and design tokens. Do not duplicate the global navigation.

1. **Couple selector**
   - Load `api.list()` dynamically; do not hardcode four couples.
   - Show couple name, wedding date, and status.
   - Selecting a couple loads both `api.get(id)` and the journey API.
   - Empty state links to `/timeline` to create the first couple.

2. **Summary**
   - Couple name, wedding date, location, package label.
   - Journey progress from completed checklist tasks.
   - Next action based on the earliest incomplete milestone/task.
   - Last personal touch.
   - Direct FOCL button only when a valid URL exists.

3. **Journey tab**
   - Signed contract through first anniversary.
   - Generated shared dates come from `getMilestones()`.
   - Shared-date edits write to the timeline override/state.
   - Stage checklist sits beside or below the milestone list depending on width.

4. **Eight referral moments tab**
   - Eight named relationship moments.
   - Toggle each moment on/off.
   - Editable NOK cost.
   - Essential, Signature, and Premium presets.
   - Show per-wedding total; show season total using the current number of loaded couples, not a hardcoded multiplier of four.

5. **Templates & FOCL tab**
   - Store and open the direct FOCL URL.
   - Clearly label timeline, people/groups, vendors/locations, and story priorities as integration placeholders.
   - Include Norwegian and English message templates with copy buttons.
   - Do not claim automatic FOCL sync until a verified FOCL API/connector contract exists.

## Referral moments

The eight moments are:

1. Welcome to KACH after booking.
2. Engagement/couple-session experience.
3. Wedding-week encouragement.
4. Calm care on the wedding day.
5. Gallery delivery and reliving the story.
6. Parent/family print connection.
7. First holiday-season keepsake.
8. First-anniversary follow-up.

Each moment needs localized title, description, timing label, enabled state, and cost. Defaults belong in the pure model module; human-readable copy belongs in both locale files.

## Localization

Add mirrored keys to `src/locales/nb.js` and `src/locales/en.js`:

- `nav.journey`
- `tools.journey`
- `journey.header`
- `journey.tabs`
- `journey.summary`
- `journey.stages`
- `journey.tasks`
- `journey.referrals`
- `journey.budget`
- `journey.focl`
- `journey.templates`
- `journey.feedback`

No visible string should be hardcoded in the feature.

## Visual direction

The route is an **Operate** surface. Its design thesis is **FOCL discipline, Chen Media soul**. Use GetFOCL as inspiration for focus, hierarchy, compact controls, and low-noise chrome while keeping the visual identity unmistakably KACH Weddings.

- use existing self-hosted Cormorant Garamond for editorial headings and Montserrat for controls/body;
- use warm paper surfaces, espresso text, quiet borders, and restrained moss/clay accents;
- use soft outer frames and restrained controls, with sharper internal rules and timeline geometry;
- keep states familiar, task-focused, and visually quiet;
- use the existing sidebar, buttons, focus behavior, toast system, and responsive drawer;
- headings need more space above than below, readable line-height, and a 45–75 character measure for explanatory copy;
- use at most one decisive wedding photograph in the selected-couple header; the working area stays solid and readable;
- reserve translucent glass for an optional photographic overlay or sign-in context, never routine dashboard cards;
- no oversized marketing hero, decorative gradients, card grid of equal importance, or separate visual world;
- expand `.app-canvas` only for this route if the two-column workflow needs it, without widening the timeline editor globally;
- at ≤720 px, stack milestone and checklist regions and keep every control inside the viewport.

The detailed surface brief, tokens, component rules, responsive behavior, and visual acceptance checklist are in `docs/client-journey-design-direction.md`.

## Save behavior

- Project-owned edits: save through the shared Wedding Project command/API and then recompute `getMilestones()`.
- Journey-owned edits: save through the journey API.
- A single **Save changes** control may coordinate both requests, but failures must identify which save failed and preserve unsaved state.
- Disable the save action when clean and show a success toast after both writes finish.
- Avoid silent last-write-wins races: cancel or serialize in-flight saves per selected couple.
- Add a monotonically increasing `version` (or strong ETag derived from it) and enforce optimistic concurrency in the database update itself.
- A generated date is labelled **Calculated**; an explicit override is labelled **Manual** and wins until the user resets it.
- When a base fact such as the wedding date changes, recalculate all derived dates but preserve explicit manual overrides.

## Tests required

### Pure model tests

- default journey shape;
- sanitization drops unknown keys and invalid URLs;
- referral plans and budget totals;
- journey-only date anchors around wedding day/gallery/anniversary;
- shared milestone mapping resolves dates from `getMilestones()` rather than recomputing them;
- locale parity for all journey keys.

### Feature tests (`jsdom`)

- descriptor is registered at `/journey` and requires auth;
- empty state links to `/timeline`;
- selecting a couple loads timeline + journey state;
- changing `gallery` updates `state.overrides.gallery.date` and calls timeline `PUT`;
- changing the wedding date updates the journey view after recomputation;
- referral toggles/costs update the budget;
- FOCL button rejects non-http(s) URLs and opens a saved valid URL;
- mobile DOM order matches visual/focus order.

### API tests

- owner can GET/PUT;
- non-owner receives 404, not data leakage;
- missing journey returns defaults;
- PUT upserts one row per timeline;
- public endpoint contains no journey state.

### Regression tests

- existing timeline tests and exports remain green;
- the couple-facing `/c/:slug` route is unchanged;
- `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build`, and migration test all pass.

## QA matrix

- Desktop: 1440 × 900.
- Current in-app browser width: approximately 1280 px.
- Mobile: 390 × 844 and 320 px narrow-width stress test.
- Long couple name, missing location, missing booking date, no FOCL link, and all tasks complete.
- Norwegian and English.
- Keyboard-only navigation and visible focus.
- Reduced motion.
- No horizontal document overflow; only the couple selector may use intentional contained horizontal scrolling on mobile.

## Delivery sequence

1. Add pure model and tests for mapping canonical milestones.
2. Add Drizzle table + generated migration.
3. Add authenticated journey API + ownership tests.
4. Add locale keys and journey icon.
5. Build `/journey` feature against mocked API responses.
6. Wire timeline and journey saves with explicit ownership boundaries.
7. Add responsive styles using existing tokens.
8. Run all repository checks and apply the migration to a fresh local Postgres in CI.
9. Open a pull request with screenshots and a migration note.
10. Deploy a Vercel preview; verify Clerk sign-in and one real test couple before production.

## Rollout and rollback

- Deploy behind a build-time flag such as `VITE_CLIENT_JOURNEY_ENABLED=true` for the first preview if desired.
- The new table is additive and cascades with timeline deletion; no existing data is rewritten.
- Rollback is removing the feature registration/navigation and redeploying. The additive table can remain without affecting `/timeline`.
- Do not enable production FOCL sync as part of this pull request.

## Definition of done

- `/journey` appears in the authenticated KACH sidebar.
- All current couples appear from the existing timelines API.
- Shared milestone dates exactly match `/timeline` for the same couple.
- Editing a shared date in either tool is reflected in the other after save/reload.
- Journey-only tasks, referral settings, gift costs, FOCL URL, and message tools persist per couple.
- The eight referral moments and first-anniversary endpoint are present.
- Norwegian and English both work.
- Desktop and mobile have correct text spacing and no horizontal overflow.
- All CI checks pass and the Vercel preview is usable behind Clerk authentication.

## Copy-paste Codex implementation brief

```text
Implement the integrated KACH Weddings Client Journey described in
docs/client-journey-handoff.md.

Repository: chenmedia/KACH_weddings_timeline_generator
Base branch: main
Target: a reviewable pull request; do not merge or deploy production.

Critical rule: the database-backed Wedding Project is the system of record.
getMilestones(state, locale) is the one shared scheduling policy that derives
dates from the stored project. Do not create a second calculator or persist a
second copy of generated dates. Shared-date edits from /journey and /timeline
must write the same project field/override and therefore affect both tools,
exports, and the couple-facing timeline consistently. Store only
journey-specific metadata and journey-only date overrides in client_journeys.

Use optimistic concurrency (version/ETag + atomic comparison) so two tabs or
two editor surfaces cannot silently overwrite each other.

Preserve Clerk, Neon/Drizzle, Vercel, the feature registry, localization
patterns, the existing KACH design system, and all current public timeline
behavior. Add tests, a generated migration, desktop/mobile screenshots, and a
clear PR migration note. Run every CI command listed in the handoff before
opening the PR.
```
