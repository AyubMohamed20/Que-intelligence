import "server-only";

import { createHash } from "node:crypto";
import { isIP } from "node:net";
import type {
  ActivityEvent,
  EmailContactType,
  EmailProvenance,
  EmailVerificationStatus,
  OperationalLeadState,
  ResearchLeadInput,
} from "@/lib/operating-types";
import type {
  Confidence,
  ContactChannel,
  Evidence,
  LeadProfile,
  ScoreCard,
  Source,
  SourceKind,
} from "@/lib/types";
import type { WorkspaceActor } from "@/lib/server/auth";
import {
  createId,
  getDatabase,
  withTransaction,
} from "@/lib/server/database";
import {
  calculateResearchInputQualityScore,
} from "@/lib/server/lead-scoring";
import {
  getOperatingLeadProfile,
  listOperatingLeadSummaries,
  recordActivity,
  recordAudit,
} from "@/lib/server/lead-repository";
import { isIsoDate, nowIso, toLocalDate } from "@/lib/server/time";

export interface ResearchValidationIssue {
  path: string;
  message: string;
}

export interface ResearchIngestionResult {
  operation: "created" | "updated";
  lead: LeadProfile;
  state: OperationalLeadState;
  duplicateSignals: string[];
  warnings: string[];
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const excludedCategoryPattern =
  /\b(public school|school board|hospital|government|government department|public agency|municipal department|crown corporation)\b/i;
const confidenceValues = ["low", "medium", "high"];
const priorityValues = ["low", "medium", "high", "urgent"];
const openingStatusValues = [
  "opening-soon",
  "recently-opened",
  "established",
  "relocating",
  "rebranding",
  "expanding",
  "reopening",
  "renovating",
  "new-service",
  "unknown",
];
const evidenceKindValues = [
  "official-website",
  "official-social",
  "google-business",
  "local-news",
  "directory",
  "press-release",
  "municipal",
  "commercial-development",
  "community",
  "other",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function publicHttpUrl(value: string) {
  if (!validHttpUrl(value)) return false;
  const { hostname } = new URL(value);
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  ) {
    return false;
  }
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split(".").map(Number);
    if (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return false;
    }
  }
  if (isIP(normalized) === 6) {
    if (
      normalized === "::1" ||
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    ) {
      return false;
    }
  }
  return true;
}

function validateScoreInputs(
  value: unknown,
  issues: ResearchValidationIssue[],
) {
  const keys = [
    "recency",
    "openingOrExpansion",
    "marketingNeed",
    "queMediaFit",
    "decisionMakerAccess",
    "emailReliability",
    "socialOpportunity",
    "websiteOpportunity",
    "likelyBudget",
    "businessScale",
    "urgency",
    "evidenceStrength",
  ];
  if (!isRecord(value)) {
    issues.push({
      path: "scoreInputs",
      message: "scoreInputs is required.",
    });
    return;
  }
  for (const key of keys) {
    const score = value[key];
    if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 5) {
      issues.push({
        path: `scoreInputs.${key}`,
        message: "Use a numeric rubric value from 0 to 5.",
      });
    }
  }
}

