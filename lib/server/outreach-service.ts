import "server-only";

import { createHash } from "node:crypto";
import type {
  OutreachAction,
  OutreachSubmission,
} from "@/lib/operating-types";
import type { WorkspaceActor } from "@/lib/server/auth";
import { createId, getDatabase, withTransaction } from "@/lib/server/database";
import {
  createInstantlyLead,
  getInstantlyOptions,
  InstantlyApiError,
} from "@/lib/server/instantly";
import {
  getOperatingLeadProfile,
  getOutreachById,
  getOutreachByIdempotencyKey,
  recordActivity,
  recordAudit,
} from "@/lib/server/lead-repository";
import { nowIso, toLocalDate } from "@/lib/server/time";

export class OutreachSubmissionError extends Error {
  status: number;
  code: string;
  action?: OutreachAction;

  constructor(
    message: string,
    status = 400,
    code = "invalid_outreach_submission",
    action?: OutreachAction,
  ) {
    super(message);
    this.name = "OutreachSubmissionError";
    this.status = status;
    this.code = code;
    this.action = action;
  }
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function fingerprint(
  leadId: string,
  submission: OutreachSubmission,
) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        leadId,
        campaignId: submission.campaignId,
        sender: normalizeEmail(submission.senderAccount),
        recipient: normalizeEmail(submission.recipientEmail),
        subject: submission.subject.trim(),
        body: submission.messageBody.trim(),
      }),
    )
    .digest("hex");
}

function validateIdempotencyKey(value: string) {
  return /^[a-zA-Z0-9_.:-]{16,200}$/.test(value);
}

function validateSubmission(
  leadId: string,
  submission: OutreachSubmission,
) {
  const lead = getOperatingLeadProfile(leadId);
  if (!lead) {
    throw new OutreachSubmissionError(
      "Lead not found.",
      404,
      "lead_not_found",
    );
  }
  if (submission.confirmation !== true) {
    throw new OutreachSubmissionError(
      "Explicit send approval is required.",
      409,
      "approval_required",
    );
  }
  if (lead.operations.qualificationStatus !== "qualified") {
    throw new OutreachSubmissionError(
      "Only qualified leads can enter Instantly.",
      409,
      "lead_not_qualified",
    );
  }
  if (
    !["verified", "usable"].includes(
      lead.operations.emailVerificationStatus,
    )
  ) {
    throw new OutreachSubmissionError(
      "The recipient email is not verified or usable.",
      409,
      "email_not_ready",
    );
  }
  const recipient = normalizeEmail(submission.recipientEmail);
  const allowedEmails = new Set(
    lead.contactChannels
      .filter((contact) => contact.kind === "email")
      .map((contact) => normalizeEmail(contact.value)),
  );
  if (!allowedEmails.has(recipient)) {
    throw new OutreachSubmissionError(
      "The recipient must be one of the public business emails stored on this lead.",
      409,
      "recipient_not_on_lead",
    );
  }
  if (!submission.subject.trim() || submission.subject.length > 200) {
    throw new OutreachSubmissionError(
      "Subject is required and must be 200 characters or fewer.",
    );
  }
  if (
    submission.messageBody.trim().length < 40 ||
    submission.messageBody.length > 10_000
  ) {
    throw new OutreachSubmissionError(
      "Message body must contain 40 to 10,000 characters.",
    );
  }
  if (/\[(?:your|insert|name|company|date)[^\]]*\]/i.test(submission.messageBody)) {
    throw new OutreachSubmissionError(
      "Resolve message placeholders before approval.",
      409,
      "unresolved_placeholder",
    );
  }
  if (!Array.isArray(submission.evidenceIds) || submission.evidenceIds.length === 0) {
    throw new OutreachSubmissionError(
      "Select at least one evidence record used for personalization.",
      409,
      "personalization_evidence_required",
    );
  }
  const validEvidence = new Set(lead.evidence.map((item) => item.id));
  if (submission.evidenceIds.some((id) => !validEvidence.has(id))) {
    throw new OutreachSubmissionError(
      "One or more personalization evidence IDs do not belong to this lead.",
      409,
      "invalid_evidence_reference",
    );
  }
  const variables = submission.personalizationVariables ?? {};
  if (
    Object.keys(variables).length > 20 ||
    Object.entries(variables).some(
      ([key, value]) =>
        !/^[a-zA-Z][a-zA-Z0-9_]{0,49}$/.test(key) ||
        typeof value !== "string" ||
        value.length > 1000,
    )
  ) {
    throw new OutreachSubmissionError(
      "Personalization variables must use safe keys and string values.",
    );
  }
  return lead;
}

