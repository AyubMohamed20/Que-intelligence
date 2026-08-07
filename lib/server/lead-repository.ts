import "server-only";

import type {
  ActivityEvent,
  AuditLogEntry,
  DailyOutreachDashboard,
  FollowUpStatus,
  LeadQualityScore,
  LeadStatusUpdate,
  LifecycleStatus,
  OperatingLeadProfile,
  OperatingLeadSummary,
  OperationalLeadState,
  OutreachAction,
  OutreachSendingStatus,
  QualificationStatus,
  ReplyStatus,
  ResearchBatch,
} from "@/lib/operating-types";
import type { LeadProfile, RelationshipEvent } from "@/lib/types";
import type { WorkspaceActor } from "@/lib/server/auth";
import {
  createId,
  getDatabase,
  withTransaction,
  type Db,
} from "@/lib/server/database";
import { nowIso, toLocalDate, workspaceTimezone } from "@/lib/server/time";

interface LeadJoinedRow {
  id: string;
  profile_json: string;
  lifecycle_status: string;
  qualification_status: string;
  qualification_reason: string;
  opening_status: string;
  opening_date: string | null;
  opening_date_confidence: string;
  primary_email: string | null;
  email_provenance: string;
  email_verification_status: string;
  email_contact_type: string;
  email_last_verified_at: string | null;
  added_at: string;
  qualified_at: string | null;
  last_contact_at: string | null;
  last_reply_at: string | null;
  reply_status: string;
  follow_up_status: string;
  next_action: string;
  next_action_due_at: string | null;
  assigned_to: string | null;
  internal_notes: string;
  source_actor_type: string;
  source_actor_id: string;
  source_batch_id: string | null;
  quality_score_json: string;
  created_at: string;
  updated_at: string;
}

interface OutreachRow {
  id: string;
  lead_id: string;
  idempotency_key: string;
  recipient_email: string;
  sender_account: string;
  instantly_campaign_id: string;
  instantly_campaign_name: string;
  subject: string;
  message_body: string;
  message_version: number;
  personalization_json: string;
  evidence_ids_json: string;
  approved_by: string;
  approved_at: string;
  status: string;
  instantly_lead_id: string | null;
  instantly_email_id: string | null;
  delivery_status: string;
  reply_status: string;
  reply_date: string | null;
  latest_response: string | null;
  follow_up_status: string;
  next_action: string;
  error_code: string | null;
  error_message: string | null;
  first_sent_at: string | null;
  local_date: string;
  created_at: string;
  updated_at: string;
}

interface ActivityRow {
  id: string;
  lead_id: string | null;
  occurred_at: string;
  local_date: string;
  type: ActivityEvent["type"];
  title: string;
  detail: string;
  actor_id: string;
  actor_type: ActivityEvent["actorType"];
  metadata_json: string;
}

