import "server-only";

import { readFileSync } from "node:fs";

import type {
  InstantlyAccountOption,
  InstantlyCampaignOption,
  InstantlyOptions,
} from "@/lib/operating-types";
import { nowIso } from "@/lib/server/time";

const defaultBaseUrl = "https://api.instantly.ai/api/v2";

interface InstantlyList<T> {
  items: T[];
  next_starting_after?: string | null;
}

interface InstantlyAccount {
  email: string;
  status: number;
  warmup_status: number;
  stat_warmup_score?: number | null;
  setup_pending: boolean;
  daily_limit?: number | null;
  timestamp_last_used?: string | null;
  status_message?: {
    code?: string;
    e_message?: string;
    responseCode?: number;
  } | null;
}

interface InstantlyCampaign {
  id: string;
  name: string;
  status: number;
  not_sending_status?: number | null;
  email_list?: string[];
  daily_limit?: number | null;
  daily_max_leads?: number | null;
  stop_on_reply?: boolean | null;
  sequences?: Array<{
    steps?: Array<{
      type?: string;
      variants?: Array<{
        subject?: string;
        body?: string;
        v_disabled?: boolean;
      }>;
    }>;
  }>;
}

export interface InstantlyLead {
  id: string;
  email: string;
  campaign?: string | null;
  status?: number;
  email_reply_count?: number;
  interest_status?: number;
  timestamp_created?: string;
  timestamp_updated?: string;
}

export interface InstantlyEmail {
  id: string;
  timestamp_created: string;
  timestamp_email?: string;
  subject?: string;
  to_address_email_list?: string;
  body?: { text?: string; html?: string };
  from_address_email?: string;
  campaign_id?: string;
  lead?: string;
  lead_id?: string;
  eaccount?: string;
  is_auto_reply?: number;
  content_preview?: string;
  thread_id?: string;
}

export class InstantlyApiError extends Error {
  status: number;
  code: string;
  retryable: boolean;

  constructor(
    message: string,
    status: number,
    code = "instantly_api_error",
  ) {
    super(message);
    this.name = "InstantlyApiError";
    this.status = status;
    this.code = code;
    this.retryable = status === 429 || status >= 500;
  }
}

function apiKey() {
  const directKey = process.env.INSTANTLY_API_KEY?.trim();
  if (directKey) return directKey;

  const credentialFile = process.env.INSTANTLY_API_KEY_FILE?.trim();
  if (!credentialFile) return undefined;

  const variableName =
    process.env.INSTANTLY_API_KEY_FILE_VARIABLE?.trim() || "INSTANTLY_API_KEY";
  if (!/^[A-Z][A-Z0-9_]*$/.test(variableName)) {
    throw new InstantlyApiError(
      "The Instantly credential variable name is invalid.",
      503,
      "invalid_instantly_credential_variable",
    );
  }

  let contents: string;
  try {
    contents = readFileSync(credentialFile, "utf8");
  } catch {
    throw new InstantlyApiError(
      "The Instantly credential file could not be read.",
      503,
      "instantly_credential_file_unavailable",
    );
  }

  for (const sourceLine of contents.split(/\r?\n/)) {
    const line = sourceLine.trim().replace(/^export\s+/, "");
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator < 1 || line.slice(0, separator).trim() !== variableName) {
      continue;
    }

    const rawValue = line.slice(separator + 1).trim();
    const quoted =
      rawValue.length >= 2 &&
      ((rawValue.startsWith('"') && rawValue.endsWith('"')) ||
        (rawValue.startsWith("'") && rawValue.endsWith("'")));
    return (quoted ? rawValue.slice(1, -1) : rawValue).trim() || undefined;
  }

  return undefined;
}

function baseUrl() {
  const configured = process.env.INSTANTLY_API_BASE_URL?.trim();
  if (!configured) return defaultBaseUrl;
  const parsed = new URL(configured);
  if (
    process.env.NODE_ENV === "production" &&
    (parsed.protocol !== "https:" || parsed.hostname !== "api.instantly.ai")
  ) {
    throw new InstantlyApiError(
      "Production Instantly requests must use https://api.instantly.ai.",
      503,
      "invalid_instantly_base_url",
    );
  }
  return configured.replace(/\/+$/, "");
}

