# Instantly API v2 integration

Reviewed: 2026-07-28

Q Intelligence uses Instantly API v2 only. API v1 was deprecated on January 19, 2026. The implementation follows the current official [Instantly API v2 documentation](https://developer.instantly.ai/).

## Security

- `INSTANTLY_API_KEY` is read only in `server-only` modules. Alternatively, `INSTANTLY_API_KEY_FILE` can point to an external dotenv file and `INSTANTLY_API_KEY_FILE_VARIABLE` can select the credential in that file.
- Authentication uses `Authorization: Bearer <key>`.
- The key is never exposed through a `NEXT_PUBLIC_` variable, React prop, browser storage, API response, application log, screenshot, or committed source.
- The settings and outreach interfaces receive safe eligibility metadata only.
- Integration configuration and sending require authorized workspace roles.
- Provider errors are normalized before storage; arbitrary provider responses are not logged.

## Endpoints used

- `GET /api/v2/accounts` to inspect account state, warmup state/score, setup state, and health.
- `GET /api/v2/campaigns` to inspect campaign state, sender pool, limits, and stop-on-reply behavior.
- `POST /api/v2/leads` to add the approved lead and personalization variables to one eligible campaign.
- `GET /api/v2/emails` as a rate-limited polling fallback for send, delivery/thread, and reply state.
- Instantly webhooks for provider events when configured.

Official references: [accounts](https://developer.instantly.ai/api-reference/account/list-account), [campaigns](https://developer.instantly.ai/api-reference/campaign/list-campaign), [create lead](https://developer.instantly.ai/api-reference/lead/create-lead), [emails](https://developer.instantly.ai/api-reference/email/list-email), [webhooks](https://developer.instantly.ai/api-reference/groups/webhook), [webhook events](https://developer.instantly.ai/guides/webhook-events), and [rate limits](https://developer.instantly.ai/getting-started/rate-limit).

## Rate limits

Instantly documents a general workspace limit of 100 requests/second and 6,000 requests/minute. The emails endpoint is limited to 20 requests/minute and test endpoints to 10 requests/minute. Q Intelligence retries HTTP 429 and transient 5xx responses with bounded backoff. Manual polling checks no more than 10 local outreach actions per request.

## Eligibility rules

An account is selectable only when all of these hold:

- its email is in `INSTANTLY_APPROVED_SENDER_ACCOUNTS`;
- Instantly account status is active (`1`);
- setup is not pending;
- warmup status is active (`1`);
- warmup score meets `INSTANTLY_MIN_WARMUP_SCORE`, default 75;
- no account health/status message indicates an error.

A campaign is selectable only when:

- its ID is in `INSTANTLY_APPROVED_CAMPAIGN_IDS`;
- campaign status is active (`1`) and not unhealthy, suspended, paused, or complete;
- it has no blocking `not_sending_status`;
- it contains exactly one sender account;
- that sender passes the account eligibility rules;
- an active email variant uses `{{qm_subject}}` as the subject and `{{qm_body}}` as the body.

Instantly campaigns can normally rotate through a sender pool. The API does not guarantee a specific sender for an individual lead when multiple accounts are attached. Q Intelligence therefore refuses campaigns with more than one account. This makes the sender displayed during approval the sender expected to be used, and the actual `email_account` reported by the send event is still persisted.

## Human-approved submission

The local workflow validates:

- qualified lead state;
- verified or usable email;
- recipient matches an email already stored on the lead;
- campaign and sender remain eligible immediately before submission;
- non-empty subject and a 40–10,000 character body;
- no unresolved placeholders;
- at least one valid personalization evidence ID;
- explicit confirmation;
- an authorized sender role;
- a stable `Idempotency-Key`.

Q Intelligence calls `POST /api/v2/leads` with `skip_if_in_campaign`, verification on import, and custom variables containing the approved subject/body and trace identifiers. The local action is reserved before the network call. Repeated clicks with the same key replay the original result, while an identical active submission within 30 days is blocked.

An accepted lead is `queued`, not `contacted`. Contact is recorded only from an Instantly `email_sent` event.

## Webhooks and polling

Configure an Instantly webhook for supported events such as email sent, reply received, bounced, interested, meeting booked, not interested, unsubscribed, wrong person, and account errors. Point it to:

`POST https://<q-intelligence-host>/api/instantly/webhook`

Add the custom header:

`x-q-intelligence-webhook-secret: <INSTANTLY_WEBHOOK_SECRET>`

Instantly supports custom webhook headers. Q Intelligence performs constant-time comparison against the server environment secret, hashes provider events for deduplication, and stores no secret with the event.

If webhooks cannot be configured, an authorized user can run `POST /api/instantly/sync` or use “Refresh activity.” A scheduler may call the same authenticated route. Polling is deliberately conservative because `/emails` has a much lower rate limit. Webhooks are preferred for timely reply state.

## Environment variables

```dotenv
INSTANTLY_API_KEY=
# Or keep the key in an external dotenv file:
INSTANTLY_API_KEY_FILE=C:/secure/path/instantly.env
INSTANTLY_API_KEY_FILE_VARIABLE=QUEMEDIA_INSTANTLY_API_KEY
INSTANTLY_APPROVED_SENDER_ACCOUNTS=sender1@example.com,sender2@example.com
INSTANTLY_APPROVED_CAMPAIGN_IDS=campaign-uuid-1,campaign-uuid-2
INSTANTLY_MIN_WARMUP_SCORE=75
INSTANTLY_WEBHOOK_SECRET=
```

Use either the direct key or the external-file configuration, not both. Direct environment variables take precedence. The external file is read only by server code, and its contents are never returned to the browser.

Create the campaign in Instantly first. Attach exactly one approved warmed account and use a sequence variant whose subject is `{{qm_subject}}` and body is `{{qm_body}}`.

## Failure behavior and limitations

- Missing credentials return a safe not-configured state.
- Expired/invalid credentials return an integration error without exposing the key.
- Account/campaign health is checked at review and again on submission.
- 429 and transient provider failures receive bounded retries; the local failed action remains available for diagnosis.
- Network or provider failures never remove the local lead.
- Webhook events are idempotent and partial sync updates do not erase prior history.
- Instantly may accept a lead before an ambiguous network failure is visible locally. The local idempotency record plus `skip_if_in_campaign` reduces duplicate risk, but an operator should inspect Instantly before manually overriding such a failure.
- A lead added to a campaign can wait before its actual send. It does not count toward the daily target during that interval.
- Full mailbox/thread state is subject to Instantly’s available email fields and the 20 request/minute polling limit.
- Campaign creation and sequence editing are intentionally performed in Instantly. Q Intelligence validates approved mappings rather than modifying campaign infrastructure.