function reserveSubmission(
  leadId: string,
  submission: OutreachSubmission,
  actor: WorkspaceActor,
  idempotencyKey: string,
  campaignName: string,
) {
  const timestamp = nowIso();
  const requestFingerprint = fingerprint(leadId, submission);
  const existing = getOutreachByIdempotencyKey(idempotencyKey);
  if (existing) return { existing, created: false as const };

  const duplicate = getDatabase()
    .prepare(`
      SELECT id FROM outreach_actions
      WHERE request_fingerprint = ?
        AND status IN ('approved', 'submitting', 'queued', 'sent', 'delivered', 'replied')
        AND created_at >= ?
      LIMIT 1
    `)
    .get(
      requestFingerprint,
      new Date(Date.now() - 30 * 86_400_000).toISOString(),
    ) as unknown as { id: string } | undefined;
  if (duplicate) {
    throw new OutreachSubmissionError(
      "An identical outreach action already exists for this lead and campaign.",
      409,
      "duplicate_outreach_blocked",
      getOutreachById(duplicate.id),
    );
  }

  const previousCount = getDatabase()
    .prepare("SELECT count(*) AS count FROM outreach_actions WHERE lead_id = ?")
    .get(leadId) as unknown as { count: number };
  const actionId = createId("outreach");
  withTransaction((db) => {
    db.prepare(`
      INSERT INTO outreach_actions (
        id, lead_id, idempotency_key, request_fingerprint, recipient_email,
        sender_account, instantly_campaign_id, instantly_campaign_name,
        subject, message_body, message_version, personalization_json,
        evidence_ids_json, approved_by, approved_at, status,
        instantly_lead_id, instantly_email_id, delivery_status, reply_status,
        reply_date, latest_response, follow_up_status, next_action, error_code,
        error_message, first_sent_at, first_sent_local_date, local_date,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitting',
        NULL, NULL, 'pending', 'none', NULL, NULL, 'scheduled',
        'Wait for the Instantly send event; this does not count as contacted yet.',
        NULL, NULL, NULL, NULL, ?, ?, ?
      )
    `).run(
      actionId,
      leadId,
      idempotencyKey,
      requestFingerprint,
      normalizeEmail(submission.recipientEmail),
      normalizeEmail(submission.senderAccount),
      submission.campaignId,
      campaignName,
      submission.subject.trim(),
      submission.messageBody.trim(),
      Number(previousCount.count ?? 0) + 1,
      JSON.stringify(submission.personalizationVariables ?? {}),
      JSON.stringify(submission.evidenceIds),
      actor.id,
      timestamp,
      toLocalDate(timestamp),
      timestamp,
      timestamp,
    );
    recordActivity(db, {
      leadId,
      occurredAt: timestamp,
      type: "message-approved",
      title: "Personalized outreach approved",
      detail: `${actor.name} approved message version ${Number(previousCount.count ?? 0) + 1} for ${normalizeEmail(submission.recipientEmail)}.`,
      actorId: actor.id,
      actorType: actor.actorType,
      metadata: {
        actionId,
        campaignId: submission.campaignId,
        senderAccount: normalizeEmail(submission.senderAccount),
        evidenceIds: submission.evidenceIds,
      },
    });
    recordAudit(db, {
      actorId: actor.id,
      actorType: actor.actorType,
      action: "outreach.approve",
      resourceType: "outreach-action",
      resourceId: actionId,
      outcome: "success",
      detail: "A human-approved personalized message was reserved for Instantly submission.",
      metadata: {
        leadId,
        campaignId: submission.campaignId,
        recipientEmail: normalizeEmail(submission.recipientEmail),
        senderAccount: normalizeEmail(submission.senderAccount),
      },
    });
  });
  return { existing: getOutreachById(actionId)!, created: true as const };
}