function approvedValues(name: string) {
  return new Set(
    (process.env[name] ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function instantlyRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const key = apiKey();
  if (!key) {
    throw new InstantlyApiError(
      "Instantly is not configured.",
      503,
      "instantly_not_configured",
    );
  }
  let lastError: InstantlyApiError | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl()}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      if (response.ok) {
        if (response.status === 204) return undefined as T;
        return (await response.json()) as T;
      }
      let providerMessage = `Instantly returned HTTP ${response.status}.`;
      try {
        const payload = (await response.json()) as {
          message?: string;
          error?: string;
          statusCode?: number;
        };
        providerMessage =
          payload.message || payload.error || providerMessage;
      } catch {
        // Do not copy arbitrary provider response bodies into logs or errors.
      }
      const error = new InstantlyApiError(
        providerMessage,
        response.status,
        response.status === 429
          ? "instantly_rate_limited"
          : "instantly_request_failed",
      );
      if (!error.retryable || attempt === 2) throw error;
      lastError = error;
      const retryAfter = Number(response.headers.get("retry-after") ?? 0);
      await delay(
        retryAfter > 0
          ? Math.min(retryAfter * 1000, 5000)
          : 500 * 2 ** attempt,
      );
    } catch (error) {
      if (error instanceof InstantlyApiError) {
        if (!error.retryable || attempt === 2) throw error;
        lastError = error;
      } else {
        lastError = new InstantlyApiError(
          "Instantly could not be reached. The local lead record was preserved.",
          503,
          "instantly_network_error",
        );
        if (attempt === 2) throw lastError;
      }
      await delay(500 * 2 ** attempt);
    }
  }
  throw (
    lastError ??
    new InstantlyApiError(
      "Instantly request failed.",
      503,
      "instantly_request_failed",
    )
  );
}

async function listAll<T>(
  path: string,
  limitPages = 10,
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < limitPages; page += 1) {
    const query = new URLSearchParams({ limit: "100" });
    if (cursor) query.set("starting_after", cursor);
    const response = await instantlyRequest<InstantlyList<T>>(
      `${path}?${query.toString()}`,
    );
    items.push(...response.items);
    if (!response.next_starting_after) break;
    cursor = response.next_starting_after;
  }
  return items;
}

function accountStatusLabel(status: number) {
  return (
    {
      1: "Active",
      2: "Paused",
      3: "Temporarily paused",
      [-1]: "Connection error",
      [-2]: "Soft-bounce error",
      [-3]: "Sending error",
    }[status] ?? `Unknown (${status})`
  );
}

function warmupStatusLabel(status: number) {
  return (
    {
      1: "Active",
      0: "Paused",
      [-1]: "Banned",
      [-2]: "Spam-folder status unknown",
      [-3]: "Permanently suspended",
    }[status] ?? `Unknown (${status})`
  );
}

function campaignStatusLabel(status: number) {
  return (
    {
      [-99]: "Account suspended",
      [-1]: "Accounts unhealthy",
      [-2]: "Bounce protection",
      0: "Draft",
      1: "Active",
      2: "Paused",
      3: "Completed",
      4: "Running subsequences",
    }[status] ?? `Unknown (${status})`
  );
}

function templateReady(campaign: InstantlyCampaign) {
  const variants =
    campaign.sequences?.[0]?.steps
      ?.filter((step) => step.type === "email")
      .flatMap((step) => step.variants ?? [])
      .filter((variant) => !variant.v_disabled) ?? [];
  return variants.some(
    (variant) =>
      variant.subject?.includes("{{qm_subject}}") &&
      variant.body?.includes("{{qm_body}}"),
  );
}

