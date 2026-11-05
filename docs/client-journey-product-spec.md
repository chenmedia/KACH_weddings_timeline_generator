# KACH Weddings Client Journey — Product Specification

**Status:** Ready for implementation  
**Version:** 1.0  
**Date:** 5 November 2026  
**Repository:** `chenmedia/KACH_weddings_timeline_generator`  
**Target route:** `/journey`  
**Related route:** `/timeline`  

## 1. Executive decision

Build Client Journey as a new authenticated feature inside the existing KACH Weddings Tools application. It is a photographer-facing command centre for every wedding from signed contract through first anniversary.

The database-backed **Wedding Project** is the single source of truth. Neither the Client Journey dashboard nor the Timeline Generator owns canonical wedding data. Both are views and editors of the same project.

The existing `getMilestones(state, locale)` function remains the only scheduling policy for shared milestones. Generated dates are calculated, not duplicated in another table. A manual date change from either interface writes the same canonical field or milestone override.

The first release includes:

- an operational home dashboard showing the next actions across weddings;
- all current and future wedding clients loaded dynamically;
- a signed-contract-to-first-anniversary journey;
- shared dates synchronized with the Timeline Generator;
- stage checklists and next-action guidance;
- eight referral touchpoints and gift budgeting;
- Norwegian and English message templates;
- a validated direct link to each FOCL project;
- responsive, accessible KACH/Chen Media product UI.

Automatic FOCL data import is explicitly not part of this release.

## 2. Problem

KACH Weddings currently has a working Timeline Generator, while client-care actions, referral opportunities, gifts, messages, and FOCL planning live outside one coherent workflow. This creates three risks:

1. the photographer cannot immediately see the next important action for a couple;
2. dates can diverge when separate tools store separate versions of the same milestone;
3. thoughtful referral moments become dependent on memory rather than a repeatable service process.

## 3. Product outcome

The photographer can open one workspace, select a couple, understand the current stage, take the next caring action, open FOCL, and trust that all shared dates match the Timeline Generator.

### Success criteria for release 1

- The four currently booked weddings appear without being hardcoded.
- Any future wedding created in `/timeline` becomes available in `/journey` automatically.
- All shared milestone dates match between `/journey`, `/timeline`, exports, and the couple-facing timeline.
- A shared-date edit made in either authenticated tool appears in the other after save/reload.
- The photographer can identify the selected couple and next action within five seconds in a usability check.
- Journey tasks, referral settings, costs, templates, and FOCL link persist per couple.
- No journey-only notes or costs appear in a public couple endpoint.
- The experience works in Norwegian and English, at 320 px width, at 200% zoom, and with keyboard-only navigation.
- Existing timeline behavior and tests remain green.

## 4. Users and permissions

### Primary user

The authenticated KACH Weddings photographer who plans, photographs, delivers, and follows up each wedding.

### Secondary audience

Couples may see information already exposed through the existing public timeline. They do not receive access to Client Journey, internal tasks, referral planning, costs, templates, or FOCL configuration.

### Authorization rule

Every authenticated read and write must verify that the selected timeline belongs to the current Clerk `owner_id`. Return `404` for an unknown or unauthorized resource to avoid disclosing whether another photographer's record exists.

## 5. Scope

### Included in release 1

- Upgrade the authenticated `/` overview from a tool launcher/recent-couples list to an operational dashboard.
- Authenticated `/journey` feature in the existing app shell.
- Dynamic couple selection using existing wedding records.
- Couple summary, progress, next action, and last personal touch.
- Journey stages from signed contract through first anniversary.
- Canonical and journey-only dates with clear ownership.
- Stage checklists.
- Eight referral moments with enable/disable controls and editable NOK cost.
- Essential, Signature, and Premium referral presets.
- Per-wedding and season gift/referral budgets.
- Direct FOCL project URL with validation and open action.
- FOCL integration placeholders for timeline, people/groups, vendors/locations, and story priorities.
- Norwegian and English reusable message templates with copy action.
- Optimistic concurrency and explicit conflict feedback.
- Loading, empty, error, dirty, saving, saved, conflict, and partial-failure states.
- Desktop and mobile layouts.
- Database migration, tests, Vercel preview, and rollout flag.

### Not included in release 1

- Automatic FOCL import, scraping, or two-way FOCL sync.
- A separate customer CRM.
- Email or SMS sending.
- Automated gift ordering or payment.
- A couple-facing Client Journey portal.
- Replacing the existing Timeline Generator.
- Duplicating generated timeline dates in `client_journeys`.
- Event sourcing, CQRS, or a second database.
- Hardcoded client records or a hardcoded total of four weddings.

