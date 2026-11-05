# Client journey design direction

## Design thesis

**FOCL discipline, Chen Media soul.**

The client journey should feel as focused and easy to operate as a dedicated wedding-planning product, while remaining recognizably KACH Weddings: warm, photographic, editorial, calm, and personal.

The public GetFOCL landing/sign-in experience is the reference currently reviewed. It demonstrates strong focus, low-noise chrome, compact composition, clear primary actions, and careful use of a dark photographic surface. Do not infer or copy unverified logged-in product patterns.

## What to borrow and what to translate

| GetFOCL signal                    | KACH/Chen Media translation                                                               |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| One clear task and primary action | Make the next caring action visually dominant for the selected couple                     |
| Compact, disciplined product UI   | Keep navigation, filters, statuses, and controls concise and predictable                  |
| Soft, refined outer container     | Use a subtly rounded couple header and working frame, not rounded cards everywhere        |
| High-contrast action              | Use an espresso primary action on warm paper; reserve white-on-photo for the image header |
| Dark photographic atmosphere      | Use one real wedding image as an accent, with a calm dark overlay when text sits on it    |
| Neutral sans-serif interface      | Keep Montserrat for functional UI and metadata                                            |

## Chen Media character

- Cormorant Garamond gives couple names, key dates, and section titles an editorial voice.
- Montserrat carries buttons, navigation, labels, inputs, and body copy.
- Real KACH wedding photography is used decisively, not as wallpaper behind every surface.
- Fine rules, measured whitespace, and calm alignment create a contact-sheet/editorial rhythm.
- Moss and clay identify relationship moments and care states; they are accents, not large background fields.
- Copy stays direct, warm, and photographer-led. Avoid generic SaaS language.

## Page composition

Use the existing application shell and sidebar. Inside `/journey`, build the surface in this order:

1. **Couple rail** — a compact horizontal selector on wide screens and a native-feeling select/drawer on narrow screens. Show name, wedding date, and state; do not turn every couple into a large card.
2. **Selected-couple header** — a shallow summary band with couple name, wedding date, location, progress, next action, and FOCL link. It may use one wedding photograph with a dark overlay. It must not become a tall marketing hero.
3. **Section tabs** — Journey, Referral moments, and Templates & FOCL. Use an underline or tonal active state rather than pill navigation.
4. **Working area** — milestone list/timeline as the primary column and a sticky stage checklist as the secondary column. The first incomplete action receives the strongest hierarchy.
5. **Budget and status summaries** — present totals and completion as quiet inline summaries, not dashboard-card clutter.

Suggested wide layout:

```text
┌ existing app navigation ──────────────────────────────────────────────┐
│ Couple rail                                                          │
│ ┌ selected couple / image / next action / FOCL ────────────────────┐ │
│ └───────────────────────────────────────────────────────────────────┘ │
│ Journey        Referral moments        Templates & FOCL               │
│ ───────                                                            │
│ ┌ milestone and dates ─────────────────┐ ┌ stage checklist ─────────┐ │
│ │ next action                           │ │ progress / save state     │ │
│ │ upcoming relationship moments         │ │ tasks for current stage   │ │
│ └───────────────────────────────────────┘ └──────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────┘
```

## Overview dashboard integration

The authenticated Home route is not a second visual world. It is the cross-wedding front door to Client Journey and uses the same Operate language.

Target composition:

```text
┌ existing sidebar ──────────────────────────────────────────────────────┐
│ Good morning, Kai                         New couple   All couples     │
│ 4 weddings · 1 needs attention · next wedding 1 June 2027             │
│                                                                       │
│ NEXT ACTIONS                                                          │
│ Couple name     Stage       Next action        Due       3/8          │
│                                             Open journey  Timeline    │
│ ───────────────────────────────────────────────────────────────────── │
│ Couple name     Stage       Next action        Due       5/8          │
│                                             Open journey  Timeline    │
└───────────────────────────────────────────────────────────────────────┘
```

Rules:

- Keep the editorial greeting but let the action list dominate the page.
- Use one quiet inline season summary, not three or four statistic cards.
- Sort rows by urgency; use calm textual labels for overdue/today/upcoming states.
- Couple name may use Cormorant; action, date, stage, and progress use Montserrat.
- **Open journey** is the visible primary action. **Timeline** is quieter but always available.
- Rows use whitespace and fine rules; they are not large rounded cards.
- Do not make the whole row a button when it contains separate Journey and Timeline actions.
- On mobile, stack row content and keep both actions visible without horizontal document scrolling.
- Empty state leads to **New couple**; loading and errors occupy the list region without moving the header.
- Remove the old tool-launcher card grid from Home once the sidebar/feature navigation is active.

