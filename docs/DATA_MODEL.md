# Q Intelligence operational data model

Version: 1.0

## Model layers

Q Intelligence keeps the original deep `LeadProfile` research document intact and adds a separate operational record. This preserves rich evidence while allowing lifecycle state to change without rewriting historical research.

```text
lead_profiles
  └─ immutable-ish evidence-rich LeadProfile JSON
lead_operations
  ├─ lifecycle, qualification, opening, email readiness
  ├─ reply/follow-up/next action/assignment/notes
  └─ transparent LeadQualityScore JSON
outreach_actions
  └─ approved message versions and Instantly state
activity_events
  └─ human-readable lead timeline
audit_log
  └─ actor/action/outcome/resource history
research_batches
  └─ enforced 10-email-ready cycle progress
webhook_events
  └─ provider-event deduplication
sync_state
  └─ polling checkpoints and health
```

SQLite is the current durable store and uses WAL, foreign keys, and a busy timeout. The path is controlled by `Q_INTELLIGENCE_DB_PATH`. Existing verified research profiles seed the database only when absent; operational changes are never overwritten by a restart.

## Lead lifecycle

`researched → qualified → ready-for-outreach → contacted → follow-up-due/replied → interested/meeting-booked → closed`

Terminal or exception states are `not-interested`, `invalid-contact`, `disqualified`, and `closed`. Qualification is separately tracked as `pending-review`, `qualified`, or `disqualified`; lifecycle and qualification should not be conflated.

## Email model

The operational record separates:

- primary email value;
- provenance: official, inferred, third-party listed, unavailable;
- verification: verified, usable, unverified, invalid, unavailable;
- contact type: role-based, personal-business, general-business, unknown;
- last verification time.

Only verified or usable email qualifies as email-ready. Inferred email cannot be promoted automatically.

## Outreach action

Every action stores:

- stable idempotency key and request fingerprint;
- recipient and resolved sender;
- Instantly campaign ID/name and Instantly lead/email IDs;
- subject, exact body, version, personalization variables, and evidence IDs;
- approving actor and approval time;
- submitting, queued, sent, delivered, replied, bounced, failed, cancelled state;
- delivery/reply/follow-up state, reply date, latest response, next action;
- first confirmed send time/local date;
- normalized provider error code/message;
- created and updated time.

Queued is not equivalent to contacted. The first `email_sent` event sets the actual sender, `first_sent_at`, and local date used by the daily dashboard.

## Activity and audit

Activity events are lead-facing and merge into the relationship timeline. Audit entries are security/operations facing. Both store actor type and actor ID. Important events include creation, merge/update, qualification, lifecycle overrides, message approval, send attempts, delivery/reply updates, sync runs, errors, and meeting outcomes.

## Daily target calculation

The target defaults to 10 and is configured with `Q_INTELLIGENCE_DAILY_TARGET`.

`new businesses contacted today` is the count of distinct qualified leads whose outreach action received its first confirmed sent event on the current local date. Research rows and queued Instantly leads do not count. “Remaining” is `max(target - confirmed new businesses contacted, 0)`.

Research-cycle progress is independent: it counts newly added records in that batch whose qualification is `qualified` and email verification is `verified` or `usable`.

## Duplicate resolution

Write-time duplicate checks compare normalized business name, domain, email, phone, social URL, and name plus address. Strong matches update the canonical lead and append new sources/evidence. A name-only match returns a conflict until the caller supplies a stronger identity signal or a human resolves it.

## Score model

The lead-quality score is a versioned, 100-point record. Each factor stores its earned score, maximum, rationale, evidence IDs, and missing flag. Current version: `qmi-lead-quality-v1.0`.

Weights are documented in [RESEARCH_GUIDELINES.md](RESEARCH_GUIDELINES.md). Scores guide review and never authorize sending.