## 6. Product principles

1. **One couple record, many tools.**
2. **Make the next caring action obvious.**
3. **Generated dates have one scheduling policy.**
4. **Automation supports personal service; it does not impersonate it.**
5. **Photographer-only operations stay private.**
6. **FOCL is an external planning workspace until a verified integration exists.**
7. **Operational clarity outranks decorative composition.**

## 7. Source of truth and domain ownership

### 7.1 Canonical Wedding Project

The current `timelines` record is the canonical Wedding Project for release 1. It owns:

- couple name;
- booking date;
- wedding date;
- location;
- scheduling inputs;
- delivery/payment timing;
- canonical milestone overrides;
- existing public-share state.

### 7.2 Shared scheduling policy

`src/lib/milestones.js#getMilestones(state, locale)` derives every shared milestone date. It must be consumed by both `/timeline` and `/journey`.

Do not:

- reimplement its date logic in the journey feature;
- persist its generated output as a second date set;
- calculate the same milestone differently for a dashboard card.

### 7.3 Journey-owned data

`client_journeys` owns only:

- completed journey tasks;
- referral moment selections and costs;
- experience plan/preset;
- package label;
- FOCL project URL;
- last personal touch;
- journey-only date overrides.

### 7.4 Version ownership

Use two explicit optimistic-concurrency tokens:

- `projectVersion` for canonical Wedding Project writes;
- `journeyVersion` for journey-owned writes.

Each update must atomically compare the submitted expected version and increment it on success. A stale update returns `412 Precondition Failed` or a consistently documented `409 Conflict`. The UI must keep unsaved input, explain which part changed elsewhere, and offer reload/review.

## 8. Information architecture

Use the existing authenticated application shell and sidebar. Register one new navigation item: **Client journey**.

The authenticated workspace has three primary destinations, in this order:

1. **Overview** (`/`) — cross-wedding priorities and next actions.
2. **Client journey** (`/journey`) — relationship workflow for the selected wedding.
3. **Couples** (`/timeline`) — canonical wedding/timeline editor and couple management.

Keep **New couple** owned by `/timeline`, because it creates the canonical Wedding Project. The Overview and Client Journey may link into that flow but must not implement competing creation forms.

The `/journey` surface contains:

1. **Couple selector**
2. **Selected-couple summary**
3. **Journey tab**
4. **Referral moments tab**
5. **Templates & FOCL tab**

Do not create a second global navigation or embed the ChatGPT Site prototype in an iframe.

### 8.1 Current dashboard evidence and migration target

The live production app currently shows a centred header, `HOME`/`TIMELINE` top navigation, a Home tool launcher, and a timeline page with a stacked list of couples. The repository's current `main` branch is ahead of production: it contains a persistent authenticated sidebar, mobile drawer, feature registry, and a Home implementation that loads recent couples.

Implementation must target the current `main` branch rather than reproduce the older production shell. The Vercel preview is the authority for verifying the merged result.

Evolve the existing `src/features/home/` feature instead of creating another dashboard route:

- retain the editorial greeting;
- retain **New couple** and **All couples** actions;
- replace the recent-couple cards with an operational **Next actions** list;
- show a quiet season summary above the list, not a grid of large statistic cards;
- make **Open journey** the primary row action;
- keep **Edit timeline** as the secondary row action;
- preserve the existing empty, loading, and error patterns;
- remove the old Home tool-launcher/coming-soon content where it still exists in the deployed version; the sidebar already owns product navigation and roadmap teasers.

Dashboard rows must not be nested buttons. Use a semantic list/article row with separate labelled links or buttons for Journey and Timeline.

### 8.2 Cross-tool selected-couple context

Use one bookmarkable query parameter for cross-feature selection:

```text
/?wedding=<timelineId>
/journey?wedding=<timelineId>
/timeline?wedding=<timelineId>
```

Both `/journey` and `/timeline` must read and validate `wedding`. Keep existing `sessionStorage` handoff flags only for backward compatibility during migration. New dashboard navigation must not depend on one-shot session state.

When the selected wedding changes inside Journey or Timeline, update the URL with `history.replaceState` so reload, back/forward navigation, and copied internal URLs preserve context. Never expose the UUID in public couple links or analytics payloads.

## 9. Core user flows

### Flow A — Select a couple and find the next action

