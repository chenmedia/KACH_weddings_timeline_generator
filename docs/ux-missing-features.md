# Product roadmap: approved capabilities

Decision log updated 6 November 2026. All capabilities below are approved in principle. The notes capture the intended first scope so later implementation does not silently grow beyond what the studio needs.

## Product rules

- The dashboard database remains the source of truth for client journeys, dates, tasks and workflow state.
- Every integration writes through a defined sync layer and records material changes in the activity log.
- Notifications start inside the website. Email delivery is added where it removes manual work. SMS is not in the current scope.
- The product remains optimized for one studio owner. Access control is designed so a limited second-shooter role can be added later.
- External finance data starts as read-only status data. The dashboard must not create or modify invoices until that workflow is explicitly approved.

## Priority 0: complete the core workflow

1. **Verified FOCL sync — implementation ready**
   The private KACH MCP now receives data from the connected FOCL Wedding Planner through ChatGPT, creates a reviewable import preview, rejects stale changes, preserves manual KACH data and records a restore point plus activity entry. Production activation still requires migration `0009`, the two private Vercel environment variables and connecting `/api/mcp` in ChatGPT.
2. **Scheduled email through Resend**
   Send or schedule email from a template, with delivery status and an activity-log record. Do not implement SMS in the first version.
3. **In-app notification center — implemented**
   Surface overdue actions, upcoming milestones, new couple comments, failed email delivery and sync failures inside the dashboard. Email digests can be considered later.
4. **Reusable workflow templates — implemented**
   Save milestone, checklist, gift budget and message defaults by package, then apply them when a couple is created.

## Priority 1: reduce studio administration

5. **Payments and invoices**
   Track booking fee, final payment, invoice due dates and payment status in the same client record. Explore a read-only Fiken integration before any two-way finance workflow.
6. **Two-way calendar sync**
   Sync meetings, sessions and wedding dates with Google or Apple Calendar and detect scheduling conflicts.
7. **Search, filters and season archive**
   Find couples by name, venue, date, stage or status and archive completed wedding seasons without losing history.
8. **Bulk import and duplicate detection**
   Import several FOCL projects at once, match existing couples and prevent duplicate client records.
9. **Gallery and album workflow**
   Track culling, editing, sneak peek, gallery, album proofing and final delivery as explicit production states.

## Priority 2: improve collaboration and insight

10. **Client notifications for review changes**
    Notify the couple by email when a comment is resolved or a revised timeline is ready. Create an in-app notification for KACH when new feedback arrives.
11. **Attachments and visual references**
    Allow the couple and photographer to attach screenshots, documents or inspiration to a timeline comment.
12. **Roles and team access**
    Keep one owner account initially. Prepare a limited second-shooter role that can access assigned wedding-day information without finance, private notes or global settings.
13. **Referral reporting**
    Connect referral moments, gift spend, reviews and actual enquiries to show which follow-ups create value.
14. **Automated backups and export**
    Schedule restore points and provide a complete client-record export for handover, compliance and long-term storage.

## Delivery sequence

### Phase 1: operational foundation

1. In-app notification center — implemented; notification preferences remain deferred
2. Reusable workflow templates by package — implemented
3. Search, filters and season archive
4. Scheduled restore points and complete client export

### Phase 2: integrations

1. Verified FOCL synchronization
2. Resend email delivery and scheduling
3. Read-only Fiken payment and invoice status
4. Calendar synchronization and conflict detection

### Phase 3: production workflow

1. Bulk import and duplicate detection
2. Gallery and album production states
3. Client review notifications and attachments

### Phase 4: collaboration and insight

1. Restricted second-shooter access
2. Referral conversion and gift-spend reporting
3. Broader automation only after real studio usage identifies the need

## Implemented: in-app notification center

The first notification-center release is implementation-ready and includes:

- unread and read state;
- a notification inbox in the sidebar;
- direct links to the relevant couple and workspace tab;
- notification types for overdue task, new review comment and failed sync;
- mark one or all as read;
- retention rules;
- empty, loading and error states;
- responsive desktop and mobile behavior.

Upcoming milestone reminders, failed Resend delivery and calendar-conflict notifications are intentionally deferred until those underlying workflows exist.

## Implemented: reusable workflow templates

KACH can now create package templates for timeline timing, included engagement sessions and albums, active checklist tasks, referral touchpoints, gift budgets and message copy. The default template is copied into every new couple, so later template edits do not alter existing client work. A template can also be deliberately applied to an existing couple while preserving completed tasks, the FOCL link, last-touch history and manual dates.

## Recommended next implementation

Build search, filters and a season archive across the client overview. Start with couple, venue, date, stage and status filters, saved in the URL so the current working view survives reloads and can be bookmarked.
