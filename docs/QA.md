# Q Intelligence quality assurance record

Last updated: 2026-07-28

## Automated validation

The operational upgrade passed:

- `npm run typecheck`;
- `npm run verify:leads`: 22 records, 22 existing research packages ready, 22 reachable official surfaces, and zero schema, duplicate-ID, company-URL, social-URL, or excluded-client failures;
- `npm run prepare:lead-index`: regenerated the verified 22-lead manual research index;
- `npm run build`: Next.js production compilation, TypeScript, page-data collection, and all dynamic route registrations;
- `npm run verify:runtime`: 67 valid lead/API/page checks, three invalid-route checks, operational metadata, dashboard calculation, semantic not-found/noindex boundaries, and zero failures;
- `npm run verify:operations`: nine authenticated production-mode checks and zero failures.

The operational test used a clean isolated SQLite path and temporary admin/session secrets. It verified:

- a clean daily dashboard begins at 0/10 confirmed contacts, even though the historical cohort contains 20 email-ready leads;
- the remaining-target formula is consistent;
- an absent Instantly key returns safe `not-configured` metadata and no credential-shaped response field;
- an active research batch begins at zero;
- batch completion is blocked with HTTP 409 until 10 qualified email-ready records are added;
- invalid agent research returns HTTP 422 with field-path issues;
- a manual lifecycle change without a reason is rejected;
- an outreach submission without a stable idempotency key is rejected;
- an unauthenticated webhook is rejected;
- an authorized administrator can read persisted audit events.

## Visual and responsive review

Live Chrome screenshots were reviewed at:

- dashboard: 1440 × 1200;
- lead operating table: 1440 × 1000;
- lead profile and operating strip: 1440 × 1200;
- Outreach Studio and Instantly approval boundary: 1440 × 1400;
- Discover/research-cycle gate: 1440 × 1100;
- dashboard mobile reflow: 390 × 844.

The review confirmed:

- research and contacted counts are visually separate;
- the 0/10 target and exact counting rule are prominent;
- all required lead table states have readable labelled columns and horizontal fallback;
- opening, score, email, qualification, outreach, reply, and next action are visible before deep research;
- the final email subject and body are editable;
- the Instantly action is visually separate from draft editing and states that opening review does not contact the lead;
- no secret or API key appears in any interface or screenshot;
- the research cycle explains that email-missing leads are retained while 10 email-ready leads are still required;
- desktop navigation and mobile bottom navigation remain usable.

## Accessibility safeguards reviewed

- semantic headings, landmarks, tables, captions, labels, progress bars, status regions, and buttons;
- keyboard-operable company and channel tabs with roving focus;
- visible focus styles and non-colour status labels;
- labelled horizontally scrollable data regions;
- 44px-oriented primary touch controls;
- reduced-motion behavior for loading indicators;
- screen-reader status output for save, copy, send, sync, research-cycle, and authentication actions;
- explicit checkbox approval immediately before Instantly submission.

## Provider test boundary

No real Instantly API key was available or required for local validation, and no prospect was contacted. The tested server deliberately used the safe unconfigured state. Account/campaign mapping, exact workspace payload variants, real `email_sent`/reply webhook fixtures, and deliverability outcomes require an authorized Q Media Instantly workspace.

The integration client, eligibility rules, request shapes, rate-limit behavior, webhook header, polling cap, idempotency record, and provider failure preservation were validated statically and through local failure-path tests. Run a controlled internal-address campaign before approving production prospect outreach.

## Current known limits

- SQLite is a single-workspace durable store; move to PostgreSQL before horizontal multi-instance deployment.
- Continuous research discovery needs a scheduler/worker; the controlled ingestion API is ready, but the application does not invent live agent runs.
- Polling is a fallback and is intentionally capped because Instantly’s email-list endpoint has a low rate limit.
- Next.js streamed `notFound()` pages can commit HTTP 200 before the not-found boundary resolves. Q Intelligence emits the semantic 404 boundary and `noindex`; the lead API returns a true HTTP 404.
- Existing research profiles include a dated public-source cohort. A fresh research cycle should recheck volatile launch/contact facts before outreach.