1. Open the authenticated Overview at `/`.
2. Load dashboard summaries for owned weddings.
3. Sort urgent/overdue actions first, followed by the nearest upcoming action.
4. Choose **Open journey** for a wedding.
5. Navigate to `/journey?wedding=<timelineId>`.
6. Load one coherent workspace projection.
7. Show the current stage, progress, last touch, and earliest incomplete action.
8. Let the photographer complete, edit, or open the relevant action.

**Expected result:** The photographer knows what to do next without opening a spreadsheet.

### Flow B — Change a shared milestone date

1. Open a milestone marked **Calculated** or **Manual**.
2. Select a replacement date.
3. Save it as the canonical `state.overrides[itemKey].date` using the current `projectVersion`.
4. Recompute `getMilestones()` from the saved project.
5. Update both surfaces from the same result.
6. Offer **Reset to calculated date** for manual overrides.

**Expected result:** `/journey`, `/timeline`, exports, and public timeline remain aligned.

### Flow C — Complete a journey task

1. Check a task in the active stage.
2. Mark the journey state dirty.
3. Save with `journeyVersion`.
4. Update progress and next action.
5. Preserve the completed item in context.

**Expected result:** Progress is persistent and the next incomplete action becomes prominent.

### Flow D — Plan referral moments and budget

1. Choose a preset or configure moments individually.
2. Enable or disable each moment.
3. Enter a non-negative NOK cost.
4. Show the current wedding total immediately.
5. Sum season total from loaded/owned weddings, never a hardcoded multiplier.
6. Save with `journeyVersion`.

**Expected result:** Service investment is visible per couple and across the season.

### Flow E — Open FOCL

1. Paste an `https://` FOCL project URL.
2. Validate and save the URL as journey data.
3. Show **Open in FOCL** in the couple summary and FOCL tab.
4. Open it in a new safe browser context.

**Expected result:** FOCL is one click away without implying that its data has been synchronized.

## 10. Functional requirements

### 10.1 Workspace and couple selection

| ID | Requirement | Priority | Acceptance |
| --- | --- | --- | --- |
| FR-001 | Register `/journey` in the existing feature registry and sidebar. | Must | Route requires authentication and uses the existing shell. |
| FR-002 | Load owned couples from the existing timeline list API. | Must | Current four and future records appear without code changes. |
| FR-003 | Persist the last selected couple locally for convenience, without treating it as canonical data. | Should | Returning to the route reselects an owned existing couple. |
| FR-004 | Provide an empty state linking to `/timeline`. | Must | With no records, no broken dashboard is shown. |
| FR-005 | Show couple name, wedding date, location, package, progress, next action, and last touch. | Must | Missing optional fields degrade gracefully. |
| FR-006 | Upgrade the existing Home feature into an operational cross-wedding dashboard. | Must | Home shows season summary and prioritized next actions, not only tool cards or recent couples. |
| FR-007 | Provide primary **Open journey** and secondary **Edit timeline** actions per dashboard row. | Must | Both preserve the selected wedding through `?wedding=<id>`. |
| FR-008 | Load dashboard summaries in one request rather than one journey request per couple. | Must | Network inspection shows no N+1 pattern as the wedding count grows. |
| FR-009 | Sort dashboard work by actionable urgency. | Must | Overdue/today items precede upcoming items; completed/disabled items do not become next action. |

### 10.2 Journey timeline and dates

| ID | Requirement | Priority | Acceptance |
| --- | --- | --- | --- |
| FR-010 | Display journey from booking through first anniversary. | Must | All defined stages are present in chronological order. |
| FR-011 | Read shared milestone dates only from `getMilestones()`. | Must | Snapshot comparison matches `/timeline` for the same project. |
| FR-012 | Distinguish **Calculated** and **Manual** dates. | Must | Manual overrides have a reset action. |
| FR-013 | Write shared date edits to the canonical project field/override. | Must | Reloading either tool shows the same saved date. |
| FR-014 | Store only journey-only date overrides in `client_journeys`. | Must | No duplicate canonical date columns or JSON values are introduced. |
| FR-015 | Recalculate derived dates when a base fact changes while preserving explicit overrides. | Must | Wedding-date change moves calculated dates but not manual dates. |

### 10.3 Stage checklists

