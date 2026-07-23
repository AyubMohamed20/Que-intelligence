# Que Media Intelligence

An evidence-first business intelligence and outreach preparation platform for Que Media. It is designed to discover and research a small number of high-fit Ottawa businesses, explain why each one is worth attention, and prepare client-ready strategy and manual outreach assets after approved integrations are connected.

The application intentionally has no outreach sending capability.

## Local development

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js. It uses `http://localhost:3000` when that port is free.

## Validation

```bash
npm run typecheck
npm run verify:leads
npm run prepare:lead-index
npm run download:logos
QUE_MEDIA_BASE_URL=http://localhost:3000 npm run verify:runtime
```

`verify:runtime` expects a running development server. The lead-index generator reads the verification audit and refuses to publish a stale, incomplete, duplicated, current-client-matching, or non-ready cohort.

`download:logos` refreshes local business-logo assets from each lead's official website and records the source URL in `research/business-logos.json`. The interface uses the downloaded file first and retains the generated initials as a resilient fallback.

## Current implementation

The repository includes a polished, responsive intelligence workspace plus a point-in-time cohort of 21 real Ottawa-market businesses researched on 2026-07-20 and extended on 2026-07-22. Twenty are in Ottawa and one, Stonefields Estate, serves the nearby market from Beckwith. Every loaded profile passed the current schema, duplicate, website reachability, public contact, social-route, and source-count gates. Each profile includes explainable Que Media fit, opportunity, and response scores; cited observations; public business contact routes; verified socials; Why Now status; website surface checks; local competitor references; personalized video concepts; objection preparation; client-ready reports; and channel-specific manual outreach drafts.

No demo, seed, or fallback prospect data is included. Runtime profiles are built from the structured research files in `research/` and the generated verification audit. Missing metrics remain unavailable instead of becoming zero. Live recurring discovery, crawling, enrichment, and owner-authorized analytics still require the approved adapters, credentials, durable storage, and workers described in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Product research and source choices are documented in [docs/RESEARCH.md](docs/RESEARCH.md). The recent-public-signal adapter contract is documented in [docs/LAST30DAYS_INTEGRATION.md](docs/LAST30DAYS_INTEGRATION.md). The validation record is in [docs/QA.md](docs/QA.md).

The `last30days` Codex skill is installed locally and was used for a point-in-time Ottawa freshness pass. Its raw cited artifact is retained under `research/last30days/`. The application still has no recurring `last30days` connector, credentialed worker, or schedule, so the UI does not claim continuous monitoring.

All outreach stays manual. Agents produce drafts and evidence packages only.

## Read-only API

- `GET /api/leads`
- `GET /api/leads/:id`
- `GET /api/agents`

There is no send, campaign, sequence, mailbox, or social publishing endpoint.

The current read API returns the verified 21-business research cohort. Unknown identifiers return not found and never receive a fallback record.

## Research artifacts

- `research/hospitality-leads.json` and `.md`: 8 hospitality and experience businesses.
- `research/wellness-leads.json` and `.md`: 7 wellness and specialty-service businesses.
- `research/visual-service-leads.json` and `.md`: 6 visual and high-value service businesses.
- `research/verified-leads-audit.json`: reproducible verification output for all 21 records.
- `research/last30days/`: raw 30-day Ottawa freshness research output and source-status limits.
