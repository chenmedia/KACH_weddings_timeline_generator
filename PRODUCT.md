# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is the KACH Weddings photographer operating an authenticated workspace before, during, and after each booked wedding. Couples are a secondary audience for explicitly shared, read-only material.

## Product Purpose

KACH Weddings Tools keeps the operational story of each wedding in one place: the photography timeline, the photographer's client-care journey, referral moments, planning links, and reusable communication. Success means the photographer can see the next thoughtful action for any couple and complete it without maintaining a parallel spreadsheet.

## Positioning

The product joins practical wedding-day planning with a relationship workflow that continues from signed contract through the first anniversary. Timeline and client journey share one database-backed wedding project instead of becoming separate tools with duplicate data.

## Operating Context

- The photographer works from `tools.kachweddings.no` and signs in through Clerk.
- Couple, wedding date, booking date, location, and status come from the existing timeline record.
- FOCL remains the detailed planning workspace; this product stores a direct FOCL project link and shows integration-ready placeholders.
- The app is deployed from GitHub to Vercel and stores authenticated data in Neon Postgres through Drizzle.
- Norwegian and English are supported throughout the existing workspace.

## Capabilities and Constraints

- Preserve the existing feature registry, app shell, authentication, API conventions, and dependency-light JavaScript architecture.
- Add the client journey as an authenticated `/journey` feature in the existing tool navigation.
- Treat the database-backed wedding project as the system of record for identity, wedding facts, scheduling inputs, and manual overrides.
- Treat `getMilestones()` as the shared, versioned scheduling policy that derives dates from the stored project; it is not a second persistence layer.
- Store only journey-specific state separately: completed checklist items, referral-moment selections and costs, experience plan, package label, FOCL URL, last personal touch, and dates for relationship moments that do not exist in the timeline engine.
- A shared milestone edited from either client journey or timeline must write the same database field or override so both tools immediately show the same date.
- Include the signed-contract-to-first-anniversary workflow, eight referral moments, stage checklists, gift budgeting, and message templates.
- FOCL data sync is an open integration decision; a direct project link is the confirmed first implementation.
- Do not expose internal journey notes through the existing public couple timeline endpoint.

## Brand Commitments

The product remains KACH Weddings: elegant, minimal, warm, editorial, calm, and personal. The existing self-hosted Cormorant Garamond and Montserrat families, neutral palette, sharp controls, and restrained interaction system are incumbent authority. Operational clarity takes priority over decorative composition.

## Evidence on Hand

- Existing production tool: `https://tools.kachweddings.no/timeline`.
- Existing modular app shell and feature registry under `src/app/`.
- Existing timeline, authentication, database, API, localization, test, and Vercel infrastructure in this repository.
- A working client-journey prototype exists separately and supplies workflow content and interaction requirements; its visual identity is adapted to the incumbent tools system rather than copied wholesale.
- No verified automatic FOCL API contract is present in this repository; no sync capability should be claimed.

## Product Principles

1. One couple record, many tools.
2. Make the next caring action obvious.
3. Automation supports personal service; it does not impersonate it.
4. Couple-facing information and photographer-only operations remain clearly separated.
5. Every workflow stays usable on desktop and mobile.

## Accessibility & Inclusion

Preserve semantic navigation, keyboard access, visible focus, responsive reflow, reduced-motion support, and readable contrast already established in the application.
