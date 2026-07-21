# Que Media Intelligence Design System

Updated: 2026-07-20
Source of truth: `DESIGN.md`, `docs/DESIGN_DECISIONS.md`, and the implemented tokens in `app/globals.css`.

## Product character

Que Media Intelligence is an evidence-first research workspace, not a CRM. It should feel calm, premium, editorial, and trustworthy under dense information. The visual language uses warm paper surfaces, ink navy structure, restrained cobalt interaction color, and humanist serif accents.

Core principles:

- Research before reach.
- Scores always explain their evidence and uncertainty.
- Manual outreach only. The interface may draft and copy, never send.
- Use cards for distinct actionable objects. Use open canvas, rules, tables, and split panes for the broader information architecture.
- Avoid decorative dashboard clutter, equal card grids, gradients, glass effects, and oversized hero metrics.

## Color tokens

| Token | Value | Role |
| --- | --- | --- |
| `--ink-navy` | `oklch(0.25 0.13 272)` | Editorial headings, dark surfaces, structure |
| `--cobalt` | `oklch(0.55 0.27 267)` | Primary actions, focus, active punctuation |
| `--charcoal` | `oklch(0.20 0.01 320)` | Primary text |
| `--graphite` | `oklch(0.28 0.01 300)` | Secondary text and controls |
| `--muted-ink` | `oklch(0.46 0.02 280)` | Metadata and helper copy |
| `--warm-canvas` | `oklch(0.98 0.006 75)` | Application canvas |
| `--paper` | `oklch(1 0 0)` | Elevated surfaces |
| `--cream-border` | `oklch(0.94 0.019 72)` | Warm rules and borders |
| `--lavender` | `oklch(0.94 0.03 276)` | Quiet selected and evidence states |
| `--success`, `--warning`, `--danger` | Semantic OKLCH pairs | Status, always paired with text or icons |

Cobalt is reserved for the primary action, focus, active navigation, and the most important visual signal in a region. Status is never communicated by color alone.

## Typography

- Inter is the workhorse for body copy, labels, controls, tables, and data.
- Newsreader italic is a restrained editorial accent inside selected display headings.
- Main titles use `--text-title: 2.25rem`, weight 560, tight tracking, and balanced wrapping.
- Body copy generally uses 0.875rem to 1rem with 1.5 to 1.65 line height.
- Labels and metadata remain sentence case unless they are short eyebrow labels.
- No generated enthusiasm, generic compliments, or AI-style filler in product copy.

## Spacing and shape

Spacing follows a 4px and 8px rhythm:

| Token | Value |
| --- | --- |
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 24px |
| `--space-6` | 32px |
| `--space-7` | 48px |
| `--space-8` | 64px |

- Small radius: 8px.
- Standard controls: 12px.
- Major surfaces: 16px.
- Buttons and compact badges: pill radius.
- Interactive targets are at least 44px on each axis where practical.
- Shadows are used only for overlays and floating disclosure, not routine cards.

## Layout system

- Desktop uses a persistent 248px sidebar and a content width capped at 1560px.
- Tablet uses a modal navigation drawer and simplifies grids without hiding essential metadata.
- Mobile starts at 320px, preserves essential capability and data-availability notices, and uses four primary bottom-navigation destinations.
- Wide data comparisons scroll within labeled, keyboard-focusable regions.
- Client reports remove application chrome in print, expand overflow, and retain evidence/source labels.

## Components

### Buttons

- Primary: cobalt fill, paper text, pill shape.
- Secondary: paper fill, warm border, graphite text.
- Ghost: transparent with ink or graphite text.
- Press uses `transform` for 150ms and releases in 90ms. Compact controls scale no further than 0.97.
- Hover styles only apply under `@media (hover: hover) and (pointer: fine)`.
- Keyboard focus appears immediately with a 2px cobalt outline and 3px offset.

### Surfaces

- `.surface` is paper with a 1px cream border and 16px radius.
- `.surface--ink` is reserved for decision briefs, timing windows, and other editorial anchors.
- Do not turn every section into a card. Ruled groups and open sections are preferred for related data.

### Status and scores

- Status badges combine icon, label, and semantic color.
- Score rings and bars include an accessible numeric label, qualitative summary, rationale, and evidence path.
- Unknown or inaccessible data is shown as unavailable, never silently converted to zero.

### Evidence

- Any consequential claim exposes an evidence drawer.
- Evidence includes claim, detail, confidence, freshness, verification state, and source records.
- Only verified, persisted source records may appear. Missing evidence uses an explicit empty state and never produces a placeholder link.

### Tabs and disclosure

- Tabs follow roving `tabIndex`, arrow keys, Home, End, `aria-controls`, and labeled tab panels.
- Tab content remains mounted when it contains user edits so drafts and notes survive navigation.
- Drawers and dialogs return focus to their trigger when closed.

### Tables and charts

- Native tables include captions and scoped column headers.
- CSS grids that represent tables use table, row, header, and cell roles.
- Scrollable tables receive a descriptive label and keyboard focus.
- Charts use simple SVG or CSS geometry with textual summaries. Visualization never replaces the explanation.

## Motion

- Keyboard-triggered state changes are immediate.
- Hover color feedback is 150ms to 160ms and capability-gated.
- Press is approximately 150ms; release is approximately 90ms.
- Navigation drawer movement is 220ms using transform. Scrims use opacity.
- Loading spinners use transform by default and an opacity pulse under reduced motion.
- Skeleton loading uses a gentle opacity pulse.
- Do not use `transition: all`, page-load choreography, continuous decorative motion, or animated focus rings.

## Accessibility and content rules

- WCAG AA contrast is the minimum.
- Every input has an explicit label, name, and visible focus state.
- Filtered result counts and asynchronous outcomes use polite live regions.
- Hidden responsive content must not remove essential status, confidence, freshness, or decision context.
- Icon-only controls have accessible names.
- Success notices that disappear return focus to a stable trigger.
- The persistent capability boundary must say that outreach is manual and no send action exists.
- Empty states must never use fabricated companies, observations, metrics, timelines, reports, or activity to make a view appear populated.

## Product signatures

1. Evidence drawer for every meaningful score or recommendation.
2. Why Now rail with time-bounded, evidence-supported triggers.
3. Que Media Content Fit score built around filmability, staff participation, education potential, repeat visits, and local storytelling.
4. Content DNA that explains formats, hooks, production choices, and missing opportunities.
5. Client-ready audit report with print-safe source register.
6. Outreach studio that drafts, edits, and copies but cannot contact a prospect.