| ID | Requirement | Priority | Acceptance |
| --- | --- | --- | --- |
| FR-020 | Show tasks relevant to the selected stage. | Must | Active stage tasks are visible beside/below the timeline. |
| FR-021 | Persist completion per couple. | Must | Completion survives reload and does not affect other couples. |
| FR-022 | Calculate progress from defined tasks, not manual percentage input. | Must | Progress changes when tasks change. |
| FR-023 | Derive next action from the earliest incomplete due task/milestone. | Must | Completed or disabled items are skipped. |
| FR-024 | Allow a completed task to be reopened. | Should | Unchecking updates progress and next action. |

### 10.4 Referral moments and budget

| ID | Requirement | Priority | Acceptance |
| --- | --- | --- | --- |
| FR-030 | Provide exactly eight localized referral moments. | Must | All moments in section 12 are visible in NB and EN. |
| FR-031 | Allow each moment to be enabled/disabled and assigned a NOK cost. | Must | Negative and invalid costs are rejected. |
| FR-032 | Provide Essential, Signature, and Premium presets. | Must | Applying a preset updates moment configuration but remains editable. |
| FR-033 | Calculate per-wedding total. | Must | Total equals enabled moment costs. |
| FR-034 | Calculate season total from actual owned journey data. | Must | Adding/removing a wedding changes the total without source edits. |

### 10.5 Templates and FOCL

| ID | Requirement | Priority | Acceptance |
| --- | --- | --- | --- |
| FR-040 | Provide localized message templates with copy action. | Must | Copy gives visible success feedback and preserves line breaks. |
| FR-041 | Store one FOCL project URL per wedding. | Must | Only `https://` URLs are accepted for release 1. |
| FR-042 | Show a direct FOCL action only when a valid URL exists. | Must | Missing/invalid URL shows setup state, not a broken link. |
| FR-043 | Label future FOCL data areas as integration placeholders. | Must | UI never says imported, synced, or up to date without a verified connection. |

### 10.6 Save and conflict behavior

| ID | Requirement | Priority | Acceptance |
| --- | --- | --- | --- |
| FR-050 | Track project-owned and journey-owned dirty state separately. | Must | UI can identify which save failed. |
| FR-051 | Save project data with `projectVersion`. | Must | Stale write cannot overwrite a newer project. |
| FR-052 | Save journey data with `journeyVersion`. | Must | Stale journey write returns conflict. |
| FR-053 | Preserve unsaved input on network or partial failure. | Must | Retry is possible without re-entering data. |
| FR-054 | Serialize or cancel duplicate saves for the same couple. | Must | Rapid clicks do not create out-of-order state. |
| FR-055 | Warn before switching couples with unsaved changes. | Must | User can stay, discard, or save. |

## 11. Milestone ownership map

| Journey concept | Canonical key/source | Behavior |
| --- | --- | --- |
| Contract signed | `state.bdate` | Display/edit booking date. |
| Welcome to KACH | `welcome` | Derived from booking state; optional separate send date is journey-only. |
| Getting to know their story | `getToKnow` | Shared milestone; optional follow-up is journey-only. |
| Planning questionnaire | `timelineQ` | Shared generated date; edit canonical override. |
| Planning call | `plancall` | Shared generated date; edit canonical override. |
| Final planning meeting | `finalSync` | Shared generated date; edit canonical override. |
| Wedding day | `day` / `state.wdate` | Editing changes the wedding date, not an override. |
| Gallery delivery | `gallery` | Shared generated date; edit `gallery` override. |
| Thank-you/review | `thanks` | Shared generated date; edit canonical override. |
| Wedding-week encouragement | Journey-only | Default `day - 5 days`; store only explicit override. |
| Parent/family print connection | Journey-only | Default `gallery + 14 days`; store only explicit override. |
| First holiday keepsake | Journey-only | Default 1 December after wedding; store only explicit override. |
| First anniversary | Journey-only | Default `day + 1 year`; store only explicit override. |

Journey-only defaults live in one pure module, proposed as `src/features/journey/model.js`.

## 12. Eight referral moments

| # | Moment | Default anchor | Purpose |
| --- | --- | --- | --- |
| 1 | Welcome to KACH | Booking | Confirm belonging and set expectations. |
| 2 | Engagement/couple-session experience | Session/planning phase | Create confidence and a shareable experience. |
| 3 | Wedding-week encouragement | Five days before wedding | Reduce stress and demonstrate personal care. |
| 4 | Calm care on the wedding day | Wedding day | Make the service itself referable. |
| 5 | Gallery delivery and reliving the story | Gallery delivery | Turn delivery into an emotional moment. |
| 6 | Parent/family print connection | Two weeks after gallery | Extend the relationship to family and print. |
| 7 | First holiday-season keepsake | First December after wedding | Reconnect naturally with a meaningful gift. |
| 8 | First-anniversary follow-up | One year after wedding | Close the journey and reopen referral/album conversation. |

