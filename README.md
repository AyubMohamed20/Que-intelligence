# Q Intelligence

Q Intelligence is Q Media’s evidence-first operating system for targeted Ottawa client acquisition. It keeps research, qualification, public contacts, transparent scoring, personalized drafts, human-approved Instantly outreach, replies, next actions, and the daily target in one place.

The application ships with a verified 22-business Ottawa-market research snapshot and a persistent operational layer. Existing evidence-rich profiles are preserved; new human or agent research enters through the same controlled schema and duplicate/quality gates.

## Local development

Requirements: Node.js 24+ (the operational store uses the built-in `node:sqlite` module).

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open the URL reported by Next.js, normally `http://localhost:3000`.

The database defaults to `data/q-intelligence.sqlite` and is ignored by Git. On trusted localhost, development falls back to an admin actor unless `Q_INTELLIGENCE_AUTH_MODE=required`. Shared or production environments must configure explicit auth tokens and a session secret.

## Secure Instantly setup

Create an Instantly API v2 key and place it in `.env.local` or the deployment secret manager:

```dotenv
INSTANTLY_API_KEY=
INSTANTLY_APPROVED_SENDER_ACCOUNTS=sender@example.com
INSTANTLY_APPROVED_CAMPAIGN_IDS=campaign-uuid
INSTANTLY_MIN_WARMUP_SCORE=75
INSTANTLY_WEBHOOK_SECRET=
```

Never use `NEXT_PUBLIC_` for these values. Q Intelligence reads the API key only in server modules and never returns it to the browser.

To keep an existing key in an external dotenv file, leave `INSTANTLY_API_KEY` empty and configure `INSTANTLY_API_KEY_FILE` plus `INSTANTLY_API_KEY_FILE_VARIABLE`. The external file remains outside the repository.

Each approved Instantly campaign must be active, use exactly one approved healthy/warmed sending account, and have an active email variant with `{{qm_subject}}` in the subject and `{{qm_body}}` in the body. See [Instantly integration](docs/INSTANTLY_INTEGRATION.md) for webhook setup, endpoints, rate limits, and limitations.

## Daily workflow

1. Start a research cycle in Discover.
2. Research Ottawa-area commercial businesses using [the research guidelines](docs/RESEARCH_GUIDELINES.md).
3. Add human/agent records through `POST /api/research/leads`.
4. Continue until the active batch contains at least 10 newly qualified leads with verified or usable email.
5. Review a lead’s evidence, score, contacts, and message.
6. Confirm the exact Instantly campaign, sender, recipient, subject, body, and evidence.
7. Approve submission. Queued leads do not count as contacted.
8. Instantly webhook/polling events update sent, reply, meeting, error, and next-action state.
9. The dashboard marks the goal complete only after 10 distinct qualified businesses receive their first confirmed `email_sent` event that local day.

See [Operating workflow](docs/OPERATING_WORKFLOW.md) for roles and full operating detail.

## APIs

Read:

- `GET /api/dashboard`
- `GET /api/leads`
- `GET /api/leads/:id`
- `GET /api/leads/:id/outreach`
- `GET /api/research/batches`
- `GET /api/instantly/options` (authorized sender/admin)
- `GET /api/audit` (authorized admin)

Write:

- `PATCH /api/leads/:id`
- `POST /api/research/batches`
- `POST /api/research/batches/:id/complete`
- `POST /api/research/leads`
- `POST /api/leads/:id/outreach` with `Idempotency-Key`
- `POST /api/instantly/sync`
- `POST /api/instantly/webhook`
- `POST /api/auth/login`
- `POST /api/auth/logout`

Structured research uses [the JSON Schema](docs/schemas/research-lead.schema.json) and [example record](docs/schemas/research-lead.example.json). AI agents cannot bypass validation, evidence reachability, duplicate resolution, scoring, qualification, or batch rules.

## Validation

```bash
npm run typecheck
npm run verify:leads
npm run prepare:lead-index
npm run build
```

With the app running:

```bash
$env:QUE_MEDIA_BASE_URL="http://localhost:3000"
npm run verify:runtime
```

`npm run verify:operations` is intended for an isolated production-mode test
server configured with a temporary database, session secret, and admin token;
see [the QA record](docs/QA.md).

## Documentation

- [Pre-upgrade audit](docs/CURRENT_APPLICATION_AUDIT.md)
- [Research guidelines](docs/RESEARCH_GUIDELINES.md)
- [Data model and calculations](docs/DATA_MODEL.md)
- [Instantly integration and secure setup](docs/INSTANTLY_INTEGRATION.md)
- [Operating workflow and roles](docs/OPERATING_WORKFLOW.md)
- [Architecture](docs/ARCHITECTURE.md)
- [QA](docs/QA.md)

The original source cohort remains in `research/`, including the verification audit and cited last-30-days research artifact. Missing information remains unavailable instead of becoming invented data or a zero metric.
