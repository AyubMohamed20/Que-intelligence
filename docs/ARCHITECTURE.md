# Q Intelligence architecture

Updated: 2026-07-28

## Current system

Q Intelligence is a Next.js 16/React 19 application with two complementary data layers:

1. Evidence-rich `LeadProfile` documents preserve the strongest part of the original research application.
2. A persistent SQLite operating store tracks mutable lifecycle, qualification, email readiness, outreach, replies, activities, batches, audit events, webhook deduplication, and sync state.

The application seeds the original verified 22-business cohort only when a profile is absent. Restarting never overwrites operational changes.

```text
Human/agent research
        │
        ▼
Structured ingestion API ── validation/source checks/dedupe/scoring
        │
        ▼
Lead profile + operations + activity + audit
        │
        ▼
Human review/edit/approval
        │
        ▼
Server-only Instantly v2 client
        │
        ├── webhook events ──► delivery/reply/meeting/next action
        └── polling fallback ─► partial synchronization
```

## Server boundaries

All database, auth, scoring, ingestion, provider, submission, and synchronization modules import `server-only`. React client components call internal API routes and never receive the Instantly key, workspace token configuration, webhook secret, or raw provider authorization headers.

`lib/server/auth.ts` implements:

- HMAC-signed, HTTP-only, SameSite Strict workspace sessions;
- admin, sender, researcher, viewer, and internal-agent permissions;
- CSRF origin checks for session-authenticated writes;
- bearer authentication for controlled research agents;
- fail-closed production behavior when required configuration is absent;
- trusted-localhost development fallback only when auth mode is not required.

## Persistence

`lib/server/database.ts` uses Node’s built-in SQLite driver with WAL, foreign keys, and a busy timeout. Current tables are documented in [DATA_MODEL.md](DATA_MODEL.md).

SQLite is appropriate for the current single-workspace deployment. A horizontally scaled deployment should migrate the same logical model to PostgreSQL, use a shared queue/scheduler, and place credentials in the platform secret manager. Provider webhooks must reach one consistent durable store.

## Research ingestion

`POST /api/research/leads` accepts schema version 1.0. It:

1. validates required fields, enums, dates, URLs, citations, scores, and trace identity;
2. checks up to 20 submitted sources with bounded concurrency;
3. refuses excluded non-commercial categories;
4. calculates the versioned 100-point lead score;
5. detects duplicate name/domain/email/phone/social/address signals;
6. creates a record or merges new evidence into a canonical strong match;
7. assigns qualified/pending-review and email-ready state;
8. writes activity and audit events;
9. attributes a new record to its research batch.

Name-only ambiguity returns a conflict. New evidence strengthens an existing lead rather than creating a duplicate.

The central human/agent standard is [RESEARCH_GUIDELINES.md](RESEARCH_GUIDELINES.md); the machine contract is [schemas/research-lead.schema.json](schemas/research-lead.schema.json).

## Outreach submission

The browser edits the draft, but the server revalidates the full submission:

- actor permission;
- qualified state and usable email;
- recipient is a stored public lead email;
- subject/body/evidence requirements;
- explicit human confirmation;
- idempotency key and duplicate fingerprint;
- current campaign and sender eligibility.

The local action is reserved before the provider call. A successful Instantly lead addition is queued. Only an `email_sent` event marks contact and contributes to the daily goal.

Campaigns with multiple sending accounts are rejected because Instantly does not guarantee a per-lead sender from a pool. The required campaign template passes exact reviewed copy via `{{qm_subject}}` and `{{qm_body}}`.

See [INSTANTLY_INTEGRATION.md](INSTANTLY_INTEGRATION.md).

## Synchronization

Webhook events are protected by a custom shared header, hashed for idempotency, normalized, and attached to the local action/lead. Supported normalized outcomes include sent, bounce, reply, automatic reply, interested, not interested, meeting booked, closed, wrong person, unsubscribe, and account error.

The email-list endpoint is a manual/scheduled fallback with a strict per-call cap because Instantly documents a much lower limit for that endpoint. A partial or failed sync never deletes local history.

## Daily calculations

The dashboard uses `Q_INTELLIGENCE_TIMEZONE`, default `America/Toronto`. Metrics are derived from persisted events rather than UI state.

- Research-cycle completion: at least 10 newly added qualified leads with verified/usable email.
- Daily outreach completion: at least 10 distinct qualified leads whose first confirmed send occurred on the local date.
- Queued leads and researched records are excluded from actual contacts.
- Replies, positive replies, meetings, follow-ups, and errors are separate event counts.

## Failure behavior

- Invalid research returns field-path issues without a partial record.
- Ambiguous duplicates return conflict.
- Source failure lowers qualification/readiness and creates warnings.
- Instantly not configured returns a safe status without a secret.
- Account/campaign health failure blocks submission.
- Idempotency replays the original action; an identical active action is blocked.
- Provider/network failure preserves the failed local action and error.
- Duplicate webhook delivery is ignored.
- Manual overrides require a reason and audit entry.

## Future deployment work

- Migrate SQLite to PostgreSQL before multi-instance horizontal scale.
- Add a production scheduler/queue for continuous discovery and polling fallback.
- Add central secret rotation and operator-facing integration configuration if environment-managed configuration is no longer sufficient.
- Add correction/deletion workflows and formal retention policy before storing materially more personal business-contact data.
- Expand provider-event fixtures and end-to-end tests as real Instantly workspace payloads become available.