const leadJoinSql = `
  SELECT
    p.id, p.profile_json,
    o.lifecycle_status, o.qualification_status, o.qualification_reason,
    o.opening_status, o.opening_date, o.opening_date_confidence,
    o.primary_email, o.email_provenance, o.email_verification_status,
    o.email_contact_type, o.email_last_verified_at, o.added_at,
    o.qualified_at, o.last_contact_at, o.last_reply_at, o.reply_status,
    o.follow_up_status, o.next_action, o.next_action_due_at, o.assigned_to,
    o.internal_notes, o.source_actor_type, o.source_actor_id,
    o.source_batch_id, o.quality_score_json, o.created_at, o.updated_at
  FROM lead_profiles p
  JOIN lead_operations o ON o.lead_id = p.id
`;

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapState(row: LeadJoinedRow): OperationalLeadState {
  return {
    leadId: row.id,
    lifecycleStatus: row.lifecycle_status as OperationalLeadState["lifecycleStatus"],
    qualificationStatus:
      row.qualification_status as OperationalLeadState["qualificationStatus"],
    qualificationReason: row.qualification_reason,
    openingStatus: row.opening_status as OperationalLeadState["openingStatus"],
    openingDate: row.opening_date ?? undefined,
    openingDateConfidence:
      row.opening_date_confidence as OperationalLeadState["openingDateConfidence"],
    primaryEmail: row.primary_email ?? undefined,
    emailProvenance:
      row.email_provenance as OperationalLeadState["emailProvenance"],
    emailVerificationStatus:
      row.email_verification_status as OperationalLeadState["emailVerificationStatus"],
    emailContactType:
      row.email_contact_type as OperationalLeadState["emailContactType"],
    emailLastVerifiedAt: row.email_last_verified_at ?? undefined,
    addedAt: row.added_at,
    qualifiedAt: row.qualified_at ?? undefined,
    lastContactAt: row.last_contact_at ?? undefined,
    lastReplyAt: row.last_reply_at ?? undefined,
    replyStatus: row.reply_status as ReplyStatus,
    followUpStatus: row.follow_up_status as FollowUpStatus,
    nextAction: row.next_action,
    nextActionDueAt: row.next_action_due_at ?? undefined,
    assignedTo: row.assigned_to ?? undefined,
    internalNotes: row.internal_notes,
    sourceActorType:
      row.source_actor_type as OperationalLeadState["sourceActorType"],
    sourceActorId: row.source_actor_id,
    sourceBatchId: row.source_batch_id ?? undefined,
    qualityScore: parseJson<LeadQualityScore>(row.quality_score_json, {
      score: 0,
      grade: "D",
      version: "unavailable",
      calculatedAt: row.updated_at,
      summary: "The lead quality score could not be loaded.",
      factors: [],
    }),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOutreach(row: OutreachRow): OutreachAction {
  return {
    id: row.id,
    leadId: row.lead_id,
    idempotencyKey: row.idempotency_key,
    recipientEmail: row.recipient_email,
    senderAccount: row.sender_account,
    instantlyCampaignId: row.instantly_campaign_id,
    instantlyCampaignName: row.instantly_campaign_name,
    subject: row.subject,
    messageBody: row.message_body,
    messageVersion: row.message_version,
    personalizationVariables: parseJson(row.personalization_json, {}),
    evidenceIds: parseJson(row.evidence_ids_json, []),
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    status: row.status as OutreachSendingStatus,
    instantlyLeadId: row.instantly_lead_id ?? undefined,
    instantlyEmailId: row.instantly_email_id ?? undefined,
    deliveryStatus: row.delivery_status,
    replyStatus: row.reply_status as ReplyStatus,
    replyDate: row.reply_date ?? undefined,
    latestResponse: row.latest_response ?? undefined,
    followUpStatus: row.follow_up_status as FollowUpStatus,
    nextAction: row.next_action,
    errorCode: row.error_code ?? undefined,
    errorMessage: row.error_message ?? undefined,
    firstSentAt: row.first_sent_at ?? undefined,
    localDate: row.local_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapActivity(row: ActivityRow): ActivityEvent {
  return {
    id: row.id,
    leadId: row.lead_id ?? undefined,
    occurredAt: row.occurred_at,
    localDate: row.local_date,
    type: row.type,
    title: row.title,
    detail: row.detail,
    actorId: row.actor_id,
    actorType: row.actor_type,
    metadata: parseJson(row.metadata_json, {}),
  };
}

function summaryFrom(
  profile: LeadProfile,
  state: OperationalLeadState,
): OperatingLeadSummary {
  const searchParts = [
    profile.name,
    profile.industry,
    profile.neighborhood,
    profile.location,
    profile.website,
    profile.identity.ownership,
    profile.identity.offerings.join(" "),
    profile.decisionMakers.map((person) => `${person.name} ${person.role}`).join(" "),
    profile.contactChannels.map((channel) => channel.value).join(" "),
    profile.tags.join(" "),
    state.internalNotes,
    state.nextAction,
  ];
  return {
    id: profile.id,
    name: profile.name,
    initials: profile.initials,
    logoPath: profile.logoPath,
    logoSurface: profile.logoSurface,
    industry: profile.industry,
    neighborhood: profile.neighborhood,
    location: profile.location,
    summary: profile.summary,
    stage: profile.stage,
    researchStatus: profile.researchStatus,
    priority: profile.priority,
    opportunityScore: profile.opportunityScore,
    contentFitScore: profile.contentFitScore,
    responseLikelihood: profile.responseLikelihood,
    whyNow: profile.whyNow,
    topSignal: profile.topSignal,
    tags: profile.tags,
    sourceCount: profile.sourceCount,
    evidenceCount: profile.evidenceCount,
    lastEnrichedAt: profile.lastEnrichedAt,
    nextReviewAt: profile.nextReviewAt,
    primaryChannel: profile.primaryChannel,
    thumbnailTone: profile.thumbnailTone,
    lifecycleStatus: state.lifecycleStatus,
    qualificationStatus: state.qualificationStatus,
    openingStatus: state.openingStatus,
    openingDate: state.openingDate,
    leadQualityScore: state.qualityScore.score,
    leadQualityGrade: state.qualityScore.grade,
    leadQualityReasons: [...state.qualityScore.factors]
      .sort(
        (a, b) =>
          b.score / b.maxScore - a.score / a.maxScore,
      )
      .slice(0, 3)
      .map((factor) => factor.rationale),
    primaryEmail: state.primaryEmail,
    emailVerificationStatus: state.emailVerificationStatus,
    emailProvenance: state.emailProvenance,
    lastContactAt: state.lastContactAt,
    lastReplyAt: state.lastReplyAt,
    replyStatus: state.replyStatus,
    followUpStatus: state.followUpStatus,
    nextAction: state.nextAction,
    nextActionDueAt: state.nextActionDueAt,
    addedAt: state.addedAt,
    assignedTo: state.assignedTo,
    searchableText: searchParts.filter(Boolean).join(" ").toLowerCase(),
  };
}

function relationshipType(type: ActivityEvent["type"]): RelationshipEvent["type"] {
  if (type === "reply") return "reply";
  if (type === "meeting") return "meeting";
  if (type === "outreach" || type === "delivery" || type === "send-attempt") {
    return "outreach";
  }
  if (type === "status-change" || type === "qualification") {
    return "status-change";
  }
  if (type === "note") return "note";
  return "research";
}

export async function listOperatingLeadSummaries(): Promise<OperatingLeadSummary[]> {
  const db = await getDatabase();
  const rows = (await db
    .prepare(`${leadJoinSql} ORDER BY o.updated_at DESC, p.id ASC`)
    .all()) as unknown as LeadJoinedRow[];
  return rows.map((row) =>
    summaryFrom(parseJson<LeadProfile>(row.profile_json, {} as LeadProfile), mapState(row)),
  );
}

export async function getOperatingLeadProfile(
  id: string,
): Promise<OperatingLeadProfile | undefined> {
  const db = await getDatabase();
  const row = (await db
    .prepare(`${leadJoinSql} WHERE p.id = ?`)
    .get(id)) as unknown as LeadJoinedRow | undefined;
  if (!row) return undefined;
  const profile = parseJson<LeadProfile>(row.profile_json, {} as LeadProfile);
  const state = mapState(row);
  const outreachHistory = (
    (await db
      .prepare(
        "SELECT * FROM outreach_actions WHERE lead_id = ? ORDER BY created_at DESC",
      )
      .all(id)) as unknown as OutreachRow[]
  ).map(mapOutreach);
  const operationalTimeline = (
    (await db
      .prepare(
        "SELECT * FROM activity_events WHERE lead_id = ? ORDER BY occurred_at DESC",
      )
      .all(id)) as unknown as ActivityRow[]
  ).map(mapActivity);
  const appendedTimeline: RelationshipEvent[] = operationalTimeline
    .filter((event) => !event.id.startsWith("seed-research-"))
    .map((event) => ({
      id: event.id,
      occurredAt: event.occurredAt,
      type: relationshipType(event.type),
      title: event.title,
      detail: event.detail,
      actor: event.actorId,
      nextAction:
        typeof event.metadata.nextAction === "string"
          ? event.metadata.nextAction
          : undefined,
      evidenceIds: Array.isArray(event.metadata.evidenceIds)
        ? (event.metadata.evidenceIds as string[])
        : undefined,
    }));
  return {
    ...profile,
    operations: state,
    outreachHistory,
    operationalTimeline,
    relationshipTimeline: [...appendedTimeline, ...profile.relationshipTimeline].sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    ),
  };
}

export async function getLeadByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const db = await getDatabase();
  const row = (await db
    .prepare(
      `${leadJoinSql} WHERE lower(o.primary_email) = ? LIMIT 1`,
    )
    .get(normalized)) as unknown as LeadJoinedRow | undefined;
  return row ? getOperatingLeadProfile(row.id) : undefined;
}

export async function recordActivity(
  db: Db,
  event: Omit<ActivityEvent, "id" | "localDate"> & {
    id?: string;
    localDate?: string;
  },
) {
  const id = event.id ?? createId("evt");
  await db.prepare(`
    INSERT OR IGNORE INTO activity_events (
      id, lead_id, occurred_at, local_date, type, title, detail,
      actor_id, actor_type, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    event.leadId ?? null,
    event.occurredAt,
    event.localDate ?? toLocalDate(event.occurredAt),
    event.type,
    event.title,
    event.detail,
    event.actorId,
    event.actorType,
    JSON.stringify(event.metadata),
  );
  return id;
}

export async function recordAudit(
  db: Db,
  entry: Omit<AuditLogEntry, "id" | "occurredAt"> & {
    id?: string;
    occurredAt?: string;
  },
) {
  const id = entry.id ?? createId("audit");
  await db.prepare(`
    INSERT INTO audit_log (
      id, occurred_at, actor_id, actor_type, action, resource_type,
      resource_id, outcome, detail, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    entry.occurredAt ?? nowIso(),
    entry.actorId,
    entry.actorType,
    entry.action,
    entry.resourceType,
    entry.resourceId,
    entry.outcome,
    entry.detail,
    JSON.stringify(entry.metadata),
  );
  return id;
}

const lifecycleStatuses = new Set<LifecycleStatus>([
  "researched",
  "qualified",
  "ready-for-outreach",
  "contacted",
  "follow-up-due",
  "replied",
  "interested",
  "meeting-booked",
  "not-interested",
  "invalid-contact",
  "disqualified",
  "closed",
]);
const qualificationStatuses = new Set<QualificationStatus>([
  "pending-review",
  "qualified",
  "disqualified",
]);
const followUpStatuses = new Set<FollowUpStatus>([
  "not-required",
  "scheduled",
  "due",
  "completed",
  "paused",
]);

export async function updateLeadStatus(
  leadId: string,
  update: LeadStatusUpdate,
  actor: WorkspaceActor,
) {
  const current = await getOperatingLeadProfile(leadId);
  if (!current) return undefined;
  if (
    update.lifecycleStatus &&
    !lifecycleStatuses.has(update.lifecycleStatus)
  ) {
    throw new Error("Invalid lifecycle status.");
  }
  if (
    update.qualificationStatus &&
    !qualificationStatuses.has(update.qualificationStatus)
  ) {
    throw new Error("Invalid qualification status.");
  }
  if (
    update.followUpStatus &&
    !followUpStatuses.has(update.followUpStatus)
  ) {
    throw new Error("Invalid follow-up status.");
  }
  const timestamp = nowIso();
  const qualificationChanged =
    update.qualificationStatus &&
    update.qualificationStatus !== current.operations.qualificationStatus;
  const qualificationAt =
    update.qualificationStatus === "qualified" && qualificationChanged
      ? timestamp
      : current.operations.qualifiedAt;

  await withTransaction(async (db) => {
    await db.prepare(`
      UPDATE lead_operations SET
        lifecycle_status = ?,
        qualification_status = ?,
        qualification_reason = ?,
        email_verification_status = ?,
        email_provenance = ?,
        email_contact_type = ?,
        follow_up_status = ?,
        next_action = ?,
        next_action_due_at = ?,
        assigned_to = ?,
        internal_notes = ?,
        qualified_at = ?,
        qualified_local_date = ?,
        updated_at = ?
      WHERE lead_id = ?
    `).run(
      update.lifecycleStatus ?? current.operations.lifecycleStatus,
      update.qualificationStatus ?? current.operations.qualificationStatus,
      update.qualificationReason ?? current.operations.qualificationReason,
      update.emailVerificationStatus ??
        current.operations.emailVerificationStatus,
      update.emailProvenance ?? current.operations.emailProvenance,
      update.emailContactType ?? current.operations.emailContactType,
      update.followUpStatus ?? current.operations.followUpStatus,
      update.nextAction ?? current.operations.nextAction,
      update.nextActionDueAt === null
        ? null
        : update.nextActionDueAt ?? current.operations.nextActionDueAt ?? null,
      update.assignedTo === null
        ? null
        : update.assignedTo ?? current.operations.assignedTo ?? null,
      update.internalNotes ?? current.operations.internalNotes,
      qualificationAt ?? null,
      qualificationAt ? toLocalDate(qualificationAt) : null,
      timestamp,
      leadId,
    );
    await recordActivity(db, {
      leadId,
      occurredAt: timestamp,
      type: qualificationChanged ? "qualification" : "status-change",
      title: qualificationChanged
        ? `Qualification changed to ${update.qualificationStatus}`
        : "Lead operating record updated",
      detail: update.reason,
      actorId: actor.id,
      actorType: actor.actorType,
      metadata: {
        lifecycleStatus:
          update.lifecycleStatus ?? current.operations.lifecycleStatus,
        qualificationStatus:
          update.qualificationStatus ??
          current.operations.qualificationStatus,
        nextAction: update.nextAction ?? current.operations.nextAction,
      },
    });
    await recordAudit(db, {
      actorId: actor.id,
      actorType: actor.actorType,
      action: qualificationChanged
        ? "lead.qualification.update"
        : "lead.status.update",
      resourceType: "lead",
      resourceId: leadId,
      outcome: "success",
      detail: update.reason,
      metadata: {
        before: {
          lifecycleStatus: current.operations.lifecycleStatus,
          qualificationStatus: current.operations.qualificationStatus,
        },
        after: {
          lifecycleStatus:
            update.lifecycleStatus ?? current.operations.lifecycleStatus,
          qualificationStatus:
            update.qualificationStatus ??
            current.operations.qualificationStatus,
        },
      },
    });
  });
  return getOperatingLeadProfile(leadId);
}

function emptyPerformancePoint(date: string) {
  return {
    date,
    researched: 0,
    qualified: 0,
    emailReady: 0,
    contacted: 0,
    followUps: 0,
    replies: 0,
    positiveReplies: 0,
    meetings: 0,
    errors: 0,
  };
}

function recentLocalDates(days: number) {
  const dates: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
    dates.push(toLocalDate(date));
  }
  return [...new Set(dates)];
}

export async function getDailyDashboard(): Promise<DailyOutreachDashboard> {
  const db = await getDatabase();
  const today = toLocalDate();
  const target = Number(process.env.Q_INTELLIGENCE_DAILY_TARGET || 10);
  const scalar = async (sql: string, ...params: Array<string | number>) => {
    const row = (await db.prepare(sql).get(...params)) as unknown as { count: number };
    return Number(row?.count ?? 0);
  };
  const qualifiedAddedToday = await scalar(
    "SELECT count(*) AS count FROM lead_operations WHERE qualification_status = 'qualified' AND qualified_local_date = ?",
    today,
  );
  const emailReadyQualifiedToday = await scalar(
    `SELECT count(*) AS count FROM lead_operations
     WHERE qualification_status = 'qualified'
       AND email_verification_status IN ('verified', 'usable')
       AND qualified_local_date = ?`,
    today,
  );
  const totalEmailReadyQualified = await scalar(
    `SELECT count(*) AS count FROM lead_operations
     WHERE qualification_status = 'qualified'
       AND email_verification_status IN ('verified', 'usable')`,
  );
  const newBusinessesContactedToday = await scalar(
    `SELECT count(DISTINCT lead_id) AS count FROM outreach_actions
     WHERE first_sent_local_date = ?
       AND status IN ('sent', 'delivered', 'replied')`,
    today,
  );
  const followUpsCompletedToday = await scalar(
    `SELECT count(*) AS count FROM outreach_actions
     WHERE first_sent_local_date = ? AND message_version > 1
       AND status IN ('sent', 'delivered', 'replied')`,
    today,
  );
  const repliesReceivedToday = await scalar(
    `SELECT count(*) AS count FROM outreach_actions
     WHERE reply_date IS NOT NULL
       AND substr(reply_date, 1, 10) = ?`,
    today,
  );
  const positiveRepliesToday = await scalar(
    `SELECT count(*) AS count FROM activity_events
     WHERE local_date = ? AND type = 'reply'
       AND json_extract(metadata_json, '$.positive') = 1`,
    today,
  );
  const meetingsBookedToday = await scalar(
    `SELECT count(*) AS count FROM activity_events
     WHERE local_date = ? AND type = 'meeting'`,
    today,
  );
  const sendingErrorsToday = await scalar(
    `SELECT count(*) AS count FROM outreach_actions
     WHERE local_date = ? AND status = 'failed'`,
    today,
  );
  const readyQueueCount = await scalar(
    `SELECT count(*) AS count FROM lead_operations
     WHERE lifecycle_status = 'ready-for-outreach'
       AND email_verification_status IN ('verified', 'usable')`,
  );
  const followUpDueCount = await scalar(
    `SELECT count(*) AS count FROM lead_operations
     WHERE lifecycle_status = 'follow-up-due'
        OR follow_up_status = 'due'`,
  );

  const dates = recentLocalDates(14);
  const performance = new Map(
    dates.map((date) => [date, emptyPerformancePoint(date)]),
  );
  const activityRows = (await db
    .prepare(
      `SELECT local_date, type, metadata_json FROM activity_events
       WHERE local_date >= ? ORDER BY local_date ASC`,
    )
    .all(dates[0])) as unknown as Array<{
    local_date: string;
    type: ActivityEvent["type"];
    metadata_json: string;
  }>;
  for (const row of activityRows) {
    const point = performance.get(row.local_date);
    if (!point) continue;
    const metadata = parseJson<Record<string, unknown>>(row.metadata_json, {});
    if (row.type === "lead-created" || row.type === "research") point.researched += 1;
    if (row.type === "qualification") point.qualified += 1;
    if (row.type === "reply") {
      point.replies += 1;
      if (metadata.positive === true || metadata.positive === 1) {
        point.positiveReplies += 1;
      }
    }
    if (row.type === "meeting") point.meetings += 1;
    if (row.type === "error") point.errors += 1;
  }
  const operationRows = (await db
    .prepare(
      `SELECT qualified_local_date, email_verification_status
       FROM lead_operations WHERE qualified_local_date >= ?`,
    )
    .all(dates[0])) as unknown as Array<{
    qualified_local_date: string;
    email_verification_status: string;
  }>;
  for (const row of operationRows) {
    const point = performance.get(row.qualified_local_date);
    if (!point) continue;
    point.qualified += 1;
    if (["verified", "usable"].includes(row.email_verification_status)) {
      point.emailReady += 1;
    }
  }
  const outreachRows = (await db
    .prepare(
      `SELECT first_sent_local_date, message_version, status
       FROM outreach_actions
       WHERE first_sent_local_date >= ?
         AND status IN ('sent', 'delivered', 'replied')`,
    )
    .all(dates[0])) as unknown as Array<{
    first_sent_local_date: string;
    message_version: number;
    status: string;
  }>;
  for (const row of outreachRows) {
    const point = performance.get(row.first_sent_local_date);
    if (!point) continue;
    if (row.message_version > 1) point.followUps += 1;
    else point.contacted += 1;
  }

  return {
    date: today,
    timezone: workspaceTimezone,
    target,
    qualifiedAddedToday,
    emailReadyQualifiedToday,
    totalEmailReadyQualified,
    newBusinessesContactedToday,
    remainingToTarget: Math.max(target - newBusinessesContactedToday, 0),
    targetAchieved: newBusinessesContactedToday >= target,
    followUpsCompletedToday,
    repliesReceivedToday,
    positiveRepliesToday,
    meetingsBookedToday,
    sendingErrorsToday,
    readyQueueCount,
    followUpDueCount,
    performance: [...performance.values()],
  };
}

export async function listAuditLog(limit = 100): Promise<AuditLogEntry[]> {
  const safeLimit = Math.min(250, Math.max(1, limit));
  const rows = (await (await getDatabase())
    .prepare("SELECT * FROM audit_log ORDER BY occurred_at DESC LIMIT ?")
    .all(safeLimit)) as unknown as Array<{
    id: string;
    occurred_at: string;
    actor_id: string;
    actor_type: AuditLogEntry["actorType"];
    action: string;
    resource_type: string;
    resource_id: string;
    outcome: AuditLogEntry["outcome"];
    detail: string;
    metadata_json: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    occurredAt: row.occurred_at,
    actorId: row.actor_id,
    actorType: row.actor_type,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    outcome: row.outcome,
    detail: row.detail,
    metadata: parseJson(row.metadata_json, {}),
  }));
}