Each moment requires localized title, description, timing label, enabled state, cost, and related checklist/template action.

## 13. Data specification

### 13.1 Canonical project change

If `timelines` does not already have a safe concurrency token, add:

```text
version integer not null default 1
```

All authenticated project writes must update with `WHERE id = ? AND owner_id = ? AND version = ?`, incrementing `version` in the same statement/transaction.

### 13.2 New journey table

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
  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()
```

Requirements:

- unique one-to-one relation with a timeline;
- ownership verified through both `owner_id` and parent project;
- `on delete cascade` when a wedding is deleted;
- JSON payloads sanitized against allowlists;
- URLs normalized and restricted to `https://`;
- generated through the existing Drizzle migration workflow.

## 14. API specification

### 14.1 Dashboard summary read

```text
GET /api/weddings/dashboard
```

Response:

```json
{
  "summary": {
    "weddingCount": 4,
    "needsAttentionCount": 1,
    "nextWeddingDate": "2027-06-01"
  },
  "weddings": [
    {
      "id": "uuid",
      "couple": "Couple name",
      "weddingDate": "2027-06-01",
      "location": "",
      "status": "lead",
      "stageKey": "planning",
      "nextActionKey": "planningQuestionnaire",
      "nextActionDate": "2027-03-01",
      "nextActionSource": "project",
      "completedTaskCount": 3,
      "totalTaskCount": 8,
      "lastTouch": "2026-11-01",
      "foclConfigured": true
    }
  ]
}
```

Rules:

- authenticate and filter by `owner_id`;
- return language-neutral keys and ISO dates; the client localizes labels;
- derive summary data from canonical project state plus journey state at request time;
- do not persist a dashboard summary table or another copy of milestone dates;
- use a bounded query/join and server-side derivation, not one browser request per wedding;
- order output by urgency or return enough stable data for one deterministic client sort;
- never include FOCL URL, message text, costs, private notes, or public share secrets in this summary.

The existing `GET /api/timelines` remains the lightweight list used by the Timeline editor. Do not overload it with the entire journey projection.

### 14.2 Workspace read

```text
GET /api/weddings/:timelineId/workspace?locale=nb|en
```

Response:

```json
{
  "project": {},
  "projectVersion": 12,
  "milestones": [],
  "journey": {
    "plan": "signature",
    "packageName": "",
    "foclUrl": "",
    "lastTouch": "",
    "completedTasks": [],
    "referralMoments": {},
    "journeyDateOverrides": {}
  },
  "journeyVersion": 3
}
```

The endpoint composes canonical project data, `getMilestones()`, and sanitized journey state. A missing journey row returns defaults without creating data during GET.

### 14.3 Project writes

Extend the existing authenticated timeline/project write path to accept an expected `projectVersion` through `If-Match` or a documented body field. Preserve backward compatibility for unaffected routes during rollout, but require versioned writes from both authenticated editors before enabling `/journey` in production.

Shared milestone override command shape:

```json
{
  "itemKey": "gallery",
  "date": "2027-08-12",
  "expectedVersion": 12
}
```

Reset removes the override rather than storing the generated date.

### 14.4 Journey read/write

```text
GET /api/journeys/:timelineId
PUT /api/journeys/:timelineId
```

`PUT` includes `expectedVersion`, validates every field, upserts the one-to-one row, and returns sanitized saved state plus the incremented `journeyVersion`.

### 14.5 Error contract

Use stable error codes in addition to localized UI copy:

- `UNAUTHENTICATED` — `401`
- `NOT_FOUND` — `404`
- `VALIDATION_ERROR` — `400` or `422`
- `VERSION_CONFLICT` — `412` or consistently documented `409`
- `INTERNAL_ERROR` — `500`

Never return another owner's data or raw database errors.

## 15. Frontend implementation contract

Create:

```text
src/features/journey/
  index.js
  journey.css
  model.js
  components.js       # only if index.js becomes difficult to maintain
```

Update the existing dashboard feature:

```text
src/features/home/
  index.js          # dashboard summary loading and navigation
  home.css          # next-action rows, season summary, responsive states
```

Extend `src/lib/api-client.js` with `dashboard()` and `workspace(id)` methods. Add a small shared navigation helper only if it prevents duplicate parsing/validation of the `wedding` query parameter across Home, Journey, and Timeline.