export async function submitOutreach(
  leadId: string,
  submission: OutreachSubmission,
  actor: WorkspaceActor,
  idempotencyKey: string,
) {
  if (!validateIdempotencyKey(idempotencyKey)) {
    throw new OutreachSubmissionError(
      "A stable Idempotency-Key header of 16 to 200 safe characters is required.",
      400,
      "idempotency_key_required",
    );
  }
  const existing = getOutreachByIdempotencyKey(idempotencyKey);
  if (existing) {
    const incomingFingerprint = fingerprint(leadId, submission);
    const row = getDatabase()
      .prepare(
        "SELECT request_fingerprint FROM outreach_actions WHERE idempotency_key = ?",
      )
      .get(idempotencyKey) as unknown as { request_fingerprint: string };
    if (row.request_fingerprint !== incomingFingerprint) {
      throw new OutreachSubmissionError(
        "This idempotency key was already used with a different request.",
        409,
        "idempotency_conflict",
        existing,
      );
    }
    return { action: existing, replayed: true };
  }
  const lead = validateSubmission(leadId, submission);
  const options = await getInstantlyOptions();
  if (options.connectionState !== "connected") {
    throw new OutreachSubmissionError(
      options.message || "Instantly is not available.",
      503,
      "instantly_unavailable",
    );
  }
  const campaign = options.campaigns.find(
    (item) => item.id === submission.campaignId,
  );
  if (!campaign?.eligible) {
    throw new OutreachSubmissionError(
      campaign
        ? `Campaign is not eligible: ${campaign.eligibilityReasons.join(" ")}`
        : "The selected campaign is unavailable.",
      409,
      "campaign_not_eligible",
    );
  }
  if (
    !campaign.selectedSender ||
    normalizeEmail(campaign.selectedSender) !==
      normalizeEmail(submission.senderAccount)
  ) {
    throw new OutreachSubmissionError(
      "The confirmed sender must be the campaign's single approved sending account.",
      409,
      "sender_campaign_mismatch",
    );
  }
  const sender = options.accounts.find(
    (account) =>
      normalizeEmail(account.email) ===
      normalizeEmail(submission.senderAccount),
  );
  if (!sender?.eligible) {
    throw new OutreachSubmissionError(
      sender
        ? `Sender is not eligible: ${sender.eligibilityReasons.join(" ")}`
        : "The selected sender is unavailable.",
      409,
      "sender_not_eligible",
    );
  }
  const reservation = reserveSubmission(
    leadId,
    submission,
    actor,
    idempotencyKey,
    campaign.name,
  );
  if (!reservation.created) {
    return { action: reservation.existing, replayed: true };
  }
  const actionId = reservation.existing.id;
  try {
    const decisionMaker = lead.decisionMakers[0];
    const [firstName, ...lastNameParts] = decisionMaker?.name.split(/\s+/) ?? [];
    const phone = lead.contactChannels.find(
      (channel) => channel.kind === "phone",
    )?.value;
    const instantlyLead = await createInstantlyLead({
      campaignId: campaign.id,
      email: submission.recipientEmail,
      companyName: lead.name,
      website: lead.website,
      phone,
      firstName,
      lastName: lastNameParts.join(" ") || undefined,
      jobTitle: decisionMaker?.role,
      subject: submission.subject.trim(),
      messageBody: submission.messageBody.trim(),
      qIntelligenceLeadId: lead.id,
      senderAccount: sender.email,
      personalizationVariables: submission.personalizationVariables ?? {},
    });
    const timestamp = nowIso();
    withTransaction((db) => {
      db.prepare(`
        UPDATE outreach_actions SET
          status = 'queued',
          instantly_lead_id = ?,
          delivery_status = 'queued-in-active-campaign',
          next_action = 'Wait for the Instantly email_sent event. The daily goal updates only after that event.',
          updated_at = ?
        WHERE id = ?
      `).run(instantlyLead.id, timestamp, actionId);
      recordActivity(db, {
        leadId,
        occurredAt: timestamp,
        type: "outreach",
        title: "Lead added to the approved Instantly campaign",
        detail: `Queued in ${campaign.name}. No contact is counted until Instantly confirms email_sent.`,
        actorId: actor.id,
        actorType: actor.actorType,
        metadata: {
          actionId,
          instantlyLeadId: instantlyLead.id,
          campaignId: campaign.id,
          senderAccount: sender.email,
        },
      });
      recordAudit(db, {
        actorId: actor.id,
        actorType: actor.actorType,
        action: "outreach.instantly.submit",
        resourceType: "outreach-action",
        resourceId: actionId,
        outcome: "success",
        detail: "Instantly accepted the lead for the approved active campaign.",
        metadata: {
          instantlyLeadId: instantlyLead.id,
          campaignId: campaign.id,
        },
      });
    });
    return { action: getOutreachById(actionId)!, replayed: false };
  } catch (error) {
    const timestamp = nowIso();
    const code =
      error instanceof InstantlyApiError
        ? error.code
        : "instantly_submission_failed";
    const message =
      error instanceof Error
        ? error.message
        : "Instantly submission failed. The local record was preserved.";
    withTransaction((db) => {
      db.prepare(`
        UPDATE outreach_actions SET
          status = 'failed', delivery_status = 'not-sent',
          error_code = ?, error_message = ?,
          next_action = 'Review the provider error and retry with a new approval only after confirming that the lead was not added.',
          updated_at = ?
        WHERE id = ?
      `).run(code, message, timestamp, actionId);
      recordActivity(db, {
        leadId,
        occurredAt: timestamp,
        type: "error",
        title: "Instantly submission failed",
        detail: message,
        actorId: actor.id,
        actorType: actor.actorType,
        metadata: { actionId, code },
      });
      recordAudit(db, {
        actorId: actor.id,
        actorType: actor.actorType,
        action: "outreach.instantly.submit",
        resourceType: "outreach-action",
        resourceId: actionId,
        outcome: "failed",
        detail: message,
        metadata: { code },
      });
    });
    throw new OutreachSubmissionError(
      message,
      error instanceof InstantlyApiError ? error.status : 502,
      code,
      getOutreachById(actionId),
    );
  }
}