function mapAccount(
  account: InstantlyAccount,
  approvedSenders: Set<string>,
): InstantlyAccountOption {
  const approved = approvedSenders.has(account.email.toLowerCase());
  const minimumWarmupScore = Number(
    process.env.INSTANTLY_MIN_WARMUP_SCORE || 75,
  );
  const reasons: string[] = [];
  if (!approved) reasons.push("Not on the Q Intelligence sender allowlist.");
  if (account.status !== 1) {
    reasons.push(`Account status is ${accountStatusLabel(account.status)}.`);
  }
  if (account.setup_pending) reasons.push("Account setup is still pending.");
  if (account.warmup_status !== 1) {
    reasons.push(
      `Warmup status is ${warmupStatusLabel(account.warmup_status)}.`,
    );
  }
  if (
    typeof account.stat_warmup_score !== "number" ||
    account.stat_warmup_score < minimumWarmupScore
  ) {
    reasons.push(
      typeof account.stat_warmup_score === "number"
        ? `Warmup score ${account.stat_warmup_score} is below the required ${minimumWarmupScore}.`
        : "No current warmup score is available.",
    );
  }
  if (account.status_message?.code || account.status_message?.e_message) {
    reasons.push("Instantly reports an account error.");
  }
  const healthy =
    account.status === 1 &&
    !account.setup_pending &&
    account.warmup_status === 1 &&
    typeof account.stat_warmup_score === "number" &&
    account.stat_warmup_score >= minimumWarmupScore &&
    !account.status_message?.code &&
    !account.status_message?.e_message;
  return {
    email: account.email,
    status: account.status,
    statusLabel: accountStatusLabel(account.status),
    warmupStatus: account.warmup_status,
    warmupStatusLabel: warmupStatusLabel(account.warmup_status),
    warmupScore: account.stat_warmup_score ?? undefined,
    setupPending: account.setup_pending,
    approved,
    healthy,
    eligible: approved && healthy,
    eligibilityReasons:
      reasons.length > 0 ? reasons : ["Approved, active, warmed, and healthy."],
    dailyLimit: account.daily_limit ?? undefined,
    lastUsedAt: account.timestamp_last_used ?? undefined,
  };
}

function mapCampaign(
  campaign: InstantlyCampaign,
  approvedCampaigns: Set<string>,
  accounts: InstantlyAccountOption[],
): InstantlyCampaignOption {
  const approved = approvedCampaigns.has(campaign.id.toLowerCase());
  const senders = campaign.email_list ?? [];
  const reasons: string[] = [];
  const readyTemplate = templateReady(campaign);
  const selectedSender = senders.length === 1 ? senders[0] : undefined;
  const senderOption = selectedSender
    ? accounts.find(
        (account) =>
          account.email.toLowerCase() === selectedSender.toLowerCase(),
      )
    : undefined;
  if (!approved) reasons.push("Campaign is not on the Q Intelligence allowlist.");
  if (campaign.status !== 1) {
    reasons.push(`Campaign status is ${campaignStatusLabel(campaign.status)}.`);
  }
  if (campaign.not_sending_status === 99) {
    reasons.push("Instantly reports that this campaign is not sending due to an error.");
  }
  if (senders.length !== 1) {
    reasons.push(
      senders.length === 0
        ? "Campaign has no sending account."
        : "Campaign has multiple sending accounts; Q Intelligence cannot truthfully guarantee the selected sender.",
    );
  }
  if (selectedSender && !senderOption?.eligible) {
    reasons.push(
      "The campaign's sending account is not approved and healthy in Q Intelligence.",
    );
  }
  if (!readyTemplate) {
    reasons.push(
      "The active email variant must use {{qm_subject}} as its subject and {{qm_body}} in its body.",
    );
  }
  const active = campaign.status === 1 && campaign.not_sending_status !== 99;
  return {
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    statusLabel: campaignStatusLabel(campaign.status),
    approved,
    active,
    senderAccounts: senders,
    selectedSender,
    templateReady: readyTemplate,
    eligible:
      approved &&
      active &&
      senders.length === 1 &&
      Boolean(senderOption?.eligible) &&
      readyTemplate,
    eligibilityReasons:
      reasons.length > 0
        ? reasons
        : ["Approved active campaign with one eligible sender and the required personalization template."],
    dailyLimit: campaign.daily_limit ?? undefined,
    dailyMaxLeads: campaign.daily_max_leads ?? undefined,
    stopOnReply: campaign.stop_on_reply ?? undefined,
  };
}

