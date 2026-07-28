# Q Intelligence pre-upgrade audit

Audit date: 2026-07-28

This audit was completed before implementation changes. It records what existed, what was preserved, and which gaps motivated the operational upgrade.

## Existing application

The original application was a polished Next.js 16 and React 19 evidence-first research workspace. It deterministically assembled a dated lead snapshot from three structured research files and a generated verification audit. It exposed read-only lead and agent endpoints and intentionally had no durable operational storage or sending capability.

The audited snapshot contained:

- 22 Ottawa-market lead profiles;
- 117 direct sources and 75 research observations;
- 20 leads with public business email addresses;
- 19 leads with public phone numbers;
- 20 leads with identified public decision makers;
- 17 leads with an explicit time-sensitive “Why now” signal;
- two strong leads without an email: Sukkar House and Anatomy Physiotherapy Clinic.

## Strong parts preserved

- Deep lead profiles with official identity, location, source, evidence, observation, decision-maker, website, local SEO, social, competitor, recommendation, objection, and outreach-draft structures.
- Evidence drawers that show the source behind a consequential claim.
- Explicit confidence and freshness fields instead of invented precision.
- Separate Que Media fit, opportunity, and response scorecards with visible factor rationales.
- High-quality responsive, keyboard-accessible company and report interfaces.
- Local business logos with resilient initials fallbacks.
- Existing validation scripts and refusal to synthesize fallback prospects.
- The rule that a human owns the relationship and reviews the final message.

## Data and workflow gaps found

- The runtime lead model was an immutable snapshot; status changes could not persist.
- There was no database for lifecycle state, outreach actions, replies, activity, batches, or audit events.
- Duplicate checking covered generated IDs, company URLs, and social URLs during snapshot generation, but did not cover the complete required identity set at write time.
- Outreach drafts had an editable body and copy action, but their subject was read-only and there was no provider integration or approval record.
- Research status and the existing relationship timeline were descriptive rather than a complete lead lifecycle.
- Filters were limited to search, priority, and sort; they did not expose email readiness, opening state, contact state, reply state, due follow-up, or saved operating views.
- Settings were held in browser `sessionStorage`; there was no role enforcement, durable configuration, or server-side secret boundary.
- The dashboard described researched opportunities but did not calculate a daily goal from confirmed outreach events.
- No API accepted structured human or agent research batches.
- No campaign, sending account, delivery, reply, webhook, polling, idempotency, or provider-error data existed.
- Existing product documentation explicitly described the application as not being a CRM or sender. That historical boundary has been superseded by the approved, human-reviewed operating workflow in this upgrade.

## Existing verification behavior

A lead needed a name, ID, industry, location, website, at least one social route, at least three observations, at least two sources, valid source dates and scores, and a complete outreach draft. The verification audit checked websites, contact routes, social URLs, and sources. A generated “outreach ready” flag also required a website, a public contact, a social route, and at least two reachable public surfaces.

Those gates remain valuable, but they were extended with:

- persistent lifecycle and qualification state;
- evidence URL checks on ingestion;
- at least three cited observations and two source records;
- an official reachable source for qualification;
- email provenance and verification semantics;
- name, domain, social, phone, address, and email duplicate checks;
- a transparent 100-point lead-quality score;
- a research-cycle completion gate of 10 newly added qualified email-ready leads.

## Upgrade boundary

The upgrade preserves the original research depth and evidence-led interface. It adds an operational SQLite store, authenticated write routes, structured research ingestion, full lead activity, idempotent Instantly submission, webhook/polling synchronization, daily-goal reporting, and manual lifecycle controls. Research agents still cannot silently send: outreach requires an authorized human to inspect and confirm the final campaign, sender, recipient, subject, body, and evidence.