export function validateResearchLeadInput(
  value: unknown,
): { valid: boolean; issues: ResearchValidationIssue[]; input?: ResearchLeadInput } {
  const issues: ResearchValidationIssue[] = [];
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{ path: "$", message: "Request body must be a JSON object." }],
    };
  }
  if (value.schemaVersion !== "1.0") {
    issues.push({
      path: "schemaVersion",
      message: 'schemaVersion must be "1.0".',
    });
  }
  if (!isRecord(value.business)) {
    issues.push({ path: "business", message: "business is required." });
  } else {
    for (const key of ["name", "category", "description", "status"]) {
      if (!text(value.business[key])) {
        issues.push({
          path: `business.${key}`,
          message: `${key} is required.`,
        });
      }
    }
    const website = text(value.business.website);
    if (website && !validHttpUrl(website)) {
      issues.push({
        path: "business.website",
        message: "website must be an http or https URL.",
      });
    }
    if (excludedCategoryPattern.test(text(value.business.category))) {
      issues.push({
        path: "business.category",
        message:
          "This category is outside Q Media's practical commercial client profile.",
      });
    }
    if (!openingStatusValues.includes(text(value.business.status))) {
      issues.push({
        path: "business.status",
        message: "Use a supported opening or business status.",
      });
    }
    const openingDate = text(value.business.openingDate);
    if (openingDate && !isIsoDate(openingDate)) {
      issues.push({
        path: "business.openingDate",
        message: "openingDate must be an ISO date.",
      });
    }
    if (
      value.business.openingDateConfidence !== undefined &&
      !confidenceValues.includes(text(value.business.openingDateConfidence))
    ) {
      issues.push({
        path: "business.openingDateConfidence",
        message: "Use low, medium, or high confidence.",
      });
    }
    const logoUrl = text(value.business.logoUrl);
    if (logoUrl && !validHttpUrl(logoUrl)) {
      issues.push({
        path: "business.logoUrl",
        message: "logoUrl must be an http or https URL.",
      });
    }
  }
  if (!isRecord(value.location)) {
    issues.push({ path: "location", message: "location is required." });
  } else if (!text(value.location.city)) {
    issues.push({ path: "location.city", message: "city is required." });
  }
  if (!Array.isArray(value.contacts)) {
    issues.push({ path: "contacts", message: "contacts must be an array." });
  } else {
    value.contacts.forEach((contact, index) => {
      if (!isRecord(contact)) {
        issues.push({
          path: `contacts[${index}]`,
          message: "contact must be an object.",
        });
        return;
      }
      const kind = text(contact.kind);
      const contactValue = text(contact.value);
      if (!["email", "phone", "contact-form"].includes(kind)) {
        issues.push({
          path: `contacts[${index}].kind`,
          message: "kind must be email, phone, or contact-form.",
        });
      }
      if (!contactValue) {
        issues.push({
          path: `contacts[${index}].value`,
          message: "value is required.",
        });
      }
      if (!text(contact.label)) {
        issues.push({
          path: `contacts[${index}].label`,
          message: "label is required.",
        });
      }
      if (
        !["official", "inferred", "third-party-listed", "unavailable"].includes(
          text(contact.provenance),
        )
      ) {
        issues.push({
          path: `contacts[${index}].provenance`,
          message: "Use a supported contact provenance.",
        });
      }
      if (
        ![
          "verified",
          "usable",
          "unverified",
          "invalid",
          "unavailable",
          "verified-public",
        ].includes(text(contact.verificationStatus))
      ) {
        issues.push({
          path: `contacts[${index}].verificationStatus`,
          message: "Use a supported verification status.",
        });
      }
      if (
        contact.contactType !== undefined &&
        ![
          "role-based",
          "personal-business",
          "general-business",
          "unknown",
        ].includes(text(contact.contactType))
      ) {
        issues.push({
          path: `contacts[${index}].contactType`,
          message: "Use a supported email contact type.",
        });
      }
      if (kind === "email" && !emailPattern.test(contactValue)) {
        issues.push({
          path: `contacts[${index}].value`,
          message: "Email format is invalid.",
        });
      }
      if (kind === "contact-form" && !validHttpUrl(contactValue)) {
        issues.push({
          path: `contacts[${index}].value`,
          message: "A contact form must be an http or https URL.",
        });
      }
      if (!Array.isArray(contact.evidenceUrls) || contact.evidenceUrls.length === 0) {
        issues.push({
          path: `contacts[${index}].evidenceUrls`,
          message: "Every contact must cite at least one evidence URL.",
        });
      }
      if (
        kind === "email" &&
        contact.provenance === "inferred" &&
        ["verified", "verified-public", "usable"].includes(
          text(contact.verificationStatus),
        )
      ) {
        issues.push({
          path: `contacts[${index}]`,
          message:
            "An inferred email cannot be marked verified or usable. Mark it unverified.",
        });
      }
    });
  }
  if (!Array.isArray(value.socialProfiles)) {
    issues.push({
      path: "socialProfiles",
      message: "socialProfiles must be an array.",
    });
  } else {
    value.socialProfiles.forEach((profile, index) => {
      if (!isRecord(profile)) {
        issues.push({
          path: `socialProfiles[${index}]`,
          message: "Social profile must be an object.",
        });
        return;
      }
      if (
        ![
          "instagram",
          "facebook",
          "tiktok",
          "linkedin",
          "x",
          "youtube",
        ].includes(text(profile.platform))
      ) {
        issues.push({
          path: `socialProfiles[${index}].platform`,
          message: "Use a supported social platform.",
        });
      }
      if (!validHttpUrl(text(profile.url))) {
        issues.push({
          path: `socialProfiles[${index}].url`,
          message: "Social profile URL must use http or https.",
        });
      }
    });
  }
  if (!Array.isArray(value.decisionMakers)) {
    issues.push({
      path: "decisionMakers",
      message: "decisionMakers must be an array.",
    });
  } else {
    value.decisionMakers.forEach((person, index) => {
      if (
        !isRecord(person) ||
        !text(person.name) ||
        !text(person.role) ||
        !text(person.context)
      ) {
        issues.push({
          path: `decisionMakers[${index}]`,
          message: "name, role, and context are required.",
        });
      }
      if (
        !isRecord(person) ||
        !confidenceValues.includes(text(person.confidence))
      ) {
        issues.push({
          path: `decisionMakers[${index}].confidence`,
          message: "Use low, medium, or high confidence.",
        });
      }
      if (
        !isRecord(person) ||
        !Array.isArray(person.evidenceUrls) ||
        person.evidenceUrls.length === 0
      ) {
        issues.push({
          path: `decisionMakers[${index}].evidenceUrls`,
          message: "Every decision maker must cite evidence.",
        });
      }
    });
  }
  for (const key of ["services", "products"]) {
    const items = value[key];
    if (
      !Array.isArray(items) ||
      items.some((item) => !text(item))
    ) {
      issues.push({
        path: key,
        message: `${key} must be an array of non-empty strings.`,
      });
    }
  }
  if (!Array.isArray(value.observations) || value.observations.length < 3) {
    issues.push({
      path: "observations",
      message: "At least three evidence-backed observations are required.",
    });
  } else {
    value.observations.forEach((observation, index) => {
      if (
        !isRecord(observation) ||
        !text(observation.title) ||
        !text(observation.detail) ||
        !text(observation.implication)
      ) {
        issues.push({
          path: `observations[${index}]`,
          message: "title, detail, and implication are required.",
        });
      }
      if (
        !isRecord(observation) ||
        !Array.isArray(observation.evidenceUrls) ||
        observation.evidenceUrls.length === 0
      ) {
        issues.push({
          path: `observations[${index}].evidenceUrls`,
          message: "Every observation must cite at least one evidence URL.",
        });
      }
    });
  }
  if (!Array.isArray(value.evidence) || value.evidence.length < 2) {
    issues.push({
      path: "evidence",
      message: "At least two direct source records are required.",
    });
  } else {
    const evidenceUrls = new Set<string>();
    value.evidence.forEach((item, index) => {
      if (!isRecord(item)) {
        issues.push({
          path: `evidence[${index}]`,
          message: "Evidence must be an object.",
        });
        return;
      }
      const url = text(item.url);
      if (!publicHttpUrl(url)) {
        issues.push({
          path: `evidence[${index}].url`,
          message:
            "Evidence URL must be a public http or https address; local and private-network targets are blocked.",
        });
      } else if (evidenceUrls.has(normalizeUrl(url))) {
        issues.push({
          path: `evidence[${index}].url`,
          message: "Duplicate evidence URL in the same submission.",
        });
      } else {
        evidenceUrls.add(normalizeUrl(url));
      }
      for (const key of ["title", "publisher", "note", "kind", "discoveredAt"]) {
        if (!text(item[key])) {
          issues.push({
            path: `evidence[${index}].${key}`,
            message: `${key} is required.`,
          });
        }
      }
      if (!evidenceKindValues.includes(text(item.kind))) {
        issues.push({
          path: `evidence[${index}].kind`,
          message: "Use a supported evidence kind.",
        });
      }
      if (!confidenceValues.includes(text(item.confidence))) {
        issues.push({
          path: `evidence[${index}].confidence`,
          message: "Use low, medium, or high confidence.",
        });
      }
      if (!isIsoDate(item.discoveredAt)) {
        issues.push({
          path: `evidence[${index}].discoveredAt`,
          message: "discoveredAt must be an ISO date.",
        });
      }
      if (item.publishedAt && !isIsoDate(item.publishedAt)) {
        issues.push({
          path: `evidence[${index}].publishedAt`,
          message: "publishedAt must be an ISO date or null.",
        });
      }
      if (!Array.isArray(item.supports) || item.supports.length === 0) {
        issues.push({
          path: `evidence[${index}].supports`,
          message: "List at least one claim supported by this source.",
        });
      }
    });
    const referencedUrls = [
      ...(Array.isArray(value.contacts)
        ? value.contacts.flatMap((contact) =>
            isRecord(contact) && Array.isArray(contact.evidenceUrls)
              ? contact.evidenceUrls
              : [],
          )
        : []),
      ...(Array.isArray(value.observations)
        ? value.observations.flatMap((observation) =>
            isRecord(observation) && Array.isArray(observation.evidenceUrls)
              ? observation.evidenceUrls
              : [],
          )
        : []),
      ...(Array.isArray(value.decisionMakers)
        ? value.decisionMakers.flatMap((person) =>
            isRecord(person) && Array.isArray(person.evidenceUrls)
              ? person.evidenceUrls
              : [],
          )
        : []),
      ...(isRecord(value.outreachDraft) &&
      Array.isArray(value.outreachDraft.evidenceUrls)
        ? value.outreachDraft.evidenceUrls
        : []),
    ];
    for (const referenced of referencedUrls) {
      if (
        typeof referenced === "string" &&
        !evidenceUrls.has(normalizeUrl(referenced))
      ) {
        issues.push({
          path: "evidence",
          message: `Referenced evidence URL is missing from evidence: ${referenced}`,
        });
      }
    }
  }
  for (const key of [
    "discoveryReason",
    "fitReason",
    "recommendedServiceAngle",
    "suggestedOutreachApproach",
    "researchNotes",
  ]) {
    if (!text(value[key])) {
      issues.push({ path: key, message: `${key} is required.` });
    }
  }
  if (
    !Array.isArray(value.likelyMarketingNeeds) ||
    value.likelyMarketingNeeds.length === 0
  ) {
    issues.push({
      path: "likelyMarketingNeeds",
      message: "At least one specific marketing need is required.",
    });
  }
  if (!priorityValues.includes(text(value.urgency))) {
    issues.push({
      path: "urgency",
      message: "Use low, medium, high, or urgent.",
    });
  }
  if (!confidenceValues.includes(text(value.confidence))) {
    issues.push({
      path: "confidence",
      message: "Use low, medium, or high confidence.",
    });
  }
  if (value.outreachDraft !== undefined) {
    if (!isRecord(value.outreachDraft)) {
      issues.push({
        path: "outreachDraft",
        message: "outreachDraft must be an object.",
      });
    } else {
      for (const key of ["subject", "opening", "body", "callToAction"]) {
        if (!text(value.outreachDraft[key])) {
          issues.push({
            path: `outreachDraft.${key}`,
            message: `${key} is required when a draft is supplied.`,
          });
        }
      }
      if (
        !Array.isArray(value.outreachDraft.evidenceUrls) ||
        value.outreachDraft.evidenceUrls.length === 0
      ) {
        issues.push({
          path: "outreachDraft.evidenceUrls",
          message: "A draft must cite at least one evidence URL.",
        });
      }
    }
  }
  validateScoreInputs(value.scoreInputs, issues);
  if (!isRecord(value.trace)) {
    issues.push({ path: "trace", message: "trace is required." });
  } else {
    if (!text(value.trace.actorId)) {
      issues.push({ path: "trace.actorId", message: "actorId is required." });
    }
    if (
      !["human", "codex", "claude-code", "research-agent", "api"].includes(
        text(value.trace.actorType),
      )
    ) {
      issues.push({
        path: "trace.actorType",
        message: "Use a supported trace actor type.",
      });
    }
    if (!isIsoDate(value.trace.researchedAt)) {
      issues.push({
        path: "trace.researchedAt",
        message: "researchedAt must be an ISO date.",
      });
    }
  }
  return {
    valid: issues.length === 0,
    issues,
    input: issues.length === 0 ? (value as unknown as ResearchLeadInput) : undefined,
  };
}

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    const path = url.pathname.replace(/\/+$/, "") || "/";
    return `${url.hostname.toLowerCase().replace(/^www\./, "")}${path}${url.search}`.toLowerCase();
  } catch {
    return value.toLowerCase().replace(/\/+$/, "");
  }
}