## Visual system

Start from the existing tokens and adjust only where this surface needs a clearer product rhythm.

### Color roles

| Role       | Suggested value | Use                                     |
| ---------- | --------------- | --------------------------------------- |
| Warm paper | `#F6F4F1`       | Main working background                 |
| Canvas     | `#ECEAE6`       | App canvas and grouped regions          |
| Espresso   | `#1A1816`       | Primary text and primary actions        |
| Soft ink   | `#3A3733`       | Body text                               |
| Muted      | `#6B675F`       | Metadata and secondary labels           |
| Quiet line | `#D8D4CD`       | Dividers, input borders, timeline rules |
| Forest     | `#20251F`       | Photo overlay and rare strong state     |
| Moss       | `#5E5D50`       | Calm completion/planning accent         |
| Clay       | `#987760`       | Referral and personal-care accent       |

Validate all combinations against the existing contrast standards before merging. Accent colors must not carry status without text or icon support.

### Typography and spacing

- Display/couple name: Cormorant Garamond, responsive `clamp(2rem, 4vw, 3.5rem)`, line-height `0.98–1.05`.
- Section title: Cormorant Garamond, `1.75–2.25rem`, line-height about `1.08`.
- Body and controls: Montserrat, `1rem` minimum for primary copy, line-height `1.5–1.65`.
- Metadata: `0.75–0.875rem`; never use tiny text for actionable information.
- Put more space before a heading than after it. Keep related label/value pairs tighter than the space between groups.
- Limit explanatory text to roughly 45–75 characters per line.

### Geometry

- Outer working frames and selected-couple header: `12–16px` radius.
- Buttons and inputs: `8–10px` radius, minimum `44px` height.
- Timeline rows and internal panels: use fine rules, alignment, and at most `4–6px` radius.
- Avoid nested rounded rectangles. Prefer separators and whitespace inside a larger frame.
- Shadows should be rare and soft. Borders and tonal surfaces do most of the grouping.

### Photography

- Use one strong image per selected couple when available; otherwise use a restrained KACH fallback.
- Keep faces and important subjects clear of overlaid copy.
- Apply a controlled forest/espresso overlay only when needed for contrast.
- Do not place text over busy imagery without a readable solid or gradient-backed region.
- The interface must remain complete and elegant when no image exists.

## Interaction and motion

- Changes should feel immediate; use `150–220ms` transitions for tab, hover, disclosure, and completion states.
- Respect `prefers-reduced-motion`.
- Avoid page-load choreography, parallax, floating decorative motion, and animated counters.
- A completed checklist item may soften and show a clear check; do not remove it from context.
- Generated dates are visibly labelled **Calculated**; overrides are **Manual** and offer a nearby reset action.
- Save feedback must name the affected couple and distinguish timeline data from journey data when one part fails.

## Responsive behavior

- No document-level horizontal scrolling at any supported width.
- At `≤960px`, let the checklist lose its sticky position and move below the milestone list if needed.
- At `≤720px`, stack all working regions, make tabs horizontally scrollable only inside their own bounded rail, and keep actions in frame.
- Use `16px` body text and at least `44px` touch targets on mobile.
- Long couple names, locations, template names, and Norwegian translations must wrap without clipping controls.
- The selected-couple header becomes a compact information stack; photography remains secondary to the next action.

## Component guidance

### Use

- one primary action per state;
- inline status labels with meaningful text;
- a restrained sticky checklist on desktop;
- dividers and whitespace for hierarchy;
- progressive disclosure for templates and integration placeholders;
- a direct **Open in FOCL** link when a valid URL is stored.

### Avoid

- a grid of same-weight statistic cards;
- glassmorphism throughout the dashboard;
- excessive pill-shaped controls;
- oversized serif text competing with operational information;
- icons without labels for unfamiliar actions;
- duplicating FOCL or timeline data merely to fill the screen;
- visual states that depend only on clay, moss, or another color.

## Visual acceptance checklist

- The screen reads first as a calm working tool, then as a KACH-branded experience.
- The selected couple and next caring action are identifiable within five seconds.
- Cormorant is reserved for editorial hierarchy; Montserrat carries the operational UI.
- Title-to-body spacing is visibly larger than body-to-related-control spacing.
- Text does not collide with images, badges, tabs, or sticky controls.
- Every control remains in frame at 320px width and at 200% browser zoom.
- Empty, loading, dirty, saving, saved, conflict, and partial-failure states are designed.
- The page remains coherent with photography disabled or unavailable.
- The timeline and journey display the same canonical shared dates.
- The result feels inspired by GetFOCL's clarity without looking like a reskin of GetFOCL.