Register features in the operational navigation order:

```js
startApp({ features: [home, journey, timeline] });
```

`home` remains first because it owns `/`. This order also makes Client Journey the primary workflow immediately after Overview in both the current top navigation and the newer sidebar shell.

Define the Journey feature with this descriptor and register it between `home` and `timeline` in `src/main.js`:

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

Add mirrored locale trees to `src/locales/nb.js` and `src/locales/en.js`. No visible journey string may be hardcoded in the feature.

## 16. UX and visual specification

### Design thesis

**FOCL discipline, Chen Media soul.**

Use GetFOCL as inspiration for focus, compact task flows, strong primary actions, and low-noise product chrome. KACH/Chen Media remains the visual authority.

### Required composition

- Existing sidebar/app shell.
- Overview: editorial greeting, quiet season summary, and a single prioritized next-actions list.
- Compact couple rail or selector.
- Shallow selected-couple header with one optional wedding image.
- Tabs using underline/tonal active state, not pill navigation.
- Primary milestone column with secondary sticky checklist on wide screens.
- Inline totals and progress instead of a grid of same-weight statistic cards.

### Visual rules

- Cormorant Garamond for couple names and editorial section titles.
- Montserrat for body, controls, labels, inputs, and metadata.
- Warm paper/canvas, espresso text, quiet lines, restrained moss/clay accents.
- Soft `12–16px` outer frames; `8–10px` controls; sharper internal rules.
- One decisive photograph at most in the selected-couple header.
- Glass effects only for an optional photographic overlay or sign-in context.
- No oversized marketing hero, decorative gradient, nested rounded-card grid, or generic SaaS dashboard styling.
- Primary body text is at least `16px`; actionable metadata must not become tiny.
- Heading spacing is larger above than below; explanatory copy stays around 45–75 characters per line.

See `docs/client-journey-design-direction.md` for detailed tokens and acceptance rules.

## 17. Responsive and accessibility requirements

- No document-level horizontal overflow.
- At `≤960px`, remove sticky checklist behavior when necessary.
- At `≤720px`, stack work regions and keep tabs inside a bounded scroll rail if required.
- At `320px`, every action and input remains within the viewport.
- Touch targets are at least `44px`; existing KACH convention may use `45px`.
- DOM order matches visual and keyboard order.
- All interactions work by keyboard with visible focus.
- Use semantic landmarks, headings, tabs, buttons, labels, and status announcements.
- Respect `prefers-reduced-motion`.
- Never communicate completion, conflict, or error by color alone.
- Long Norwegian copy, couple names, and locations wrap without covering controls.
- The interface remains complete when no image exists.

## 18. Operational states

The implementation is incomplete unless all states below are intentionally designed:

| State | Required behavior |
| --- | --- |
| Loading | Preserve shell and show bounded skeleton/progress without layout jump. |
| No weddings | Explain the empty state and link to create one in `/timeline`. |
| No journey row | Render safe defaults; create only on first write. |
| No FOCL URL | Show setup action and integration explanation. |
| Dirty | Make unsaved state visible and enable save. |
| Saving | Prevent duplicate action and identify which data group is saving. |
| Saved | Confirm selected couple and successful save. |
| Validation error | Focus/identify the exact invalid field. |
| Network error | Keep local changes and allow retry. |
| Version conflict | Explain external/newer change; offer reload/review without silent loss. |
| Partial failure | State whether project or journey data failed; retain unsaved portion. |
| All tasks complete | Celebrate quietly and show the next relationship milestone. |

## 19. Non-functional requirements

### Security and privacy

- Clerk authentication on all journey routes and APIs.
- Ownership verification on every resource access.
- No internal journey fields in `/api/public/timeline/:slug`.
- URL protocol allowlist; safe external link attributes.
- Input size limits and JSON allowlists.
- No secrets or connector credentials in client code.

### Reliability

- No silent last-write-wins behavior.
- Idempotent journey upsert for one timeline.
- Additive migration that does not rewrite existing timeline data.
- Existing public and authenticated timeline routes remain available during rollout.

### Performance

- Initial journey workspace should use one coherent read request after couple selection.
- Avoid loading full image originals for the header.
- Avoid new UI-framework dependencies unless justified in the PR.
- Keep route code compatible with the existing dependency-light architecture.

### Localization

- Norwegian Bokmål and English parity is enforced by test.
- Dates and currency use the active locale.
- Stored identifiers remain language-neutral.

## 20. Testing requirements

### Pure model tests

