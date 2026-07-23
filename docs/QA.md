# Quality Assurance Record

Last updated: 2026-07-22

## Automated validation

- `npm run typecheck`: passed with TypeScript strict mode and no emitted files.
- `npm run verify:leads`: passed with 21 records, 21 outreach-ready packages, 0 validation errors, 21 reachable company websites, 0 duplicate IDs, 0 duplicate company URLs, 0 social URLs reused across businesses, and 0 current-client matches.
- `npm run prepare:lead-index`: produced the 21-lead index only after joining every record to the fresh verification audit. The generator now stops on stale inputs or any failed readiness gate.
- `npm run build`: passed TypeScript validation and generated all 54 static pages, including 21 company profiles and 21 client reports.
- `QUE_MEDIA_BASE_URL=http://localhost:3001 npm run verify:runtime`: passed 63 valid API, company, and report endpoint checks plus 3 invalid-route checks with 0 failures. The suite also rejects embedded server-render errors and verifies the snapshot/manual-outreach API boundary.
- The Impeccable static detector returned no interface anti-pattern findings after unused side-tab CSS was removed.
- Real-data integrity: runtime profiles are derived only from the three cited research datasets and the verification audit. No demo company, placeholder observation, fallback score, simulated activity, or fake connector result ships with the application.
- Duplicate integrity: the final cohort contains 21 unique IDs and company websites with no repeated social URL across businesses.
- Evidence boundary: the interface never creates fallback claims or source links when no verified records are available. An observation is marked verified only when at least one linked persisted source passed the accessibility check.
- API boundary: only `GET` routes exist under `app/api`.
- Outreach boundary: no mail provider, social publishing token, mutation route, automatic send action, campaign sender, or sequence engine exists. Public `mailto:` and `tel:` links only open a human-controlled local client.

## Accessibility review

The source-level review covered WCAG 2.2 AA patterns across the application shell, company tabs, channel tabs, dialogs, disclosures, filters, tables, forms, loading states, report viewer, and responsive layouts. Live Playwright DOM checks covered every primary route at 390 by 844, and the dashboard, company library, a full company profile, a full report, and settings at 320 by 760. Desktop interaction checks ran at 1440 by 900.

Verified outcomes:

- Skip link, landmarks, page headings, and route status states are present.
- Keyboard focus is visible and immediate.
- Modal navigation makes background content inert, closes on Escape, returns focus, and resolves viewport changes safely.
- Tab systems use roving focus, keyboard navigation, resolved ID references, and persistent panels for user-edited state.
- Filter and search changes announce result counts through polite live regions.
- Async review, copy, connector, note, and settings outcomes provide status feedback.
- Status, confidence, comparison winners, freshness, and evidence are not conveyed by color alone.
- Scrollable comparison and data regions are labeled and keyboard-focusable.
- Native tables include captions and scoped headers. Grid tables expose table semantics.
- Touch targets for core controls meet the 44px target.
- Reduced motion removes movement selectively while preserving useful loading feedback.
- Print output removes application chrome and preserves source records without narrow-layout clipping.

The managed AccessLint Chrome process could not expose its CDP endpoint on port 9222 after two clean launch attempts. The fallback review therefore used live Playwright DOM inspection, keyboard interaction tests, clean browser-console checks, the current Vercel Web Interface Guidelines, and source-level WCAG review. AccessLint's rule engine itself was not claimed as passed. Accessibility diffing was not applicable because this workspace has no Git repository or baseline branch.

## Contrast checks

Representative foreground/background pairs meet WCAG AA:

| Pair | Ratio |
| --- | ---: |
| Ink navy on paper | 16.56:1 |
| Graphite on paper | 14.63:1 |
| Muted ink on paper | 7.15:1 |
| Muted ink on warm canvas | 6.75:1 |
| Cobalt on paper | 5.54:1 |
| Success on success background | 6.18:1 |
| Warning on warning background | 4.59:1 |
| Danger on danger background | 5.44:1 |

## Responsive and interaction coverage

- Desktop sidebar, compact drawer, mobile top bar, and mobile bottom navigation.
- 320px narrow layout safeguards for report actions and horizontal data comparisons, verified without page-level horizontal scrolling.
- Desktop transition after an open compact drawer clears inertness and body scroll lock.
- Settings persist through `sessionStorage` and disclose a truthful current-view fallback when storage is unavailable.
- Lead and report views render the verified cohort. Source and research-operation views still disclose that no recurring connector or worker is configured.
- Evidence drawers render only persisted evidence records and return focus to their trigger when closed.

## Test boundary

The completed review used TypeScript validation, a production Next build, real-data invariants, fresh public-source verification, 66 endpoint assertions, live DOM and keyboard inspection, clean console checks, and static WCAG review. Production connector integrations still require their authorized credentials, durable storage, policies, and workers before recurring research can be accepted. The current 21-business Ottawa-market cohort is a dated research snapshot, not evidence of a continuously running monitor.