function domain(value: string | undefined) {
  if (!value) return "";
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/\b(inc|incorporated|ltd|limited|corp|corporation|company|co)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function shortHash(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

async function checkSource(url: string) {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "QueMediaIntelligence/1.0 (+https://quemedia.ca; public-source verification)",
      },
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    return {
      reachable: response.ok || response.status === 401 || response.status === 403,
      finalUrl: response.url || url,
      status: response.status,
    };
  } catch {
    return { reachable: false, finalUrl: url, status: null };
  }
}

async function checkSources(input: ResearchLeadInput) {
  const checks = new Map<
    string,
    { reachable: boolean; finalUrl: string; status: number | null }
  >();
  let cursor = 0;
  const sources = input.evidence.slice(0, 20);
  async function worker() {
    while (cursor < sources.length) {
      const index = cursor;
      cursor += 1;
      const source = sources[index];
      checks.set(normalizeUrl(source.url), await checkSource(source.url));
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(4, sources.length) }, () => worker()),
  );
  return checks;
}

function sourceKind(kind: ResearchLeadInput["evidence"][number]["kind"]): SourceKind {
  if (kind === "official-website") return "website";
  if (kind === "official-social") return "instagram";
  if (kind === "google-business") return "google-business";
  if (kind === "local-news") return "local-news";
  if (kind === "directory") return "directory";
  if (kind === "municipal") return "public-record";
  if (kind === "community") return "manual-note";
  return "website";
}

function emailProvenance(
  value: ResearchLeadInput["contacts"][number]["provenance"],
): EmailProvenance {
  if (value === "official") return "official";
  if (value === "inferred") return "inferred";
  if (value === "third-party-listed") return "third-party-listed";
  return "unavailable";
}