export async function getResearchBatch(id: string): Promise<ResearchBatch | undefined> {
  const db = await getDatabase();
  const row = (await db
    .prepare("SELECT * FROM research_batches WHERE id = ?")
    .get(id)) as unknown as
    | {
        id: string;
        status: ResearchBatch["status"];
        target_email_ready: number;
        started_at: string;
        completed_at: string | null;
        actor_id: string;
        actor_type: ResearchBatch["actorType"];
      }
    | undefined;
  if (!row) return undefined;
  const counts = (await db
    .prepare(`
      SELECT
        count(*) AS total_added,
        sum(CASE WHEN qualification_status = 'qualified' THEN 1 ELSE 0 END) AS qualified_count,
        sum(CASE WHEN qualification_status = 'qualified'
          AND email_verification_status IN ('verified', 'usable')
          THEN 1 ELSE 0 END) AS email_ready_count
      FROM lead_operations WHERE source_batch_id = ?
    `)
    .get(id)) as unknown as {
    total_added: number;
    qualified_count: number;
    email_ready_count: number;
  };
  const emailReady = Number(counts.email_ready_count ?? 0);
  return {
    id: row.id,
    status: row.status,
    targetEmailReady: row.target_email_ready,
    totalAdded: Number(counts.total_added ?? 0),
    qualifiedCount: Number(counts.qualified_count ?? 0),
    emailReadyQualifiedCount: emailReady,
    remainingEmailReady: Math.max(row.target_email_ready - emailReady, 0),
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    actorId: row.actor_id,
    actorType: row.actor_type,
  };
}

