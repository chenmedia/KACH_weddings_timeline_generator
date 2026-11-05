# ADR 0001: Wedding Project as the source of truth

- Status: proposed for the Client Journey implementation
- Date: 2026-11-05

## Context

KACH Weddings Tools has two operational surfaces that need the same couple and scheduling data:

1. the client-journey dashboard, which is the photographer's main command centre;
2. the timeline generator, which creates and edits the detailed photography timeline.

Both surfaces must show the same wedding date, planning dates, delivery date, and manual overrides. Either surface may initiate an edit. A future FOCL integration may also supply selected planning facts.

Making either UI the authority would couple business data to presentation and require the other UI to synchronize with it. Persisting generated dates in both places would create drift.

## Decision

Use a single database-backed **Wedding Project** aggregate as the system of record.

In the current schema, `timelines` is the starting project table and may keep its name for a non-breaking first release. It stores canonical facts and scheduling inputs such as couple, booking date, wedding date, location, delivery timing, payment timing, status, and explicit milestone overrides.

`getMilestones(state, locale)` is the shared scheduling policy. It derives the current schedule from the Wedding Project each time a projection is requested. Generated dates are not independently persisted. Explicit overrides are persisted once and win until reset.

The client journey stores only relationship-specific state in a one-to-one `client_journeys` row. The timeline and dashboard are query projections and command surfaces over the same aggregate.

Use one Postgres database and transactional writes. A separate read database, event sourcing, or asynchronous synchronization is not justified for this product's scale. Logical separation between commands and projections is useful; physical CQRS infrastructure is not.

Use optimistic concurrency with a project `version`/ETag. Every state-changing request includes the version it was based on, and the server performs an atomic conditional update. Stale writes fail instead of overwriting newer data.

## Edit rules

- Base facts edited anywhere update the Wedding Project.
- Shared milestone edits update the canonical override for that milestone key.
- A change to a base fact regenerates derived dates while preserving explicit overrides.
- Journey-only tasks, costs, notes, and dates update `client_journeys`.
- Couple-facing queries filter out photographer-only journey state.
- FOCL imports are proposed changes unless a field has an explicit ownership rule. They never silently replace a manual KACH edit.

## Consequences

### Positive

- Dashboard and timeline cannot drift when they read the same project version.
- The timeline generator can be redesigned without moving authoritative data.
- Generated dates remain explainable and reproducible from inputs plus policy version.
- Manual overrides work identically from either surface.
- Public and photographer-only projections can enforce different field visibility.

### Costs

- The current whole-state `PUT /api/timelines/:id` should evolve toward narrower commands/patches.
- API responses need a version/ETag and conflict handling.
- The feature must distinguish calculated dates from manual overrides in the UI.
- A policy-version migration strategy is needed if future scheduling rules change materially.

## Rejected alternatives

### Dashboard as the source of truth

Rejected as a literal architecture. The dashboard should be the primary workflow, but a UI must not own canonical data. Its database/API domain model can be authoritative.

### Timeline generator as the source of truth

Rejected because it makes a focused presentation/editor surface own unrelated relationship and integration data. The existing `getMilestones()` logic remains authoritative scheduling policy, not the owning UI.

### Store generated dates separately for each surface

Rejected because synchronization and conflict resolution become unavoidable and failures create silent client-facing errors.

### Full event sourcing or separate CQRS databases

Rejected for now because it adds eventual consistency, messaging, retries, and operational overhead without a demonstrated scale or audit requirement. The same benefits needed here are available through a shared Postgres write model, clean command/query boundaries, and an optional append-only audit table later.
