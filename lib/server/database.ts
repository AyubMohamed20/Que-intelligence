import "server-only";

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import verificationReport from "@/research/verified-leads-audit.json";
import { verifiedLeadProfiles } from "@/lib/verified-lead-data";
import type {
  EmailVerificationStatus,
  OpeningStatus,
} from "@/lib/operating-types";
import { calculateProfileQualityScore } from "@/lib/server/lead-scoring";
import { toLocalDate } from "@/lib/server/time";

declare global {
  var __qIntelligenceDatabase: DatabaseSync | undefined;
}

function databasePath() {
  const configured = process.env.Q_INTELLIGENCE_DB_PATH?.trim();
  if (!configured) {
    return join(
      /* turbopackIgnore: true */ process.cwd(),
      "data",
      "q-intelligence.sqlite",
    );
  }
  return isAbsolute(configured)
    ? configured
    : join(/* turbopackIgnore: true */ process.cwd(), configured);
}

function migrate(db: DatabaseSync) {
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS lead_profiles (
      id TEXT PRIMARY KEY,
      profile_json TEXT NOT NULL,
      source_kind TEXT NOT NULL,
      source_actor_type TEXT NOT NULL,
      source_actor_id TEXT NOT NULL,
      source_batch_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lead_operations (
      lead_id TEXT PRIMARY KEY REFERENCES lead_profiles(id) ON DELETE CASCADE,
      lifecycle_status TEXT NOT NULL,
      qualification_status TEXT NOT NULL,
      qualification_reason TEXT NOT NULL,
      opening_status TEXT NOT NULL,
      opening_date TEXT,
      opening_date_confidence TEXT NOT NULL,
      primary_email TEXT,
      email_provenance TEXT NOT NULL,
      email_verification_status TEXT NOT NULL,
      email_contact_type TEXT NOT NULL,
      email_last_verified_at TEXT,
      added_at TEXT NOT NULL,
      added_local_date TEXT NOT NULL,
      qualified_at TEXT,
      qualified_local_date TEXT,
      last_contact_at TEXT,
      last_reply_at TEXT,
      reply_status TEXT NOT NULL,
      follow_up_status TEXT NOT NULL,
      next_action TEXT NOT NULL,
      next_action_due_at TEXT,
      assigned_to TEXT,
      internal_notes TEXT NOT NULL DEFAULT '',
      source_actor_type TEXT NOT NULL,
      source_actor_id TEXT NOT NULL,
      source_batch_id TEXT,
      quality_score_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outreach_actions (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL REFERENCES lead_profiles(id) ON DELETE CASCADE,
      idempotency_key TEXT NOT NULL UNIQUE,
      request_fingerprint TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      sender_account TEXT NOT NULL,
      instantly_campaign_id TEXT NOT NULL,
      instantly_campaign_name TEXT NOT NULL,
      subject TEXT NOT NULL,
      message_body TEXT NOT NULL,
      message_version INTEGER NOT NULL,
      personalization_json TEXT NOT NULL,
      evidence_ids_json TEXT NOT NULL,
      approved_by TEXT NOT NULL,
      approved_at TEXT NOT NULL,
      status TEXT NOT NULL,
      instantly_lead_id TEXT,
      instantly_email_id TEXT,
      delivery_status TEXT NOT NULL,
      reply_status TEXT NOT NULL,
      reply_date TEXT,
      latest_response TEXT,
      follow_up_status TEXT NOT NULL,
      next_action TEXT NOT NULL,
      error_code TEXT,
      error_message TEXT,
      first_sent_at TEXT,
      first_sent_local_date TEXT,
      local_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS outreach_actions_lead_idx
      ON outreach_actions(lead_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS outreach_actions_sent_date_idx
      ON outreach_actions(first_sent_local_date, lead_id);

    CREATE TABLE IF NOT EXISTS activity_events (
      id TEXT PRIMARY KEY,
      lead_id TEXT REFERENCES lead_profiles(id) ON DELETE CASCADE,
      occurred_at TEXT NOT NULL,
      local_date TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      metadata_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS activity_events_lead_idx
      ON activity_events(lead_id, occurred_at DESC);
    CREATE INDEX IF NOT EXISTS activity_events_date_idx
      ON activity_events(local_date, type);

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      occurred_at TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      outcome TEXT NOT NULL,
      detail TEXT NOT NULL,
      metadata_json TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS audit_log_resource_idx
      ON audit_log(resource_type, resource_id, occurred_at DESC);

    CREATE TABLE IF NOT EXISTS research_batches (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      target_email_ready INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      actor_id TEXT NOT NULL,
      actor_type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      received_at TEXT NOT NULL,
      event_type TEXT NOT NULL,
      lead_email TEXT,
      campaign_id TEXT,
      processed INTEGER NOT NULL,
      error_message TEXT,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function inferOpeningStatus(
  signalType: string | undefined,
  title: string | undefined,
): OpeningStatus {
  const text = `${signalType ?? ""} ${title ?? ""}`.toLowerCase();
  if (text.includes("relocat")) return "relocating";
  if (text.includes("rebrand")) return "rebranding";
  if (text.includes("reopen")) return "reopening";
  if (text.includes("renovat")) return "renovating";
  if (text.includes("expan")) return "expanding";
  if (text.includes("service")) return "new-service";
  if (text.includes("opening") || signalType === "opening") return "recently-opened";
  return "established";
}

function seedVerifiedProfiles(db: DatabaseSync) {
  const verificationById = new Map(
    (verificationReport.audits as Array<{
      id: string;
      contactVerification?: {
        email?: { listedOnWebsite?: boolean } | null;
      };
    }>).map((audit) => [audit.id, audit]),
  );
  const insertProfile = db.prepare(`
    INSERT INTO lead_profiles (
      id, profile_json, source_kind, source_actor_type, source_actor_id,
      source_batch_id, created_at, updated_at
    ) VALUES (?, ?, 'verified-snapshot', 'system', 'verified-research-pipeline', NULL, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      profile_json = excluded.profile_json,
      updated_at = excluded.updated_at
    WHERE lead_profiles.source_kind = 'verified-snapshot'
  `);
  const insertOperations = db.prepare(`
    INSERT OR IGNORE INTO lead_operations (
      lead_id, lifecycle_status, qualification_status, qualification_reason,
      opening_status, opening_date, opening_date_confidence, primary_email,
      email_provenance, email_verification_status, email_contact_type,
      email_last_verified_at, added_at, added_local_date, qualified_at,
      qualified_local_date, last_contact_at, last_reply_at, reply_status,
      follow_up_status, next_action, next_action_due_at, assigned_to,
      internal_notes, source_actor_type, source_actor_id, source_batch_id,
      quality_score_json, created_at, updated_at
    ) VALUES (
      ?, ?, 'qualified', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      NULL, NULL, 'none', 'not-required', ?, NULL, NULL, '',
      'system', 'verified-research-pipeline', NULL, ?, ?, ?
    )
  `);
  const insertActivity = db.prepare(`
    INSERT OR IGNORE INTO activity_events (
      id, lead_id, occurred_at, local_date, type, title, detail,
      actor_id, actor_type, metadata_json
    ) VALUES (?, ?, ?, ?, 'research', ?, ?, 'verified-research-pipeline', 'system', ?)
  `);

  db.exec("BEGIN IMMEDIATE");
  try {
    for (const profile of verifiedLeadProfiles) {
      const emailChannel = profile.contactChannels.find(
        (channel) => channel.kind === "email",
      );
      const audit = verificationById.get(profile.id);
      const emailStatus: EmailVerificationStatus = emailChannel
        ? audit?.contactVerification?.email?.listedOnWebsite
          ? "verified"
          : emailChannel.label.toLowerCase().includes("confirm")
            ? "unverified"
            : "usable"
        : "unavailable";
      const addedAt =
        [...profile.sources]
          .map((source) => source.capturedAt)
          .sort()[0] ?? profile.lastEnrichedAt;
      // Some derived competitor/source entries are stamped when a profile is
      // rebuilt. The cohort's stable first-capture date is the truthful
      // qualification baseline and avoids treating an application restart as
      // newly qualified research.
      const qualifiedAt = addedAt;
      const openingStatus = inferOpeningStatus(
        profile.whyNowSignals[0]?.type,
        profile.whyNowSignals[0]?.title,
      );
      const openingDate = profile.whyNowSignals[0]?.occurredAt;
      const qualityScore = calculateProfileQualityScore(profile, emailStatus);
      const lifecycleStatus =
        emailStatus === "verified" || emailStatus === "usable"
          ? "ready-for-outreach"
          : "qualified";
      const operationalNextAction =
        emailStatus === "verified" || emailStatus === "usable"
          ? "Review the evidence and email draft, then approve an eligible Instantly campaign and sender."
          : "Find or request a verified business email without guessing.";

      insertProfile.run(
        profile.id,
        JSON.stringify(profile),
        addedAt,
        profile.lastEnrichedAt,
      );
      insertOperations.run(
        profile.id,
        lifecycleStatus,
        "The profile passed the existing identity, source, public-contact, social, duplicate, and outreach-quality gates.",
        openingStatus,
        openingDate ?? null,
        openingDate ? "high" : "low",
        emailChannel?.value ?? null,
        emailChannel ? "official" : "unavailable",
        emailStatus,
        emailChannel
          ? emailChannel.value.split("@")[0].includes(".")
            ? "personal-business"
            : "role-based"
          : "unknown",
        emailStatus === "verified" ? profile.lastEnrichedAt : null,
        addedAt,
        toLocalDate(addedAt),
        qualifiedAt,
        toLocalDate(qualifiedAt),
        operationalNextAction,
        JSON.stringify(qualityScore),
        addedAt,
        profile.lastEnrichedAt,
      );
      insertActivity.run(
        `seed-research-${profile.id}`,
        profile.id,
        addedAt,
        toLocalDate(addedAt),
        "Verified research record added",
        `${profile.sources.length} source records and ${profile.evidence.length} evidence records entered the verified cohort.`,
        JSON.stringify({ sourceCount: profile.sources.length }),
      );
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function createDatabase() {
  const path = databasePath();
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  migrate(db);
  seedVerifiedProfiles(db);
  return db;
}

export function getDatabase() {
  if (!globalThis.__qIntelligenceDatabase) {
    globalThis.__qIntelligenceDatabase = createDatabase();
  }
  return globalThis.__qIntelligenceDatabase;
}

export function withTransaction<T>(operation: (db: DatabaseSync) => T): T {
  const db = getDatabase();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = operation(db);
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function createId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}