function emailVerification(
  value: ResearchLeadInput["contacts"][number]["verificationStatus"],
  evidenceReachable: boolean,
): EmailVerificationStatus {
  if (!evidenceReachable) return value === "invalid" ? "invalid" : "unverified";
  if (value === "verified" || value === "verified-public") return "verified";
  if (value === "usable") return "usable";
  if (value === "invalid") return "invalid";
  return "unverified";
}

function grade(score: number): ScoreCard["grade"] {
  if (score >= 93) return "A+";
  if (score >= 87) return "A";
  if (score >= 82) return "B+";
  if (score >= 76) return "B";
  if (score >= 70) return "C+";
  if (score >= 62) return "C";
  return "D";
}

function scorecard(
  label: string,
  score: number,
  calculatedAt: string,
  dimensions: Array<{
    key: string;
    label: string;
    score: number;
    rationale: string;
    evidenceIds: string[];
  }>,
): ScoreCard {
  return {
    label,
    score,
    grade: grade(score),
    summary: `${label} is ${score}/100 from the documented research rubric. Open the dimensions to review the reasons; this score does not replace human judgment.`,
    calculatedAt,
    modelVersion: "qmi-research-ingestion-v1.0",
    dimensions: dimensions.map((dimension) => ({
      ...dimension,
      weight: 1 / Math.max(dimensions.length, 1),
      trend: "new",
    })),
  };
}

function evidenceIdsFor(urls: string[], evidenceByUrl: Map<string, Evidence>) {
  return urls
    .map((url) => evidenceByUrl.get(normalizeUrl(url))?.id)
    .filter((id): id is string => Boolean(id));
}

