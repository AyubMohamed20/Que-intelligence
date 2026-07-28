import "server-only";

import { createHash } from "node:crypto";
import type { ActivityEvent, LifecycleStatus, ReplyStatus } from "@/lib/operating-types";
import type { WorkspaceActor } from "@/lib/server/auth";
import { getDatabase, withTransaction } from "@/lib/server/database";
import {
  InstantlyApiError,
  listInstantlyEmails,
} from "@/lib/server/instantly";
import {
  getLeadByEmail,
  getOutreachById,
  recordActivity,
  recordAudit,
} from "@/lib/server/lead-repository";
import { nowIso, toLocalDate } from "@/lib/server/time";

export interface InstantlyWebhookPayload {
  timestamp: string;
  event_type: string;
  workspace?: string;
  campaign_id?: string;
  campaign_name?: string;
  lead_email?: string;
  email_account?: string;
  unibox_url?: string;
  step?: number;
  variant?: number;
  is_first?: boolean;
  email_id?: string;
  email_subject?: string;
  email_text?: string;
  email_html?: string;
  reply_text_snippet?: string;
  reply_subject?: string;
  reply_text?: string;
  reply_html?: string;
  [key: string]: unknown;
}

interface ActionLookupRow {
  id: string;
  lead_id: string;
}

function canonicalHash(payload: InstantlyWebhookPayload) {
  const sorted = Object.keys(payload)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = payload[key];
      return result;
    }, {});
  return createHash("sha256")
    .update(JSON.stringify(sorted))
    .digest("hex");
}

