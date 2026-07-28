# Q Intelligence operating workflow

## 1. Start a research cycle

Open Discover and start a cycle. Copy its batch ID into the human or agent research process. The cycle remains active until 10 newly added records are both qualified and email-ready.

## 2. Research and ingest

Follow [RESEARCH_GUIDELINES.md](RESEARCH_GUIDELINES.md). Human and agent submissions use the same schema and `POST /api/research/leads`. Q Intelligence validates structure and citations, checks sources, resolves duplicates, computes the score, records trace metadata, and stores either a qualified or pending-review record.

Strong businesses without email are retained and assigned an email-finding next action. They do not count toward the cycle minimum.

## 3. Review and qualify

Use the saved lead views to inspect new businesses, opening soon, recently opened, email availability, high priority, ready for outreach, contacted today, follow-up due, replies, meetings, disqualified leads, and date ranges.

Open a lead to inspect:

- business identity, location, opening state, score, email, qualification, outreach, reply, and next action;
- evidence-backed research and score explanations;
- contacts and public decision-maker context;
- website, social, local, competitor, and strategy observations;
- activity timeline and manual operating state.

Any lifecycle override requires a written reason and is placed in the audit log.

## 4. Prepare the message

Open Outreach Studio. Edit the subject and body. Verify the evidence attached to the draft and confirm that each personalized claim is accurate, current, relevant, and not generic. Non-email channel drafts remain copyable for manual use.

## 5. Approve Instantly delivery

For email, open the Instantly review. Q Intelligence loads only approved campaigns and eligible senders. Confirm the exact:

- campaign;
- sending account;
- recipient;
- subject;
- final body;
- evidence used.

Check the approval statement and submit. Nothing sends merely because the review was opened. An accepted provider record becomes queued. The dashboard counts it only when Instantly reports the first sent event.

## 6. Handle replies and follow-up

Webhook events update delivery, reply, positive/negative status, meeting state, actual sending account, latest response, and next action. Use Refresh activity when polling fallback is needed. Review the lead timeline before responding or changing its state.

Mark follow-ups complete with a reason. Do not count follow-ups as new-business contacts.

## 7. Read the dashboard

The dashboard separates:

- qualified leads added today;
- qualified email-ready leads added today;
- new qualified businesses actually contacted today;
- remaining contacts to reach 10;
- follow-ups, replies, positive replies, meetings, and errors.

The target is complete only when 10 distinct qualified businesses receive their first confirmed send on the local day.

## Roles

- `viewer`: read operating data.
- `researcher`: read and ingest/update research.
- `sender`: read, update lead workflow, refresh provider activity, and approve outreach.
- `admin`: all of the above plus integration/audit administration.
- internal research agent: bearer token scoped to controlled ingestion; cannot send.

Development localhost can operate as admin when auth mode is not required. Set `Q_INTELLIGENCE_AUTH_MODE=required` in every shared, staged, or production deployment.