function buildLeadProfile(
  input: ResearchLeadInput,
  id: string,
  checks: Awaited<ReturnType<typeof checkSources>>,
) {
  const sources: Source[] = input.evidence.map((item, index) => {
    const check = checks.get(normalizeUrl(item.url));
    const capturedAt = item.discoveredAt;
    const lastPublishedAt = item.publishedAt ?? undefined;
    const ageStart = new Date(lastPublishedAt ?? capturedAt).getTime();
    const ageEnd = new Date(input.trace.researchedAt).getTime();
    return {
      id: `source-${id}-${index + 1}`,
      label: item.title,
      kind: sourceKind(item.kind),
      url: item.url,
      publisher: item.publisher,
      capturedAt,
      lastPublishedAt,
      freshnessDays:
        Number.isFinite(ageStart) && Number.isFinite(ageEnd)
          ? Math.max(0, Math.floor((ageEnd - ageStart) / 86_400_000))
          : 0,
      accessible: check?.reachable ?? false,
    };
  });
  const sourceByUrl = new Map(
    sources.map((source) => [normalizeUrl(source.url), source]),
  );
  const evidence: Evidence[] = input.evidence.map((item, index) => {
    const source = sourceByUrl.get(normalizeUrl(item.url))!;
    return {
      id: `evidence-${id}-${index + 1}`,
      claim: item.supports.join("; "),
      detail: item.note,
      sourceIds: [source.id],
      observedAt: item.discoveredAt,
      confidence: item.confidence,
      verified: source.accessible,
      freshnessLabel: item.publishedAt
        ? `Published ${item.publishedAt.slice(0, 10)}`
        : `Discovered ${item.discoveredAt.slice(0, 10)}`,
      tags: [item.kind, ...item.supports.slice(0, 3)],
    };
  });
  const evidenceByUrl = new Map(
    input.evidence.map((item, index) => [
      normalizeUrl(item.url),
      evidence[index],
    ]),
  );
  const primaryEmailInput =
    input.contacts.find(
      (contact) => contact.kind === "email" && contact.isPrimary,
    ) ?? input.contacts.find((contact) => contact.kind === "email");
  const emailEvidenceReachable = Boolean(
    primaryEmailInput?.evidenceUrls.some(
      (url) => checks.get(normalizeUrl(url))?.reachable,
    ),
  );
  const primaryEmailStatus = primaryEmailInput
    ? emailVerification(
        primaryEmailInput.verificationStatus,
        emailEvidenceReachable,
      )
    : "unavailable";
  const contactChannels: ContactChannel[] = [];
  for (const contact of input.contacts) {
    if (contact.kind === "contact-form") continue;
    if (contact.kind === "email") {
      contactChannels.push({
        kind: "email",
        label: `${contact.label} · ${emailProvenance(contact.provenance)} · ${emailVerification(contact.verificationStatus, contact.evidenceUrls.some((url) => checks.get(normalizeUrl(url))?.reachable))}`,
        value: contact.value,
        public: true,
        preferred: contact.isPrimary,
      });
      continue;
    }
    contactChannels.push({
      kind: "phone",
      label: contact.label,
      value: contact.value,
      public: true,
      preferred: contact.isPrimary,
    });
  }
  for (const social of input.socialProfiles) {
    if (
      social.platform === "instagram" ||
      social.platform === "facebook" ||
      social.platform === "linkedin"
    ) {
      contactChannels.push({
        kind: social.platform,
        label: `${social.platform} business account`,
        value: social.url,
        public: true,
      });
    }
  }
  const scoreEvidenceMap = new Map(
    [...evidenceByUrl.entries()].map(([url, item]) => [url, item.id]),
  );
  const qualityScore = calculateResearchInputQualityScore(
    input,
    scoreEvidenceMap,
  );
  const contentFit = Math.round(input.scoreInputs.queMediaFit * 20);
  const opportunity = Math.round(
    (input.scoreInputs.recency +
      input.scoreInputs.openingOrExpansion +
      input.scoreInputs.marketingNeed +
      input.scoreInputs.socialOpportunity +
      input.scoreInputs.websiteOpportunity +
      input.scoreInputs.likelyBudget) /
      6 *
      20,
  );
  const response = Math.round(
    (input.scoreInputs.emailReliability +
      input.scoreInputs.decisionMakerAccess +
      input.scoreInputs.evidenceStrength +
      input.scoreInputs.queMediaFit) /
      4 *
      20,
  );
  const evidenceDimensions = qualityScore.factors.map((factor) => ({
    key: factor.key,
    label: factor.label,
    score: Math.round((factor.score / factor.maxScore) * 100),
    rationale: factor.rationale,
    evidenceIds: factor.evidenceIds,
  }));
  const contentScorecard = scorecard(
    "Q Media content fit",
    contentFit,
    input.trace.researchedAt,
    evidenceDimensions.filter((item) =>
      ["queMediaFit", "socialOpportunity", "marketingNeed"].includes(item.key),
    ),
  );
  const opportunityScorecard = scorecard(
    "Opportunity",
    opportunity,
    input.trace.researchedAt,
    evidenceDimensions.filter((item) =>
      [
        "recency",
        "openingOrExpansion",
        "marketingNeed",
        "websiteOpportunity",
        "likelyBudget",
        "businessScale",
      ].includes(item.key),
    ),
  );
  const responseScorecard = scorecard(
    "Response likelihood",
    response,
    input.trace.researchedAt,
    evidenceDimensions.filter((item) =>
      [
        "emailReliability",
        "decisionMakerAccess",
        "evidenceStrength",
        "urgency",
      ].includes(item.key),
    ),
  );
  const firstOfficial =
    input.evidence.find((item) => item.kind === "official-website")?.url ?? "";
  const website = input.business.website ?? firstOfficial;
  const fullLocation = [
    input.location.address,
    input.location.neighborhood,
    input.location.city,
    input.location.region,
  ]
    .filter(Boolean)
    .join(", ");
  const emailReady =
    primaryEmailStatus === "verified" || primaryEmailStatus === "usable";
  const reachableCount = sources.filter((source) => source.accessible).length;
  const qualified =
    qualityScore.score >= 65 &&
    reachableCount >= 2 &&
    sources.some(
      (source) =>
        source.accessible &&
        input.evidence.find(
          (item) => normalizeUrl(item.url) === normalizeUrl(source.url),
        )?.kind.startsWith("official"),
    );
  const draftEvidenceIds = input.outreachDraft
    ? evidenceIdsFor(input.outreachDraft.evidenceUrls, evidenceByUrl)
    : [];
  const outreachDrafts: LeadProfile["outreachDrafts"] =
    input.outreachDraft && primaryEmailInput
      ? [
          {
            id: `draft-${id}-email-1`,
            channel: "email",
            subject: input.outreachDraft.subject,
            opening: input.outreachDraft.opening,
            body: input.outreachDraft.body,
            callToAction: input.outreachDraft.callToAction,
            personalizationPoints: input.observations
              .slice(0, 3)
              .map((observation) => observation.title),
            evidenceIds: draftEvidenceIds,
            status: "needs-review",
            tone: "Specific, evidence-led, and low pressure",
            generatedAt: input.trace.researchedAt,
          },
        ]
      : [];
  const profile: LeadProfile = {
    id,
    name: input.business.name,
    initials: input.business.name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    industry: input.business.category,
    neighborhood: input.location.neighborhood ?? input.location.city,
    location: fullLocation,
    summary: input.fitReason,
    stage: qualified
      ? emailReady
        ? "outreach-ready"
        : "qualified"
      : "watchlist",
    researchStatus: qualified ? "quality-review" : "researching",
    priority: input.urgency,
    opportunityScore: opportunity,
    contentFitScore: contentFit,
    responseLikelihood: response,
    whyNow: input.discoveryReason,
    topSignal: input.business.status.replaceAll("-", " "),
    tags: [
      input.location.city,
      input.location.neighborhood,
      input.business.status.replaceAll("-", " "),
      emailReady ? "Email ready" : "Email missing or unverified",
    ].filter((item): item is string => Boolean(item)),
    sourceCount: sources.length,
    evidenceCount: evidence.length,
    lastEnrichedAt: input.trace.researchedAt,
    nextReviewAt: new Date(
      new Date(input.trace.researchedAt).getTime() +
        (input.urgency === "urgent" ? 3 : 14) * 86_400_000,
    ).toISOString(),
    primaryChannel: primaryEmailInput ? "email" : "phone",
    thumbnailTone: ["saffron", "sage", "rose", "steel", "clay"][
      input.business.name.length % 5
    ],
    website,
    identity: {
      displayName: input.business.name,
      foundedYear: input.business.foundedYear,
      ownership: input.business.ownership ?? "Unavailable",
      employeeRange: "",
      primaryLocation: fullLocation,
      serviceArea: [input.location.city],
      hours: [],
      offerings: [...input.services, ...input.products],
      customerSegments: [],
    },
    contactChannels,
    overview: input.business.description,
    likelyPainPoints: input.observations.map((observation) => ({
      title: observation.title,
      explanation: `${observation.detail} ${observation.implication}`,
      confidence: input.confidence,
      evidenceIds: evidenceIdsFor(observation.evidenceUrls, evidenceByUrl),
    })),
    decisionMakers: input.decisionMakers.map((person, index) => ({
      id: `person-${id}-${index + 1}`,
      name: person.name,
      role: person.role,
      relevance: person.context,
      publicContext:
        "Public, professionally relevant leadership context only. No private or personal data is stored.",
      confidence: person.confidence,
      channels: contactChannels,
      evidenceIds: evidenceIdsFor(person.evidenceUrls, evidenceByUrl),
    })),
    opportunityScorecard,
    contentFitScorecard: contentScorecard,
    responseScorecard,
    whyNowSignals: input.business.openingDate
      ? [
          {
            id: `signal-${id}-1`,
            title: input.business.status.replaceAll("-", " "),
            description: input.discoveryReason,
            type:
              input.business.status === "expanding"
                ? "expansion"
                : input.business.status === "new-service"
                  ? "service-launch"
                  : "opening",
            strength:
              input.confidence === "high"
                ? "strong"
                : input.confidence === "medium"
                  ? "moderate"
                  : "emerging",
            occurredAt: input.business.openingDate,
            bestContactWindow:
              "Recheck the cited date and current business status immediately before outreach.",
            evidenceIds: evidence
              .filter((item) =>
                item.tags.some((tag) =>
                  /opening|launch|expansion|date/i.test(tag),
                ),
              )
              .map((item) => item.id),
            suggestedAngle: input.suggestedOutreachApproach,
          },
        ]
      : [],
    websiteAudit: {
      auditedAt: input.trace.researchedAt,
      url: website,
      performance: [],
      sections: [],
      quickWins: input.likelyMarketingNeeds.filter((need) =>
        /website|seo|google|conversion/i.test(need),
      ),
      topOpportunity:
        input.likelyMarketingNeeds.find((need) =>
          /website|seo|google|conversion/i.test(need),
        ) ?? "A deterministic website audit has not been completed.",
    },
    localSeoAudit: {
      auditedAt: input.trace.researchedAt,
      primaryCategory: input.business.category,
      additionalCategories: [],
      rankObservations: [],
      sentimentThemes: [],
      findings: [],
    },
    socialIntelligence: {
      analyzedAt: input.trace.researchedAt,
      accounts: input.socialProfiles.map((social) => ({
        platform: social.platform,
        handle: social.handle ?? social.url,
        url: social.url,
        exists: true,
        postingCadence: "Not measured",
        note: "The public account was recorded. Activity and performance are not inferred.",
        sourceId: sourceByUrl.get(normalizeUrl(social.url))?.id,
      })),
      contentMix: [],
      topPosts: [],
      productionQuality: [],
      brandConsistency: [],
      brandPersonality: [],
      missedOpportunities: input.likelyMarketingNeeds.map((need, index) => ({
        title: need,
        rationale: input.recommendedServiceAngle,
        potential: index === 0 ? "high" : "medium",
        format: "To be defined after human review",
        evidenceIds: input.observations[index % input.observations.length]
          ? evidenceIdsFor(
              input.observations[index % input.observations.length].evidenceUrls,
              evidenceByUrl,
            )
          : [],
      })),
      audienceQuestions: [],
    },
    competitors: [],
    recommendations: input.likelyMarketingNeeds.map((need, index) => ({
      id: `recommendation-${id}-${index + 1}`,
      title: need,
      category: /website/i.test(need)
        ? "website"
        : /seo|google/i.test(need)
          ? "local-seo"
          : "content",
      priority: index === 0 ? "high" : "medium",
      impact: input.fitReason,
      observation:
        input.observations[index % input.observations.length]?.detail ??
        input.discoveryReason,
      action: input.recommendedServiceAngle,
      evidenceIds: input.observations[index % input.observations.length]
        ? evidenceIdsFor(
            input.observations[index % input.observations.length].evidenceUrls,
            evidenceByUrl,
          )
        : [],
    })),
    outreachDrafts,
    objectionPlans: [],
    relationshipTimeline: [
      {
        id: `timeline-${id}-discovered`,
        occurredAt: input.trace.researchedAt,
        type: "discovered",
        title: "Lead entered through the structured research API",
        detail: input.discoveryReason,
        actor: input.trace.actorId,
        nextAction: qualified
          ? emailReady
            ? "Human-review the evidence, contact, and draft before approving Instantly submission."
            : "Find or request a usable business email without guessing."
          : "Resolve the failed quality gates before qualification.",
        evidenceIds: evidence.map((item) => item.id),
      },
    ],
    evidence,
    sources,
    executiveSummary: `${input.business.name} scored ${qualityScore.score}/100 on the transparent lead-quality rubric. ${input.fitReason}`,
    nextBestAction: qualified
      ? emailReady
        ? "Review the evidence and personalized email, then approve an eligible Instantly campaign and sender."
        : "Use the best alternative public contact route to request the correct business email."
      : "Complete source verification and human quality review before outreach.",
    reportReady: false,
  };
  return {
    profile,
    qualityScore,
    primaryEmailInput,
    primaryEmailStatus,
    qualified,
    reachableCount,
  };
}