- default journey state;
- unknown-key and invalid-URL sanitization;
- referral presets and totals;
- journey-only date anchors;
- mapping to canonical milestones;
- recalculation with preserved overrides;
- next-action selection;
- NB/EN locale parity.

### API tests

- authenticated owner can read and update;
- non-owner receives `404`;
- missing row returns defaults;
- first write creates one row;
- subsequent write increments version;
- stale project and journey writes fail atomically;
- malformed URL/cost/payload is rejected;
- public timeline response contains no journey state.

### Feature tests

- descriptor registration and auth requirement;
- Home loads one dashboard summary request and renders urgency order;
- dashboard row opens `/journey?wedding=<id>` and timeline secondary action opens `/timeline?wedding=<id>`;
- Home has no nested interactive controls and retains empty/loading/error states;
- dynamic couple list and empty state;
- couple selection loads workspace;
- shared override writes canonical project state;
- wedding-date change recomputes derived milestones;
- checklist drives progress and next action;
- referral controls drive totals;
- FOCL button behavior;
- unsaved-change guard;
- conflict and partial-failure UI;
- mobile DOM/focus order.

### Regression and CI

The following must pass:

```text
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
existing migration/fresh-Postgres test
```

The PR must include desktop and mobile screenshots from a Vercel preview.

## 21. Acceptance scenarios

### AC-01 — Existing weddings appear

Given the owner has four timelines, when `/journey` loads, then four selectable couples appear using live owned data and no client names are present in source code.

### AC-02 — Shared dates agree

Given one selected wedding, when the gallery milestone is viewed in both tools, then the displayed date and manual/calculated status are identical.

### AC-03 — Journey edit affects timeline

Given a calculated gallery date, when it is overridden in `/journey` and saved, then `/timeline`, export, and public timeline use the saved override.

### AC-04 — Base-date edit recalculates

Given calculated and manual milestones, when the wedding date changes, then calculated milestones move while manual overrides remain unchanged.

### AC-05 — Concurrent editing is safe

Given two tabs loaded at the same version, when one saves and the other later saves stale data, then the second receives a conflict and cannot overwrite the first silently.

### AC-06 — Journey data remains private

Given stored costs and checklist data, when the public timeline endpoint is requested, then none of those fields are present.

### AC-07 — FOCL claim is accurate

Given a stored FOCL URL, when opened, then it navigates to FOCL; the KACH UI does not claim any FOCL content was imported or synchronized.

### AC-08 — Mobile remains in frame

Given a 320 px viewport and long Norwegian content, when every tab and form is used, then no document-level horizontal overflow or inaccessible control occurs.

### AC-09 — Overview drives the workflow

Given multiple owned weddings with incomplete actions, when the photographer opens `/`, then one dashboard request returns the summaries, the most urgent valid action is first, and its primary action opens the correct Client Journey through a bookmarkable `wedding` query parameter.

### AC-10 — Dashboard does not create another truth

Given a milestone or checklist change, when Overview is reloaded, then its next action and progress are re-derived from the Wedding Project and journey state rather than read from a duplicated dashboard record.

## 22. Delivery plan

Implement as reviewable vertical slices on one feature branch:

1. **Domain foundation** — pure journey model, milestone mapping, defaults, sanitizers, and tests.
2. **Persistence** — project version if absent, `client_journeys`, generated migration, and migration tests.
3. **API** — dashboard summary, workspace read, journey read/write, versioned project writes, ownership and conflict tests.
4. **Navigation context** — shared `wedding` query behavior in Home, Journey, and Timeline.
5. **Overview integration** — evolve `src/features/home/` into the prioritized cross-wedding dashboard.
6. **Feature shell** — route registration, locale keys, couple selector, loading/empty/error states.
7. **Journey workflow** — summary, milestones, shared edits, checklist, next action.
8. **Referral workflow** — eight moments, presets, costs, per-wedding and season totals.
9. **Templates & FOCL** — localized templates, copy feedback, URL setup/open, honest placeholders.
10. **Design and responsive pass** — apply the surface brief, keyboard access, reduced motion, overflow tests.
11. **Regression and preview** — full CI, fresh migration, screenshots of Overview and Journey, Clerk verification with a test wedding.

Each slice should leave tests green. Do not postpone ownership, conflicts, or mobile behavior until after the feature is functionally complete.

## 23. Rollout and rollback

### Rollout