export async function getLatestResearchBatch() {
  const row = (await (await getDatabase())
    .prepare(
      "SELECT id FROM research_batches ORDER BY started_at DESC LIMIT 1",
    )
    .get()) as unknown as { id: string } | undefined;
  return row ? getResearchBatch(row.id) : undefined;
}

export async function startResearchBatch(actor: WorkspaceActor) {
  const timestamp = nowIso();
  const id = createId("batch");
  await withTransaction(async (db) => {
    await db.prepare(`
      INSERT INTO research_batches (
        id, status, target_email_ready, started_at, completed_at, actor_id, actor_type
      ) VALUES (?, 'active', 10, ?, NULL, ?, ?)
    `).run(id, timestamp, actor.id, actor.actorType);
    await recordAudit(db, {
      actorId: actor.id,
      actorType: actor.actorType,
      action: "research.batch.start",
      resourceType: "research-batch",
      resourceId: id,
      outcome: "success",
      detail: "A research cycle was started with a minimum of 10 qualified, email-ready leads.",
      metadata: { targetEmailReady: 10 },
    });
  });
  return (await getResearchBatch(id))!;
}

export async function completeResearchBatch(id: string, actor: WorkspaceActor) {
  const batch = await getResearchBatch(id);
  if (!batch) return { status: "not-found" as const };
  if (batch.emailReadyQualifiedCount < batch.targetEmailReady) {
    await withTransaction(async (db) => {
      await recordAudit(db, {
        actorId: actor.id,
        actorType: actor.actorType,
        action: "research.batch.complete",
        resourceType: "research-batch",
        resourceId: id,
        outcome: "blocked",
        detail: `Completion blocked: ${batch.remainingEmailReady} more qualified, email-ready lead${batch.remainingEmailReady === 1 ? " is" : "s are"} required.`,
        metadata: { batch },
      });
    });
    return { status: "blocked" as const, batch };
  }
  const timestamp = nowIso();
  await withTransaction(async (db) => {
    await db.prepare(
      "UPDATE research_batches SET status = 'complete', completed_at = ? WHERE id = ?",
    ).run(timestamp, id);
    await recordAudit(db, {
      actorId: actor.id,
      actorType: actor.actorType,
      action: "research.batch.complete",
      resourceType: "research-batch",
      resourceId: id,
      outcome: "success",
      detail: "The research cycle met the 10-lead email-ready quality gate.",
      metadata: { batch },
    });
  });
  return { status: "complete" as const, batch: (await getResearchBatch(id))! };
}

export async function getOutreachByIdempotencyKey(key: string) {
  const row = (await (await getDatabase())
    .prepare("SELECT * FROM outreach_actions WHERE idempotency_key = ?")
    .get(key)) as unknown as OutreachRow | undefined;
  return row ? mapOutreach(row) : undefined;
}

export async function getOutreachById(id: string) {
  const row = (await (await getDatabase())
    .prepare("SELECT * FROM outreach_actions WHERE id = ?")
    .get(id)) as unknown as OutreachRow | undefined;
  return row ? mapOutreach(row) : undefined;
}