function duplicateSignals(input: ResearchLeadInput, candidate: LeadProfile) {
  const signals: string[] = [];
  const inputName = normalizeName(input.business.name);
  const candidateName = normalizeName(candidate.name);
  if (inputName && inputName === candidateName) signals.push("business-name");
  const inputDomain = domain(input.business.website);
  const candidateDomain = domain(candidate.website);
  if (inputDomain && candidateDomain && inputDomain === candidateDomain) {
    signals.push("domain");
  }
  const inputEmails = new Set(
    input.contacts
      .filter((contact) => contact.kind === "email")
      .map((contact) => contact.value.toLowerCase()),
  );
  if (
    candidate.contactChannels.some(
      (channel) =>
        channel.kind === "email" &&
        inputEmails.has(channel.value.toLowerCase()),
    )
  ) {
    signals.push("email");
  }
  const inputPhones = new Set(
    input.contacts
      .filter((contact) => contact.kind === "phone")
      .map((contact) => normalizePhone(contact.value))
      .filter(Boolean),
  );
  if (
    candidate.contactChannels.some(
      (channel) =>
        channel.kind === "phone" &&
        inputPhones.has(normalizePhone(channel.value)),
    )
  ) {
    signals.push("phone");
  }
  const inputSocials = new Set(
    input.socialProfiles.map((social) => normalizeUrl(social.url)),
  );
  if (
    candidate.socialIntelligence.accounts.some((account) =>
      inputSocials.has(normalizeUrl(account.url)),
    )
  ) {
    signals.push("social-profile");
  }
  const inputAddress = text(input.location.address).toLowerCase();
  if (
    inputAddress &&
    candidate.location.toLowerCase().includes(inputAddress) &&
    signals.includes("business-name")
  ) {
    signals.push("name-and-address");
  }
  return signals;
}

async function findDuplicate(input: ResearchLeadInput) {
  const summaries = await listOperatingLeadSummaries();
  const candidates = (
    await Promise.all(
      summaries.map((summary) => getOperatingLeadProfile(summary.id)),
    )
  )
    .filter((profile): profile is NonNullable<typeof profile> => Boolean(profile))
    .map((profile) => ({
      profile,
      signals: duplicateSignals(input, profile),
    }))
    .filter((match) => match.signals.length > 0);
  const exact = candidates.find((match) =>
    match.signals.some((signal) =>
      ["domain", "email", "phone", "social-profile", "name-and-address"].includes(
        signal,
      ),
    ),
  );
  const ambiguous = candidates.find(
    (match) =>
      match.signals.length === 1 && match.signals[0] === "business-name",
  );
  return { exact, ambiguous };
}

function mergeUniqueBy<T>(existing: T[], additions: T[], key: (value: T) => string) {
  const result = [...existing];
  const seen = new Set(existing.map(key));
  for (const addition of additions) {
    const identifier = key(addition);
    if (seen.has(identifier)) continue;
    seen.add(identifier);
    result.push(addition);
  }
  return result;
}