function findAction(payload: InstantlyWebhookPayload, leadId?: string) {
  const clauses: string[] = [];
  const values: string[] = [];
  if (leadId) {
    clauses.push("lead_id = ?");
    values.push(leadId);
  }
  if (payload.lead_email) {
    clauses.push("lower(recipient_email) = ?");
    values.push(payload.lead_email.toLowerCase());
  }
  if (payload.campaign_id) {
    clauses.push("instantly_campaign_id = ?");
    values.push(payload.campaign_id);
  }
  if (clauses.length === 0) return undefined;
  return getDatabase()
    .prepare(
      `SELECT id, lead_id FROM outreach_actions
       WHERE ${clauses.join(" AND ")}
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(...values) as unknown as ActionLookupRow | undefined;
}

function eventStatus(eventType: string): {
  lifecycle?: LifecycleStatus;
  replyStatus?: ReplyStatus;
  actionStatus?: string;
  deliveryStatus?: string;
  activityType: ActivityEvent["type"];
  title: string;
  nextAction?: string;
  positive?: boolean;
} {
  switch (eventType) {
    case "email_sent":
      return {
        lifecycle: "contacted",
        actionStatus: "sent",
        deliveryStatus: "sent",
        activityType: "delivery",
        title: "Instantly confirmed the email was sent",
        nextAction: "Monitor for a reply and complete the next approved follow-up when due.",
      };
    case "email_bounced":
      return {
        lifecycle: "invalid-contact",
        actionStatus: "bounced",
        deliveryStatus: "bounced",
        activityType: "error",
        title: "Instantly reported an email bounce",
        nextAction: "Find and verify a replacement business email before retrying.",
      };
    case "reply_received":
      return {
        lifecycle: "replied",
        replyStatus: "received",
        actionStatus: "replied",
        deliveryStatus: "reply-received",
        activityType: "reply",
        title: "Reply received",
        nextAction: "Review the reply and record its outcome before responding.",
      };
    case "auto_reply_received":
      return {
        lifecycle: "follow-up-due",
        replyStatus: "automatic",
        actionStatus: "replied",
        deliveryStatus: "automatic-reply",
        activityType: "reply",
        title: "Automatic reply received",
        nextAction: "Review the return date or routing information and schedule the next action.",
      };
    case "lead_interested":
      return {
        lifecycle: "interested",
        replyStatus: "positive",
        actionStatus: "replied",
        activityType: "reply",
        title: "Lead marked interested",
        nextAction: "Respond personally and propose the clearest low-friction next step.",
        positive: true,
      };
    case "lead_not_interested":
      return {
        lifecycle: "not-interested",
        replyStatus: "negative",
        actionStatus: "replied",
        activityType: "reply",
        title: "Lead marked not interested",
        nextAction: "Close active follow-up and retain the response for future scoring review.",
      };
    case "lead_meeting_booked":
      return {
        lifecycle: "meeting-booked",
        replyStatus: "positive",
        actionStatus: "replied",
        activityType: "meeting",
        title: "Meeting booked",
        nextAction: "Prepare the evidence brief and meeting agenda.",
        positive: true,
      };
    case "lead_closed":
      return {
        lifecycle: "closed",
        activityType: "status-change",
        title: "Lead marked closed",
        nextAction: "No further outreach unless the record is reopened manually.",
      };
    case "lead_wrong_person":
      return {
        lifecycle: "invalid-contact",
        replyStatus: "negative",
        activityType: "reply",
        title: "Recipient marked as the wrong person",
        nextAction: "Find the correct public business contact without guessing.",
      };
    case "lead_out_of_office":
      return {
        lifecycle: "follow-up-due",
        replyStatus: "automatic",
        activityType: "reply",
        title: "Lead is out of office",
        nextAction: "Schedule follow-up for the documented return date.",
      };
    case "lead_unsubscribed":
      return {
        lifecycle: "closed",
        replyStatus: "negative",
        actionStatus: "cancelled",
        deliveryStatus: "unsubscribed",
        activityType: "status-change",
        title: "Lead unsubscribed",
        nextAction: "Do not send further outreach.",
      };
    case "account_error":
      return {
        actionStatus: "failed",
        deliveryStatus: "account-error",
        activityType: "error",
        title: "Instantly reported a sending-account error",
        nextAction: "Pause outreach from this account until its health is restored.",
      };
    default:
      return {
        activityType: "sync",
        title: `Instantly event: ${eventType.replaceAll("_", " ")}`,
      };
  }
}

function safeTimestamp(value: unknown) {
  if (
    typeof value === "string" &&
    Number.isFinite(new Date(value).getTime())
  ) {
    return new Date(value).toISOString();
  }
  return nowIso();
}

export function processInstantlyWebhook(
  payload: InstantlyWebhookPayload,
  suppliedEventId?: string,
) {
  if (!payload.event_type || typeof payload.event_type !== "string") {
    throw new Error("event_type is required.");
  }
  const eventId = suppliedEventId ?? canonicalHash(payload);
  const existing = getDatabase()
    .prepare("SELECT id FROM webhook_events WHERE id = ?")
    .get(eventId);
  if (existing) return { duplicate: true, eventId, matched: false };

  const timestamp = safeTimestamp(payload.timestamp);
  const lead = payload.lead_email
    ? getLeadByEmail(payload.lead_email)
    : undefined;
  const actionLookup = findAction(payload, lead?.id);
  const action = actionLookup ? getOutreachById(actionLookup.id) : undefined;
  const transition = eventStatus(payload.event_type);
  const latestResponse =
    payload.reply_text ||
    payload.reply_text_snippet ||
    (typeof payload.email_text === "string" &&
    payload.event_type.includes("reply")
      ? payload.email_text
      : undefined);

  withTransaction((db) => {
    db.prepare(`
      INSERT INTO webhook_events (
        id, received_at, event_type, lead_email, campaign_id,
        processed, error_message, payload_json
      ) VALUES (?, ?, ?, ?, ?, 1, NULL, ?)
    `).run(
      eventId,
      nowIso(),
      payload.event_type,
      payload.lead_email ?? null,
      payload.campaign_id ?? null,
      JSON.stringify(payload),
    );

    if (action) {
      const firstSent = payload.event_type === "email_sent" ? timestamp : undefined;
      db.prepare(`
        UPDATE outreach_actions SET
          status = coalesce(?, status),
          delivery_status = coalesce(?, delivery_status),
          sender_account = coalesce(?, sender_account),
          instantly_email_id = coalesce(?, instantly_email_id),
          reply_status = coalesce(?, reply_status),
          reply_date = CASE
            WHEN ? IN ('reply_received', 'auto_reply_received', 'lead_interested',
              'lead_not_interested', 'lead_meeting_booked', 'lead_wrong_person',
              'lead_out_of_office')
            THEN ?
            ELSE reply_date
          END,
          latest_response = coalesce(?, latest_response),
          next_action = coalesce(?, next_action),
          first_sent_at = coalesce(first_sent_at, ?),
          first_sent_local_date = coalesce(first_sent_local_date, ?),
          error_code = CASE
            WHEN ? IN ('email_bounced', 'account_error') THEN ?
            ELSE error_code
          END,
          error_message = CASE
            WHEN ? IN ('email_bounced', 'account_error') THEN ?
            ELSE error_message
          END,
          updated_at = ?
        WHERE id = ?
      `).run(
        transition.actionStatus ?? null,
        transition.deliveryStatus ?? null,
        payload.email_account ?? null,
        payload.email_id ?? null,
        transition.replyStatus ?? null,
        payload.event_type,
        timestamp,
        latestResponse ?? null,
        transition.nextAction ?? null,
        firstSent ?? null,
        firstSent ? toLocalDate(firstSent) : null,
        payload.event_type,
        payload.event_type,
        payload.event_type,
        transition.title,
        timestamp,
        action.id,
      );
    }

    if (lead && transition.lifecycle) {
      const protectedStatuses = new Set<LifecycleStatus>([
        "interested",
        "meeting-booked",
        "not-interested",
        "closed",
      ]);
      const shouldUpdate =
        !protectedStatuses.has(lead.operations.lifecycleStatus) ||
        ["lead_interested", "lead_not_interested", "lead_meeting_booked", "lead_closed"].includes(
          payload.event_type,
        );
      if (shouldUpdate) {
        db.prepare(`
          UPDATE lead_operations SET
            lifecycle_status = ?,
            last_contact_at = CASE
              WHEN ? = 'email_sent' THEN coalesce(last_contact_at, ?)
              ELSE last_contact_at
            END,
            last_reply_at = CASE
              WHEN ? IN ('reply_received', 'auto_reply_received', 'lead_interested',
                'lead_not_interested', 'lead_meeting_booked', 'lead_wrong_person',
                'lead_out_of_office')
              THEN ?
              ELSE last_reply_at
            END,
            reply_status = coalesce(?, reply_status),
            follow_up_status = CASE
              WHEN ? = 'email_sent' THEN 'scheduled'
              WHEN ? IN ('reply_received', 'lead_interested', 'lead_not_interested',
                'lead_meeting_booked', 'lead_closed', 'lead_unsubscribed')
              THEN 'not-required'
              WHEN ? IN ('auto_reply_received', 'lead_out_of_office') THEN 'scheduled'
              ELSE follow_up_status
            END,
            next_action = coalesce(?, next_action),
            updated_at = ?
          WHERE lead_id = ?
        `).run(
          transition.lifecycle,
          payload.event_type,
          timestamp,
          payload.event_type,
          timestamp,
          transition.replyStatus ?? null,
          payload.event_type,
          payload.event_type,
          payload.event_type,
          transition.nextAction ?? null,
          timestamp,
          lead.id,
        );
      }
    }

    recordActivity(db, {
      id: `instantly-${eventId}`,
      leadId: lead?.id,
      occurredAt: timestamp,
      type: transition.activityType,
      title: transition.title,
      detail:
        latestResponse ||
        `${payload.campaign_name ?? payload.campaign_id ?? "Instantly"} · ${
          payload.email_account ?? "sender unavailable"
        }`,
      actorId: "instantly",
      actorType: "instantly-webhook",
      metadata: {
        actionId: action?.id,
        eventType: payload.event_type,
        campaignId: payload.campaign_id,
        senderAccount: payload.email_account,
        uniboxUrl: payload.unibox_url,
        positive: transition.positive ?? false,
        nextAction: transition.nextAction,
      },
    });
    recordAudit(db, {
      id: `audit-instantly-${eventId}`,
      occurredAt: timestamp,
      actorId: "instantly",
      actorType: "instantly-webhook",
      action: `instantly.webhook.${payload.event_type}`,
      resourceType: action ? "outreach-action" : lead ? "lead" : "webhook-event",
      resourceId: action?.id ?? lead?.id ?? eventId,
      outcome: action || lead ? "success" : "blocked",
      detail:
        action || lead
          ? "Instantly event reconciled into the local source of truth."
          : "Webhook event was retained but did not match a local lead.",
      metadata: {
        eventId,
        campaignId: payload.campaign_id,
        leadEmail: payload.lead_email,
      },
    });
  });

  return {
    duplicate: false,
    eventId,
    matched: Boolean(action || lead),
    leadId: lead?.id,
    actionId: action?.id,
  };
}

function syntheticPayload(
  action: NonNullable<ReturnType<typeof getOutreachById>>,
  email: Awaited<ReturnType<typeof listInstantlyEmails>>[number],
): InstantlyWebhookPayload {
  const incoming =
    email.from_address_email?.toLowerCase() ===
    action.recipientEmail.toLowerCase();
  return {
    timestamp: email.timestamp_email ?? email.timestamp_created,
    event_type: incoming
      ? email.is_auto_reply
        ? "auto_reply_received"
        : "reply_received"
      : "email_sent",
    campaign_id: email.campaign_id ?? action.instantlyCampaignId,
    campaign_name: action.instantlyCampaignName,
    lead_email: action.recipientEmail,
    email_account: incoming
      ? action.senderAccount
      : email.from_address_email ?? email.eaccount ?? action.senderAccount,
    email_id: email.id,
    email_subject: email.subject,
    email_text: incoming ? undefined : email.body?.text,
    reply_text: incoming ? email.body?.text : undefined,
    reply_text_snippet: incoming ? email.content_preview : undefined,
  };
}

export async function pollInstantlyActivity(
  actor: WorkspaceActor,
  leadId?: string,
) {
  const clauses = [
    "status IN ('queued', 'sent', 'delivered')",
    "created_at >= ?",
  ];
  const params: string[] = [
    new Date(Date.now() - 30 * 86_400_000).toISOString(),
  ];
  if (leadId) {
    clauses.push("lead_id = ?");
    params.push(leadId);
  }
  const rows = getDatabase()
    .prepare(
      `SELECT id FROM outreach_actions
       WHERE ${clauses.join(" AND ")}
       ORDER BY updated_at ASC LIMIT 10`,
    )
    .all(...params) as unknown as Array<{ id: string }>;
  const results: Array<{
    actionId: string;
    events: number;
    error?: string;
  }> = [];
  for (const row of rows) {
    const action = getOutreachById(row.id);
    if (!action) continue;
    try {
      const emails = await listInstantlyEmails({
        leadEmail: action.recipientEmail,
        campaignId: action.instantlyCampaignId,
        limit: 25,
      });
      let processed = 0;
      for (const email of [...emails].reverse()) {
        const payload = syntheticPayload(action, email);
        const result = processInstantlyWebhook(
          payload,
          `poll-${createHash("sha256")
            .update(`${action.id}:${email.id}:${payload.event_type}`)
            .digest("hex")}`,
        );
        if (!result.duplicate) processed += 1;
      }
      results.push({ actionId: action.id, events: processed });
    } catch (error) {
      results.push({
        actionId: action.id,
        events: 0,
        error:
          error instanceof InstantlyApiError
            ? error.message
            : "Sync request failed.",
      });
    }
  }
  const timestamp = nowIso();
  withTransaction((db) => {
    db.prepare(`
      INSERT INTO sync_state (key, value_json, updated_at)
      VALUES ('instantly:last-poll', ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value_json = excluded.value_json,
        updated_at = excluded.updated_at
    `).run(
      JSON.stringify({
        requestedBy: actor.id,
        leadId: leadId ?? null,
        actionCount: rows.length,
        resultCount: results.length,
      }),
      timestamp,
    );
    recordAudit(db, {
      actorId: actor.id,
      actorType: actor.actorType,
      action: "instantly.sync.poll",
      resourceType: leadId ? "lead" : "workspace",
      resourceId: leadId ?? "q-intelligence",
      outcome: results.some((result) => result.error) ? "failed" : "success",
      detail: `Polled ${results.length} outreach action${results.length === 1 ? "" : "s"} within the 20-requests-per-minute email endpoint limit.`,
      metadata: { results },
    });
  });
  return { checkedAt: timestamp, results };
}