1. Deploy behind `VITE_CLIENT_JOURNEY_ENABLED=true` in preview.
2. Apply the additive migration to the preview database.
3. Verify Clerk authentication and one real test wedding.
4. Compare every shared milestone between `/journey` and `/timeline`.
5. Verify NB/EN, desktop/mobile, conflict handling, and public endpoint privacy.
6. Enable the feature in production only after launch gates pass.

### Rollback

- Disable feature registration/navigation and redeploy.
- Leave the additive `client_journeys` table in place; it does not affect `/timeline`.
- Do not drop stored journey data as part of an application rollback.
- If versioned writes cause a production regression, disable journey first; do not restore silent last-write-wins behavior as a permanent fix.

## 24. Risks and resolved decisions

| Risk/question | Decision |
| --- | --- |
| Dashboard or Timeline as source of truth? | Neither. The database-backed Wedding Project is authoritative. |
| Where is date logic maintained? | One shared `getMilestones()` policy. |
| Can generated dates be stored in journey JSON? | No. Store explicit overrides only. |
| Can a pasted FOCL link import all data? | No. Release 1 opens a validated direct link only. |
| Can both editors save safely? | Yes, with separate project/journey versions and atomic checks. |
| Are the current four clients fixtures? | No. They are live data and the UI must be dynamic. |
| Should the prototype be embedded? | No. Rebuild within the existing app shell and conventions. |
| Should FOCL's look be copied? | No. Borrow product discipline; preserve KACH/Chen Media identity. |
| Does Client Journey live only as a separate route? | No. `/journey` is the detail workflow, while `/` surfaces its next actions across all weddings. |
| Should Home call every journey endpoint? | No. Use one derived dashboard-summary endpoint to avoid N+1 requests. |
| Production shell or repository `main` as implementation baseline? | Build against `main`; production currently shows an older top-nav/launcher shell. Verify the final shell in preview before release. |

### Open integration decision after release 1

Automatic FOCL synchronization requires verified documentation for authentication, project identifiers, fields, rate limits, webhook/polling behavior, consent, and conflict ownership. Until that exists, the database does not treat FOCL as canonical input.

## 25. Definition of done

Implementation is done only when:

- all Must requirements and acceptance scenarios pass;
- Overview shows prioritized next actions and routes into the correct selected wedding;
- Home uses one dashboard summary request rather than per-wedding journey requests;
- shared dates are demonstrably identical across relevant surfaces;
- stale writes cannot silently overwrite newer changes;
- journey-only data is absent from public responses;
- all eight referral moments and first-anniversary flow are present;
- FOCL link and integration language are accurate;
- NB and EN are complete;
- desktop, 390 px, 320 px, keyboard, reduced-motion, and 200% zoom QA pass;
- migration and all repository checks pass;
- the PR includes screenshots, migration notes, test evidence, and rollback notes;
- a Vercel preview has been verified behind Clerk;
- production has not been merged or deployed without explicit approval.

## 26. Codex implementation brief

```text
Implement the KACH Weddings Client Journey defined in
docs/client-journey-product-spec.md.

Repository: chenmedia/KACH_weddings_timeline_generator
Base branch: main
Deliverable: a reviewable implementation pull request.
Do not merge or deploy production.

Read these before editing:
- PRODUCT.md
- docs/client-journey-product-spec.md
- docs/adr/0001-wedding-project-source-of-truth.md
- docs/client-journey-design-direction.md
- docs/client-journey-handoff.md

Critical architecture:
- The database-backed Wedding Project is the single source of truth.
- getMilestones(state, locale) is the only shared scheduling policy.
- Do not create another date calculator or persist generated dates twice.
- Shared edits from /journey and /timeline write the same canonical project
  field/override.
- Store only journey-owned state and journey-only overrides in
  client_journeys.
- Use separate projectVersion and journeyVersion tokens with atomic optimistic
  concurrency. Never silently overwrite a newer save.
- Keep journey-only data out of all public endpoints.
- FOCL release 1 is a validated direct link and honest placeholders, not sync.
- The existing Home feature becomes the cross-wedding dashboard. Add one derived
  dashboard-summary endpoint, make Journey the primary next-action destination,
  and use ?wedding=<timelineId> across Home, Journey, and Timeline.

Preserve the existing Clerk, Neon/Drizzle, Vercel, feature-registry,
localization, testing, and dependency-light JavaScript conventions. Work in
the delivery order from the spec. Add the generated migration and all required
tests. Run every repository check, deploy a Vercel preview, and attach desktop
and mobile screenshots plus migration/rollback notes to the implementation PR.
```