export async function ingestResearchLead(
  input: ResearchLeadInput,
  actor: WorkspaceActor,
): Promise<ResearchIngestionResult> {
  if (input.trace.actorId !== actor.id && actor.role !== "admin") {
    throw new Error(
      "trace.actorId must match the authenticated actor for non-admin submissions.",
    );
  }
  if (
    input.trace.actorType !== actor.actorType &&
    actor.role !== "admin"
  ) {
    throw new Error(
      "trace.actorType must match the authenticated actor for non-admin submissions.",
    );
  }
  if (input.trace.batchId) {
    const batch = (await (await getDatabase())
      .prepare(
        "SELECT id, status FROM research_batches WHERE id = ?",
      )
      .get(input.trace.batchId)) as unknown as
      | { id: string; status: string }
      | undefined;
    if (!batch || batch.status !== "active") {
      throw new Error("trace.batchId must identify an active research batch.");
    }
  }
  const duplicate = await findDuplicate(input);
  if (duplicate.ambiguous && !duplicate.exact) {
    const error = new Error(
      `A business with the same normalized name already exists (${duplicate.ambiguous.profile.id}). Add a stronger domain, email, phone, social, or address signal before retrying.`,
    );
    error.name = "AmbiguousDuplicateError";
    throw error;
  }
  const checks = await checkSources(input);
  const baseId = slug(input.business.name) || `lead-${shortHash(input.business.name)}`;
  const id = duplicate.exact?.profile.id ?? baseId;
  const built = buildLeadProfile(input, id, checks);
  const warnings: string[] = [];
  if (built.reachableCount < 2) {
    warnings.push(
      "Fewer than two submitted evidence sources were reachable; the lead remains pending review.",
    );
  }
  if (
    !built.primaryEmailInput ||
    !["verified", "usable"].includes(built.primaryEmailStatus)
  ) {
    warnings.push(
      "No verified or usable business email is available. This lead does not count toward the daily email-ready research target.",
    );
  }

  if (duplicate.exact) {
    const existing = duplicate.exact.profile;
    const sourceIdOffset = existing.sources.length;
    const remappedSources = built.profile.sources.map((source, index) => ({
      ...source,
      id: `source-${id}-${sourceIdOffset + index + 1}`,
    }));
    const sourceIdByOld = new Map(
      built.profile.sources.map((source, index) => [
        source.id,
        remappedSources[index].id,
      ]),
    );
    const evidenceOffset = existing.evidence.length;
    const remappedEvidence = built.profile.evidence.map((item, index) => ({
      ...item,
      id: `evidence-${id}-${evidenceOffset + index + 1}`,
      sourceIds: item.sourceIds.map(
        (sourceId) => sourceIdByOld.get(sourceId) ?? sourceId,
      ),
    }));
    const merged: LeadProfile = {
      ...existing,
      summary: built.profile.summary,
      whyNow: built.profile.whyNow,
      topSignal: built.profile.topSignal,
      tags: [...new Set([...existing.tags, ...built.profile.tags])],
      sourceCount: mergeUniqueBy(
        existing.sources,
        remappedSources,
        (source) => normalizeUrl(source.url),
      ).length,
      evidenceCount: mergeUniqueBy(
        existing.evidence,
        remappedEvidence,
        (item) => `${item.claim}|${item.sourceIds.join(",")}`,
      ).length,
      lastEnrichedAt: input.trace.researchedAt,
      nextReviewAt: built.profile.nextReviewAt,
      contactChannels: mergeUniqueBy(
        existing.contactChannels,
        built.profile.contactChannels,
        (channel) => `${channel.kind}:${channel.value.toLowerCase()}`,
      ),
      likelyPainPoints: mergeUniqueBy(
        existing.likelyPainPoints,
        built.profile.likelyPainPoints,
        (item) => item.title.toLowerCase(),
      ),
      decisionMakers: mergeUniqueBy(
        existing.decisionMakers,
        built.profile.decisionMakers,
        (person) => `${person.name}:${person.role}`.toLowerCase(),
      ),
      whyNowSignals: mergeUniqueBy(
        existing.whyNowSignals,
        built.profile.whyNowSignals,
        (signal) => `${signal.title}:${signal.occurredAt}`.toLowerCase(),
      ),
      recommendations: mergeUniqueBy(
        existing.recommendations,
        built.profile.recommendations,
        (item) => item.title.toLowerCase(),
      ),
      outreachDrafts: mergeUniqueBy(
        existing.outreachDrafts,
        built.profile.outreachDrafts,
        (draft) => `${draft.channel}:${draft.subject ?? ""}:${draft.generatedAt}`,
      ),
      relationshipTimeline: [
        ...built.profile.relationshipTimeline,
        ...existing.relationshipTimeline,
      ],
      evidence: mergeUniqueBy(
        existing.evidence,
        remappedEvidence,
        (item) => `${item.claim}|${item.sourceIds.join(",")}`,
      ),
      sources: mergeUniqueBy(
        existing.sources,
        remappedSources,
        (source) => normalizeUrl(source.url),
      ),
      executiveSummary: built.profile.executiveSummary,
      nextBestAction: built.profile.nextBestAction,
    };
    const timestamp = nowIso();
    await withTransaction(async (db) => {
      await db.prepare(`
        UPDATE lead_profiles SET profile_json = ?, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify(merged), timestamp, id);
      await db.prepare(`
        UPDATE lead_operations SET
          quality_score_json = ?,
          lifecycle_status = CASE
            WHEN lifecycle_status IN ('researched', 'qualified', 'ready-for-outreach')
              THEN ?
            ELSE lifecycle_status
          END,
          qualification_status = CASE
            WHEN qualification_status = 'pending-review' AND ? = 1
              THEN 'qualified'
            ELSE qualification_status
          END,
          qualification_reason = ?,
          primary_email = coalesce(primary_email, ?),
          email_provenance = CASE
            WHEN primary_email IS NULL THEN ?
            ELSE email_provenance
          END,
          email_verification_status = CASE
            WHEN primary_email IS NULL THEN ?
            ELSE email_verification_status
          END,
          updated_at = ?
        WHERE lead_id = ?
      `).run(
        JSON.stringify(built.qualityScore),
        built.qualified
          ? ["verified", "usable"].includes(built.primaryEmailStatus)
            ? "ready-for-outreach"
            : "qualified"
          : "researched",
        built.qualified ? 1 : 0,
        built.qualified
          ? "The updated record passed the structured evidence and commercial-fit gate."
          : "The updated record still requires human quality review.",
        built.primaryEmailInput?.value ?? null,
        built.primaryEmailInput
          ? emailProvenance(built.primaryEmailInput.provenance)
          : "unavailable",
        built.primaryEmailStatus,
        timestamp,
        id,
      );
      await recordActivity(db, {
        leadId: id,
        occurredAt: timestamp,
        type: "lead-updated",
        title: "New research merged into the existing lead",
        detail: `${built.profile.sources.length} submitted source record${built.profile.sources.length === 1 ? " was" : "s were"} evaluated and merged without creating a duplicate.`,
        actorId: actor.id,
        actorType: actor.actorType,
        metadata: {
          duplicateSignals: duplicate.exact!.signals,
          batchId: input.trace.batchId,
          evidenceIds: remappedEvidence.map((item) => item.id),
        },
      });
      await recordAudit(db, {
        actorId: actor.id,
        actorType: actor.actorType,
        action: "lead.research.merge",
        resourceType: "lead",
        resourceId: id,
        outcome: "success",
        detail: "New evidence was merged into an existing lead after deterministic duplicate matching.",
        metadata: { duplicateSignals: duplicate.exact!.signals },
      });
    });
    const updated = (await getOperatingLeadProfile(id))!;
    return {
      operation: "updated",
      lead: updated,
      state: updated.operations,
      duplicateSignals: duplicate.exact.signals,
      warnings,
    };
  }

  let uniqueId = id;
  let suffix = 2;
  while (await getOperatingLeadProfile(uniqueId)) {
    uniqueId = `${id}-${suffix}`;
    suffix += 1;
  }
  if (uniqueId !== id) {
    const rebuilt = buildLeadProfile(input, uniqueId, checks);
    built.profile = rebuilt.profile;
    built.qualityScore = rebuilt.qualityScore;
  }
  const primaryEmail = built.primaryEmailInput?.value;
  const provenance: EmailProvenance = built.primaryEmailInput
    ? emailProvenance(built.primaryEmailInput.provenance)
    : "unavailable";
  const contactType: EmailContactType =
    built.primaryEmailInput?.contactType ?? "unknown";
  const lifecycleStatus = built.qualified
    ? ["verified", "usable"].includes(built.primaryEmailStatus)
      ? "ready-for-outreach"
      : "qualified"
    : "researched";
  const qualificationStatus = built.qualified
    ? "qualified"
    : "pending-review";
  const timestamp = nowIso();
  const addedAt = timestamp;
  await withTransaction(async (db) => {
    await db.prepare(`
      INSERT INTO lead_profiles (
        id, profile_json, source_kind, source_actor_type, source_actor_id,
        source_batch_id, created_at, updated_at
      ) VALUES (?, ?, 'structured-research-api', ?, ?, ?, ?, ?)
    `).run(
      uniqueId,
      JSON.stringify(built.profile),
      actor.actorType,
      actor.id,
      input.trace.batchId ?? null,
      addedAt,
      timestamp,
    );
    await db.prepare(`
      INSERT INTO lead_operations (
        lead_id, lifecycle_status, qualification_status, qualification_reason,
        opening_status, opening_date, opening_date_confidence, primary_email,
        email_provenance, email_verification_status, email_contact_type,
        email_last_verified_at, added_at, added_local_date, qualified_at,
        qualified_local_date, last_contact_at, last_reply_at, reply_status,
        follow_up_status, next_action, next_action_due_at, assigned_to,
        internal_notes, source_actor_type, source_actor_id, source_batch_id,
        quality_score_json, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        NULL, NULL, 'none', 'not-required', ?, NULL, NULL, ?, ?, ?, ?, ?, ?, ?
      )
    `).run(
      uniqueId,
      lifecycleStatus,
      qualificationStatus,
      built.qualified
        ? "The record passed the structured evidence, commercial-fit, and source-reachability gates."
        : "Human quality review is required because one or more source or score gates did not pass.",
      input.business.status,
      input.business.openingDate ?? null,
      input.business.openingDateConfidence ?? input.confidence,
      primaryEmail ?? null,
      provenance,
      built.primaryEmailStatus,
      contactType,
      ["verified", "usable"].includes(built.primaryEmailStatus)
        ? input.trace.researchedAt
        : null,
      addedAt,
      toLocalDate(addedAt),
      built.qualified ? addedAt : null,
      built.qualified ? toLocalDate(addedAt) : null,
      built.profile.nextBestAction,
      input.researchNotes,
      actor.actorType,
      actor.id,
      input.trace.batchId ?? null,
      JSON.stringify(built.qualityScore),
      addedAt,
      timestamp,
    );
    await recordActivity(db, {
      leadId: uniqueId,
      occurredAt: addedAt,
      type: "lead-created",
      title: "Structured research lead added",
      detail: input.discoveryReason,
      actorId: actor.id,
      actorType: actor.actorType,
      metadata: {
        batchId: input.trace.batchId,
        qualified: built.qualified,
        emailReady: ["verified", "usable"].includes(built.primaryEmailStatus),
        evidenceIds: built.profile.evidence.map((item) => item.id),
      },
    });
    if (built.qualified) {
      await recordActivity(db, {
        leadId: uniqueId,
        occurredAt: addedAt,
        type: "qualification",
        title: "Lead passed the research quality gate",
        detail: `Lead quality score ${built.qualityScore.score}/100 with ${built.reachableCount} reachable sources.`,
        actorId: actor.id,
        actorType: actor.actorType,
        metadata: {
          emailReady: ["verified", "usable"].includes(
            built.primaryEmailStatus,
          ),
        },
      });
    }
    await recordAudit(db, {
      actorId: actor.id,
      actorType: actor.actorType,
      action: "lead.create",
      resourceType: "lead",
      resourceId: uniqueId,
      outcome: "success",
      detail: "A structured research record passed schema and duplicate validation.",
      metadata: {
        qualified: built.qualified,
        emailVerificationStatus: built.primaryEmailStatus,
        sourceCount: built.profile.sources.length,
      },
    });
  });
  const created = (await getOperatingLeadProfile(uniqueId))!;
  return {
    operation: "created",
    lead: created,
    state: created.operations,
    duplicateSignals: [],
    warnings,
  };
}