export async function getInstantlyOptions(): Promise<InstantlyOptions> {
  const timestamp = nowIso();
  if (!apiKey()) {
    return {
      configured: false,
      connectionState: "not-configured",
      lastCheckedAt: timestamp,
      webhookConfigured: false,
      accounts: [],
      campaigns: [],
      message:
        "Set INSTANTLY_API_KEY and explicit campaign/sender allowlists on the server.",
    };
  }
  try {
    const [rawAccounts, rawCampaigns] = await Promise.all([
      listAll<InstantlyAccount>("/accounts"),
      listAll<InstantlyCampaign>("/campaigns"),
    ]);
    const approvedSenders = approvedValues(
      "INSTANTLY_APPROVED_SENDER_ACCOUNTS",
    );
    const approvedCampaigns = approvedValues(
      "INSTANTLY_APPROVED_CAMPAIGN_IDS",
    );
    const accounts = rawAccounts.map((account) =>
      mapAccount(account, approvedSenders),
    );
    const campaigns = rawCampaigns.map((campaign) =>
      mapCampaign(campaign, approvedCampaigns, accounts),
    );
    return {
      configured: true,
      connectionState: "connected",
      lastCheckedAt: timestamp,
      webhookConfigured: Boolean(
        process.env.INSTANTLY_WEBHOOK_SECRET?.trim(),
      ),
      accounts,
      campaigns,
      message:
        approvedSenders.size === 0 || approvedCampaigns.size === 0
          ? "The API connection works, but explicit sender and campaign allowlists are required before outreach."
          : undefined,
    };
  } catch (error) {
    return {
      configured: true,
      connectionState: "error",
      lastCheckedAt: timestamp,
      webhookConfigured: Boolean(
        process.env.INSTANTLY_WEBHOOK_SECRET?.trim(),
      ),
      accounts: [],
      campaigns: [],
      message:
        error instanceof InstantlyApiError
          ? error.message
          : "Instantly connection check failed.",
    };
  }
}

export async function createInstantlyLead(input: {
  campaignId: string;
  email: string;
  companyName: string;
  website?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  subject: string;
  messageBody: string;
  qIntelligenceLeadId: string;
  senderAccount: string;
  personalizationVariables: Record<string, string>;
}) {
  return instantlyRequest<InstantlyLead>("/leads", {
    method: "POST",
    body: JSON.stringify({
      campaign: input.campaignId,
      email: input.email,
      company_name: input.companyName,
      website: input.website || undefined,
      phone: input.phone || undefined,
      first_name: input.firstName || undefined,
      last_name: input.lastName || undefined,
      job_title: input.jobTitle || undefined,
      skip_if_in_workspace: false,
      skip_if_in_campaign: true,
      verify_leads_on_import: true,
      custom_variables: {
        qm_subject: input.subject,
        qm_body: input.messageBody,
        q_intelligence_lead_id: input.qIntelligenceLeadId,
        qm_approved_sender: input.senderAccount,
        ...input.personalizationVariables,
      },
    }),
  });
}

export async function listInstantlyEmails(input: {
  leadEmail: string;
  campaignId?: string;
  limit?: number;
}) {
  const query = new URLSearchParams({
    limit: String(Math.min(100, Math.max(1, input.limit ?? 25))),
    lead: input.leadEmail,
    mode: "emode_all",
    sort_order: "desc",
  });
  if (input.campaignId) query.set("campaign_id", input.campaignId);
  const response = await instantlyRequest<InstantlyList<InstantlyEmail>>(
    `/emails?${query.toString()}`,
  );
  return response.items;
}
