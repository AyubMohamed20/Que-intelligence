import type {
  AuditFinding,
  Confidence,
  ContactChannel,
  Evidence,
  LeadProfile,
  OutreachChannel,
  ScoreCard,
  SocialPlatform,
  Source,
  SourceKind,
} from "@/lib/types";
import { businessLogoById } from "@/lib/business-logo-data";

export interface VerifiedLeadRecord {
  id: string;
  name: string;
  foundedYear?: number;
  ownership?: string;
  locationCount?: number;
  industry: string;
  neighborhood: string;
  location: string;
  website: string;
  phone: string | null;
  email: string | null;
  emailLabel?: string;
  decisionMaker: { name: string; role: string; sourceUrl: string } | null;
  socials: Array<{ platform: string; url: string; handle: string | null }>;
  offerings: string[];
  customerSegments: string[];
  observations: Array<{ title: string; detail: string; implication: string; sourceUrls: string[] }>;
  whyNow: { title: string; detail: string; date: string | null; strength: string; sourceUrls: string[] } | null;
  competitors: Array<{ name: string; url: string }>;
  scores: {
    contentFit: number;
    opportunity: number;
    response: number;
    summary: string;
    dimensions: Array<string | {
      score?: string | number;
      scoreType?: string;
      name: string;
      value?: number;
      max: number;
      evidence?: string;
    }>;
  };
  concepts: Array<{ title: string; hook: string; outline: string[]; productionNotes: string }>;
  outreach: {
    channel: string;
    subject: string;
    opening: string;
    body: string;
    callToAction: string;
    evidenceUrls: string[];
  };
  sources: Array<{
    label: string;
    url: string;
    publisher: string;
    capturedAt: string;
    lastPublishedAt: string | null;
    kind: string;
  }>;
}

interface LeadVerification {
  id: string;
  capturedAt: string;
  outreachReady: boolean;
  website: {
    finalUrl: string | null;
    reachable: boolean;
    score: number;
    checks: Array<{
      id: string;
      label: string;
      points: number;
      passed: boolean;
      earned: number;
      observation: string;
    }>;
  };
  contactVerification: {
    phone: { value: string; listedOnWebsite: boolean } | null;
    email: { value: string; listedOnWebsite: boolean } | null;
  };
  socialChecks: Array<{
    platform: string;
    handle: string;
    url: string;
    listedOnWebsite: boolean;
    reachable: boolean;
  }>;
  sourceChecks: Array<{ url: string; reachable: boolean }>;
}

const supportedPlatforms = new Set<SocialPlatform>([
  "instagram",
  "tiktok",
  "facebook",
  "youtube",
  "linkedin",
  "pinterest",
  "threads",
  "x",
]);

const tones = ["saffron", "sage", "rose", "steel", "clay", "mint", "coral", "sky"];

function comparableUrl(value: string) {
  try {
    const url = new URL(value);
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return value.toLowerCase().replace(/\/$/, "");
  }
}

function safeHost(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "Public source";
  }
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function grade(score: number): ScoreCard["grade"] {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "B+";
  if (score >= 80) return "B";
  if (score >= 75) return "C+";
  if (score >= 65) return "C";
  return "D";
}

function addDays(value: string, days: number) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function isoDateOrFallback(value: string | null | undefined, fallback: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) return fallback;
  return Number.isFinite(new Date(value).getTime()) ? value : fallback;
}

function ageInDays(start: string, end: string) {
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return 0;
  return Math.max(0, Math.floor((endTime - startTime) / 86_400_000));
}

function sourceKind(kind: string, url: string): SourceKind {
  const lowerKind = kind.toLowerCase().replaceAll("_", " ");
  const host = safeHost(url).toLowerCase();
  if (host.includes("instagram.com")) return "instagram";
  if (host.includes("tiktok.com")) return "tiktok";
  if (host.includes("facebook.com")) return "facebook";
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
  if (host.includes("linkedin.com")) return "linkedin";
  if (host.includes("pinterest.com")) return "pinterest";
  if (host.includes("threads.net")) return "threads";
  if (host === "x.com" || host.endsWith(".x.com") || host.includes("twitter.com")) return "x";
  if (host.includes("google.com") && lowerKind.includes("business")) return "google-business";
  if (lowerKind.includes("news")) return "local-news";
  if (lowerKind.includes("job") || lowerKind.includes("hiring")) return "job-board";
  if (lowerKind.includes("record") || lowerKind.includes("registration")) return "public-record";
  if (lowerKind.includes("directory") || lowerKind.includes("organization") || lowerKind.includes("profile")) return "directory";
  return "website";
}

function normalizePlatform(value: string): SocialPlatform | null {
  const normalized = value.toLowerCase().trim().replace("twitter", "x");
  return supportedPlatforms.has(normalized as SocialPlatform) ? normalized as SocialPlatform : null;
}

function primaryChannel(raw: VerifiedLeadRecord): OutreachChannel {
  const requested = raw.outreach.channel.toLowerCase();
  if (raw.email && requested.includes("email")) return "email";
  if (requested.includes("instagram")) return "instagram-dm";
  if (requested.includes("linkedin")) return "linkedin";
  if (requested.includes("facebook")) return "facebook";
  if (raw.phone && (requested.includes("phone") || requested.includes("contact form"))) return "phone";
  if (raw.email) return "email";
  if (raw.socials.some((social) => normalizePlatform(social.platform) === "instagram")) return "instagram-dm";
  if (raw.socials.some((social) => normalizePlatform(social.platform) === "linkedin")) return "linkedin";
  return raw.phone ? "phone" : "facebook";
}

function signalType(value: string): LeadProfile["whyNowSignals"][number]["type"] {
  const text = value.toLowerCase();
  if (text.includes("open") || text.includes("coming soon")) return "opening";
  if (text.includes("expand") || text.includes("larger space") || text.includes("second location")) return "expansion";
  if (text.includes("hir")) return "hiring";
  if (text.includes("festival") || text.includes("event") || text.includes("concert")) return "event";
  if (text.includes("anniversary") || text.includes("milestone")) return "milestone";
  if (text.includes("new service") || text.includes("launch")) return "service-launch";
  if (text.includes("summer") || text.includes("season")) return "seasonal";
  if (text.includes("campaign") || text.includes("sale") || text.includes("program")) return "campaign";
  return "marketing-change";
}

const failedCheckGuidance: Record<string, { implication: string; recommendation: string; severity: AuditFinding["severity"]; effort: AuditFinding["effort"] }> = {
  reachable: { implication: "An unreachable site interrupts discovery and conversion.", recommendation: "Restore reliable public access and monitor availability.", severity: "critical", effort: "large" },
  https: { implication: "A missing secure connection weakens trust and browser compatibility.", recommendation: "Serve every public page over HTTPS and redirect insecure URLs.", severity: "critical", effort: "medium" },
  title: { implication: "A weak page title reduces search clarity and browser context.", recommendation: "Write a descriptive title that names the business, offer, and Ottawa context.", severity: "medium", effort: "small" },
  description: { implication: "Search results lack a clear, controlled summary of the business.", recommendation: "Add a concise meta description focused on the customer and primary action.", severity: "medium", effort: "small" },
  viewport: { implication: "Mobile browsers may render the page at an unusable scale.", recommendation: "Add a valid mobile viewport declaration and test responsive reflow.", severity: "high", effort: "small" },
  h1: { implication: "The fetched page lacks a clear primary topic for visitors and search engines.", recommendation: "Add one descriptive primary heading that matches the page intent.", severity: "medium", effort: "small" },
  contact: { implication: "Visitors may struggle to take the next step from the landing page.", recommendation: "Expose a clear contact, booking, reservation, or quote action in the primary journey.", severity: "high", effort: "small" },
  social: { implication: "Visitors cannot easily move between the website and verified social proof.", recommendation: "Link the most useful active social account from a consistent site location.", severity: "low", effort: "small" },
  "structured-data": { implication: "Search engines receive less machine-readable local business context.", recommendation: "Add valid organization or local business structured data that matches public facts.", severity: "medium", effort: "medium" },
  canonical: { implication: "Search engines receive a weaker signal about the preferred page URL.", recommendation: "Declare a canonical URL for the public page.", severity: "low", effort: "small" },
  "open-graph": { implication: "Shared links may appear without controlled titles, descriptions, or imagery.", recommendation: "Add complete Open Graph metadata for reliable social link previews.", severity: "low", effort: "small" },
};

export function buildVerifiedLeadProfile(raw: VerifiedLeadRecord, verification: LeadVerification): LeadProfile {
  const capturedAt = verification.capturedAt || `${raw.sources[0]?.capturedAt ?? "2026-07-20"}T12:00:00.000Z`;
  const whyNowOccurredAt = isoDateOrFallback(raw.whyNow?.date, capturedAt);
  const descriptorByUrl = new Map<string, { label: string; url: string; publisher: string; capturedAt: string; lastPublishedAt?: string; kind: string }>();

  const addSource = (value: { label: string; url: string; publisher?: string; capturedAt?: string; lastPublishedAt?: string | null; kind?: string }) => {
    if (!/^https?:\/\//i.test(value.url)) return;
    const key = comparableUrl(value.url);
    const existing = descriptorByUrl.get(key);
    if (existing) {
      if (!existing.lastPublishedAt && value.lastPublishedAt) existing.lastPublishedAt = value.lastPublishedAt;
      return;
    }
    descriptorByUrl.set(key, {
      label: value.label,
      url: value.url,
      publisher: value.publisher || safeHost(value.url),
      capturedAt: value.capturedAt || capturedAt,
      lastPublishedAt: value.lastPublishedAt || undefined,
      kind: value.kind || "website",
    });
  };

  raw.sources.forEach((source) => addSource(source));
  raw.socials.forEach((social) => addSource({ label: `${social.platform} account`, url: social.url, publisher: `${raw.name} on ${social.platform}`, kind: "official social" }));
  raw.observations.flatMap((observation) => observation.sourceUrls).forEach((url) => addSource({ label: "Observation source", url }));
  raw.whyNow?.sourceUrls.forEach((url) => addSource({ label: "Timing signal source", url }));
  raw.competitors.forEach((competitor) => addSource({ label: `${competitor.name} website`, url: competitor.url, publisher: competitor.name, kind: "competitor website" }));
  raw.outreach.evidenceUrls.forEach((url) => addSource({ label: "Outreach evidence", url }));
  if (raw.decisionMaker) addSource({ label: `${raw.decisionMaker.name} public leadership source`, url: raw.decisionMaker.sourceUrl });

  const sources: Source[] = [...descriptorByUrl.values()].map((descriptor, index) => {
    const automatedCheck = verification.sourceChecks.find((check) => comparableUrl(check.url) === comparableUrl(descriptor.url));
    const socialCheck = verification.socialChecks.find((check) => comparableUrl(check.url) === comparableUrl(descriptor.url));
    const isPrimaryWebsite = comparableUrl(descriptor.url) === comparableUrl(raw.website);
    const accessible = Boolean(automatedCheck?.reachable || socialCheck?.reachable || socialCheck?.listedOnWebsite || (isPrimaryWebsite && verification.website.reachable));
    const referenceDate = descriptor.lastPublishedAt || descriptor.capturedAt;
    return {
      id: `src-${raw.id}-${index + 1}`,
      label: descriptor.label,
      kind: sourceKind(descriptor.kind, descriptor.url),
      url: descriptor.url,
      publisher: descriptor.publisher,
      capturedAt: descriptor.capturedAt,
      lastPublishedAt: descriptor.lastPublishedAt,
      freshnessDays: ageInDays(referenceDate, capturedAt),
      accessible,
    };
  });

  const sourceIdsFor = (urls: string[]) => [...new Set(urls.map((url) => sources.find((source) => comparableUrl(source.url) === comparableUrl(url))?.id).filter((id): id is string => Boolean(id)))];
  const accessibleSourceIds = new Set(sources.filter((source) => source.accessible).map((source) => source.id));
  const evidence: Evidence[] = [];
  const addEvidence = (claim: string, detail: string, urls: string[], tags: string[], confidence: Confidence = "high", observedAt = capturedAt) => {
    const sourceIds = sourceIdsFor(urls);
    const hasAccessibleSource = sourceIds.some((sourceId) => accessibleSourceIds.has(sourceId));
    const id = `ev-${raw.id}-${evidence.length + 1}`;
    evidence.push({
      id,
      claim,
      detail,
      sourceIds,
      observedAt,
      confidence: hasAccessibleSource ? confidence : "low",
      verified: hasAccessibleSource,
      freshnessLabel: `Checked against public sources on ${capturedAt.slice(0, 10)}`,
      tags,
    });
    return id;
  };

  const observationEvidenceIds = raw.observations.map((observation) => addEvidence(
    observation.title,
    `${observation.detail} Implication: ${observation.implication}`,
    observation.sourceUrls,
    ["business-observation", "opportunity"],
  ));

  const whyNowEvidenceId = raw.whyNow ? addEvidence(
    raw.whyNow.title,
    raw.whyNow.detail,
    raw.whyNow.sourceUrls,
    ["why-now", "freshness"],
    raw.whyNow.date ? "high" : "medium",
    capturedAt,
  ) : undefined;

  const officialContactUrls = raw.sources
    .filter((source) => source.kind.toLowerCase().includes("official") && !source.kind.toLowerCase().includes("social"))
    .map((source) => source.url);
  const directoryContactUrls = raw.sources
    .filter((source) => source.kind.toLowerCase().includes("directory"))
    .map((source) => source.url);
  const corroboratingContactUrls = [...new Set([...officialContactUrls, ...directoryContactUrls])];
  const contactDetails = [raw.phone ? `Phone: ${raw.phone}` : null, raw.email ? `Email: ${raw.email}` : null].filter(Boolean).join(". ");
  const contactEvidenceId = contactDetails ? addEvidence(
    "Public business contact route",
    contactDetails,
    corroboratingContactUrls.length > 0 ? corroboratingContactUrls : [raw.website],
    ["contact", "public-business-data"],
  ) : undefined;

  const socialEvidenceIds = new Map<string, string>();
  raw.socials.forEach((social) => {
    socialEvidenceIds.set(comparableUrl(social.url), addEvidence(
      `Public ${social.platform} account`,
      `${social.handle || `${raw.name} on ${social.platform}`} is recorded as a public account for ${raw.name}.`,
      [social.url, raw.website],
      ["social", social.platform.toLowerCase()],
    ));
  });

  const decisionMakerEvidenceId = raw.decisionMaker ? addEvidence(
    `${raw.decisionMaker.name}, ${raw.decisionMaker.role}`,
    `This professionally relevant leadership context was published publicly and is included only to prepare respectful business outreach.`,
    [raw.decisionMaker.sourceUrl],
    ["decision-maker", "public-professional-context"],
  ) : undefined;

  const competitorEvidenceIds = new Map<string, string>();
  raw.competitors.forEach((competitor) => {
    competitorEvidenceIds.set(comparableUrl(competitor.url), addEvidence(
      `${competitor.name} comparison source`,
      `The public website was recorded as an industry and geography benchmark. No comparative performance metric was inferred.`,
      [competitor.url],
      ["competitor", "benchmark"],
      "medium",
    ));
  });

  const websiteCheckEvidenceIds = new Map<string, string>();
  verification.website.checks.forEach((check) => {
    websiteCheckEvidenceIds.set(check.id, addEvidence(
      `${check.label}: ${check.passed ? "detected" : "not detected"}`,
      check.observation,
      [raw.website],
      ["website-audit", check.id, check.passed ? "strength" : "opportunity"],
    ));
  });

  const normalizedDimensions = raw.scores.dimensions.flatMap((dimension) => {
    if (typeof dimension === "string") {
      const match = dimension.match(/^(.+?):\s*(\d+)\s*\/\s*(\d+)$/);
      if (!match) return [];
      return [{ scoreType: "contentFit", name: match[1], value: Number(match[2]), max: Number(match[3]), evidence: undefined as string | undefined }];
    }
    const scoreType = dimension.scoreType ?? (typeof dimension.score === "string" ? dimension.score : undefined);
    const value = dimension.value ?? (typeof dimension.score === "number" ? dimension.score : undefined);
    if (!scoreType || value === undefined) return [];
    return [{ scoreType, name: dimension.name, value, max: dimension.max, evidence: dimension.evidence }];
  });
  const allBusinessEvidenceIds = [...observationEvidenceIds, ...(whyNowEvidenceId ? [whyNowEvidenceId] : []), ...(contactEvidenceId ? [contactEvidenceId] : [])];
  const scorecard = (key: "contentFit" | "opportunity" | "response", label: string): ScoreCard => {
    const matchedDimensions = normalizedDimensions.filter((dimension) => dimension.scoreType.toLowerCase() === key.toLowerCase());
    const dimensions = matchedDimensions.length > 0 ? matchedDimensions : [{
      scoreType: key,
      name: `${label} aggregate`,
      value: raw.scores[key],
      max: 100,
      evidence: raw.scores.summary,
    }];
    const totalMax = dimensions.reduce((sum, dimension) => sum + dimension.max, 0) || 100;
    return {
      label,
      score: raw.scores[key],
      grade: grade(raw.scores[key]),
      summary: raw.scores.summary,
      calculatedAt: capturedAt,
      modelVersion: "Que Media evidence rubric v1.0",
      dimensions: dimensions.map((dimension, index) => {
        const name = dimension.name.toLowerCase();
        const linkedEvidence = name.includes("timing") && whyNowEvidenceId
          ? [whyNowEvidenceId]
          : (name.includes("contact") || name.includes("access")) && contactEvidenceId
            ? [contactEvidenceId]
            : name.includes("decision") && decisionMakerEvidenceId
              ? [decisionMakerEvidenceId]
              : observationEvidenceIds.length > 0
                ? [observationEvidenceIds[index % observationEvidenceIds.length]]
                : allBusinessEvidenceIds;
        return {
          key: `${key}-${slug(dimension.name)}`,
          label: dimension.name,
          score: Math.round((dimension.value / dimension.max) * 100),
          weight: dimension.max / totalMax,
          trend: "new",
          rationale: dimension.evidence || `${dimension.value} of ${dimension.max} rubric points were awarded from the linked public evidence.`,
          evidenceIds: linkedEvidence,
        };
      }),
    };
  };

  const websiteFindings: AuditFinding[] = verification.website.checks.map((check) => {
    const guidance = failedCheckGuidance[check.id] ?? {
      implication: "This affects the clarity or reliability of the public website experience.",
      recommendation: "Review the implementation against current customer and search needs.",
      severity: "medium" as const,
      effort: "medium" as const,
    };
    return {
      id: `web-${raw.id}-${check.id}`,
      title: check.label,
      observation: check.observation,
      implication: check.passed ? "This implementation supports a clearer public website experience." : guidance.implication,
      severity: check.passed ? "positive" : guidance.severity,
      effort: check.passed ? "small" : guidance.effort,
      evidenceIds: [websiteCheckEvidenceIds.get(check.id)].filter((id): id is string => Boolean(id)),
      recommendation: check.passed ? "Preserve this implementation during future site changes." : guidance.recommendation,
    };
  });
  const failedWebsiteFindings = websiteFindings.filter((finding) => finding.severity !== "positive");

  const verifiedSocialAccounts = raw.socials.flatMap((social) => {
    const platform = normalizePlatform(social.platform);
    if (!platform) return [];
    const verificationCheck = verification.socialChecks.find((check) => comparableUrl(check.url) === comparableUrl(social.url));
    return [{
      platform,
      handle: social.handle || `${raw.name} on ${social.platform}`,
      url: social.url,
      exists: true,
      postingCadence: "Not measured",
      note: verificationCheck?.listedOnWebsite
        ? "The account is linked from an official business page. Posting activity and performance were not measured."
        : "The public account URL was verified. Posting activity and performance were not measured.",
      sourceId: sources.find((source) => comparableUrl(source.url) === comparableUrl(social.url))?.id,
    }];
  });

  const requestedChannel = primaryChannel(raw);
  const contactChannels: ContactChannel[] = [];
  if (raw.email) contactChannels.push({ kind: "email", label: raw.emailLabel ?? "Public business email", value: raw.email, public: true, preferred: requestedChannel === "email" });
  if (raw.phone) contactChannels.push({ kind: "phone", label: "Public business phone", value: raw.phone, public: true, preferred: requestedChannel === "phone" });
  raw.socials.forEach((social) => {
    const platform = normalizePlatform(social.platform);
    if (platform !== "instagram" && platform !== "facebook" && platform !== "linkedin") return;
    contactChannels.push({
      kind: platform,
      label: `${social.platform} business account`,
      value: social.url,
      public: true,
      preferred: requestedChannel === (platform === "instagram" ? "instagram-dm" : platform),
    });
  });

  const personalizationEvidenceIds = [...new Set([
    ...sourceIdsFor(raw.outreach.evidenceUrls).flatMap((sourceId) => evidence.filter((item) => item.sourceIds.includes(sourceId)).map((item) => item.id)),
    ...observationEvidenceIds.slice(0, 2),
    ...(whyNowEvidenceId ? [whyNowEvidenceId] : []),
  ])];
  const firstObservation = raw.observations[0];
  const firstConcept = raw.concepts[0];
  const draftBase = {
    personalizationPoints: [raw.whyNow?.title, ...raw.observations.slice(0, 2).map((observation) => observation.title)].filter((value): value is string => Boolean(value)),
    evidenceIds: personalizationEvidenceIds,
    status: "needs-review" as const,
    tone: "Specific, conversational, and evidence-led",
    generatedAt: capturedAt,
  };
  const outreachDrafts: LeadProfile["outreachDrafts"] = [];
  if (raw.email) outreachDrafts.push({ id: `draft-${raw.id}-email`, channel: "email", subject: raw.outreach.subject, opening: raw.outreach.opening, body: raw.outreach.body, callToAction: raw.outreach.callToAction, ...draftBase });
  if (raw.socials.some((social) => normalizePlatform(social.platform) === "instagram")) outreachDrafts.push({
    id: `draft-${raw.id}-instagram`,
    channel: "instagram-dm",
    opening: `Hi ${raw.decisionMaker?.name.split(" ")[0] ?? raw.name} team, I was researching ${raw.name} for a small Ottawa content shortlist.`,
    body: `${firstObservation?.detail ?? raw.outreach.body} I mapped one specific short-form idea around it: ${firstConcept?.title ?? "a focused video concept"}. The opening would be "${firstConcept?.hook ?? raw.outreach.opening}".`,
    callToAction: raw.outreach.callToAction,
    ...draftBase,
  });
  if (raw.socials.some((social) => normalizePlatform(social.platform) === "linkedin")) outreachDrafts.push({
    id: `draft-${raw.id}-linkedin`,
    channel: "linkedin",
    subject: raw.outreach.subject,
    opening: raw.outreach.opening,
    body: `${raw.outreach.body} I can also share the outline for ${firstConcept?.title ?? "the first concept"} as a concrete starting point.`,
    callToAction: raw.outreach.callToAction,
    ...draftBase,
  });
  if (raw.socials.some((social) => normalizePlatform(social.platform) === "facebook")) outreachDrafts.push({
    id: `draft-${raw.id}-facebook`,
    channel: "facebook",
    opening: `Hi ${raw.name} team,`,
    body: `${firstObservation?.detail ?? raw.outreach.body} I sketched a Que Media short-form concept called "${firstConcept?.title ?? "a focused local video series"}" around that exact opportunity.`,
    callToAction: raw.outreach.callToAction,
    ...draftBase,
  });
  if (raw.phone) {
    outreachDrafts.push({
      id: `draft-${raw.id}-phone`,
      channel: "phone",
      opening: "Hi, this is [your name] from Que Media in Ottawa.",
      body: `I researched ${raw.name} before calling and noticed this: ${firstObservation?.detail ?? raw.outreach.body} I have a specific video idea, "${firstConcept?.title ?? "a focused short-form pilot"}", built around that observation.`,
      callToAction: raw.outreach.callToAction,
      ...draftBase,
    });
    outreachDrafts.push({
      id: `draft-${raw.id}-voicemail`,
      channel: "voicemail",
      opening: "Hi, this is [your name] from Que Media in Ottawa.",
      body: `I was looking at ${raw.name} and mapped a specific short-form idea around ${firstObservation?.title.toLowerCase() ?? "a current business opportunity"}: "${firstConcept?.title ?? "a focused video concept"}. This is not a mass outreach call. I can send the short outline so you can judge whether it is useful.`,
      callToAction: `You can reach me at [your number], or I can follow up through the public ${requestedChannel.replace("-", " ")} route.`,
      ...draftBase,
    });
  }
  outreachDrafts.push({
    id: `draft-${raw.id}-loom`,
    channel: "loom",
    subject: `${raw.name}: a researched short-form opportunity`,
    opening: `Hi ${raw.decisionMaker?.name.split(" ")[0] ?? raw.name} team. I made this short walkthrough after reviewing your public website and social presence.`,
    body: `The first observation is ${firstObservation?.detail ?? raw.outreach.body} The opportunity I would test is ${firstConcept?.title ?? "a focused short-form pilot"}. The opening hook is "${firstConcept?.hook ?? raw.outreach.opening}". The production path is: ${firstConcept?.outline.join(" ") ?? raw.outreach.body}`,
    callToAction: raw.outreach.callToAction,
    ...draftBase,
  });

  const decisionMakers = raw.decisionMaker ? [{
    id: `person-${raw.id}-1`,
    name: raw.decisionMaker.name,
    role: raw.decisionMaker.role,
    relevance: "Publicly identified leadership context can help route a respectful, business-relevant conversation.",
    publicContext: `The cited public source identifies this person as ${raw.decisionMaker.role}. No private or personal information is included.`,
    confidence: evidence.find((item) => item.id === decisionMakerEvidenceId)?.verified ? "high" as const : "medium" as const,
    channels: contactChannels,
    evidenceIds: [decisionMakerEvidenceId].filter((id): id is string => Boolean(id)),
  }] : [];

  const whyNowSignals = raw.whyNow ? [{
    id: `signal-${raw.id}-1`,
    title: raw.whyNow.title,
    description: raw.whyNow.detail,
    type: signalType(`${raw.whyNow.title} ${raw.whyNow.detail}`),
    strength: raw.whyNow.strength.toLowerCase() === "high" ? "strong" as const : raw.whyNow.strength.toLowerCase().includes("medium") ? "moderate" as const : "emerging" as const,
    occurredAt: whyNowOccurredAt,
    bestContactWindow: "Confirm the cited public signal is still current immediately before manual outreach.",
    evidenceIds: [whyNowEvidenceId].filter((id): id is string => Boolean(id)),
    suggestedAngle: raw.outreach.opening,
  }] : [];

  const contentFitScorecard = scorecard("contentFit", "Que Media content fit");
  const opportunityScorecard = scorecard("opportunity", "Opportunity");
  const responseScorecard = scorecard("response", "Response likelihood");
  const overview = `${raw.name} is an Ottawa-area ${raw.industry.toLowerCase()} business associated with ${raw.neighborhood || raw.location}. Its public offer includes ${raw.offerings.slice(0, 5).join(", ")}.`;
  const primaryDraftChannel = outreachDrafts.some((draft) => draft.channel === requestedChannel) ? requestedChannel : outreachDrafts[0]?.channel ?? "loom";
  const businessLogo = businessLogoById.get(raw.id);

  return {
    id: raw.id,
    name: raw.name,
    initials: raw.name.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase(),
    logoPath: businessLogo?.assetPath,
    logoSurface: businessLogo?.displaySurface,
    industry: raw.industry,
    neighborhood: raw.neighborhood,
    location: raw.location,
    summary: raw.scores.summary,
    stage: verification.outreachReady ? "outreach-ready" : "audit-ready",
    researchStatus: verification.outreachReady ? "ready" : "quality-review",
    priority: raw.scores.opportunity >= 85 ? "high" : raw.scores.opportunity >= 75 ? "medium" : "low",
    opportunityScore: raw.scores.opportunity,
    contentFitScore: raw.scores.contentFit,
    responseLikelihood: raw.scores.response,
    whyNow: raw.whyNow?.detail ?? "No current time-bounded business-change signal was verified. Use the evergreen fit and observed opportunity only.",
    topSignal: raw.whyNow?.title ?? "No verified current trigger",
    tags: ["Ottawa", raw.neighborhood, raw.whyNow ? "Current timing signal" : "Evergreen fit"].filter(Boolean),
    sourceCount: sources.length,
    evidenceCount: evidence.length,
    lastEnrichedAt: capturedAt,
    nextReviewAt: addDays(capturedAt, raw.whyNow ? 14 : 30),
    primaryChannel: primaryDraftChannel,
    thumbnailTone: tones[raw.name.length % tones.length],
    website: raw.website,
    identity: {
      displayName: raw.name,
      foundedYear: raw.foundedYear,
      ownership: raw.ownership ?? "Unavailable",
      employeeRange: "",
      locationCount: raw.locationCount,
      primaryLocation: raw.location,
      serviceArea: ["Ottawa, Ontario"],
      hours: [],
      offerings: raw.offerings,
      customerSegments: raw.customerSegments,
    },
    contactChannels,
    overview,
    likelyPainPoints: raw.observations.map((observation, index) => ({
      title: observation.title,
      explanation: `${observation.detail} ${observation.implication}`,
      confidence: observation.sourceUrls.length > 0 ? "high" as const : "medium" as const,
      evidenceIds: [observationEvidenceIds[index]],
    })),
    decisionMakers,
    opportunityScorecard,
    contentFitScorecard,
    responseScorecard,
    whyNowSignals,
    websiteAudit: {
      score: verification.website.score,
      auditedAt: capturedAt,
      url: raw.website,
      performance: [],
      sections: [{
        id: `website-surface-${raw.id}`,
        label: "Public website surface",
        score: verification.website.score,
        summary: "A transparent HTML-level check of access, discovery metadata, mobile declaration, page structure, contact action, social linking, and search markup. It is not a speed test.",
        strengths: websiteFindings.filter((finding) => finding.severity === "positive"),
        opportunities: failedWebsiteFindings,
      }],
      quickWins: failedWebsiteFindings.slice(0, 4).map((finding) => finding.recommendation),
      topOpportunity: failedWebsiteFindings[0]?.recommendation ?? "No missing HTML surface signal was detected. Performance, accessibility, conversion flow, and visual quality still require deeper live-browser testing.",
    },
    localSeoAudit: {
      auditedAt: capturedAt,
      primaryCategory: raw.industry,
      additionalCategories: [],
      rankObservations: [],
      sentimentThemes: [],
      findings: [],
    },
    socialIntelligence: {
      analyzedAt: capturedAt,
      accounts: verifiedSocialAccounts,
      contentMix: [],
      topPosts: [],
      productionQuality: [],
      brandConsistency: [],
      brandPersonality: [],
      missedOpportunities: raw.concepts.map((concept, index) => ({
        title: concept.title,
        rationale: raw.observations[index % raw.observations.length]?.implication ?? "This concept is grounded in the recorded business offer and audience.",
        potential: index === 0 ? "high" : "medium",
        format: "Short-form video",
        evidenceIds: [observationEvidenceIds[index % observationEvidenceIds.length]].filter((id): id is string => Boolean(id)),
      })),
      audienceQuestions: [],
    },
    competitors: raw.competitors.map((competitor) => ({
      id: `competitor-${raw.id}-${slug(competitor.name)}`,
      name: competitor.name,
      location: "Ottawa area",
      positioning: "Public local benchmark",
      whyRelevant: `Included as a public industry and geography benchmark for ${raw.name}. No unsupported performance comparison was added.`,
      metrics: [],
      advantages: [],
      vulnerabilities: [],
      evidenceIds: [competitorEvidenceIds.get(comparableUrl(competitor.url))].filter((id): id is string => Boolean(id)),
    })),
    recommendations: raw.concepts.map((concept, index) => {
      const observation = raw.observations[index % raw.observations.length];
      return {
        id: `recommendation-${raw.id}-${index + 1}`,
        title: concept.title,
        category: "content" as const,
        priority: index === 0 ? "high" as const : "medium" as const,
        impact: observation?.implication ?? "Create a specific, testable content asset tied to a current business goal.",
        observation: observation?.detail ?? raw.scores.summary,
        action: `Produce a tightly scoped short-form pilot using the "${concept.hook}" opening and the documented story beats.`,
        contentConcept: {
          format: "Short-form vertical video",
          hook: concept.hook,
          outline: concept.outline,
          productionNotes: concept.productionNotes,
          distribution: verifiedSocialAccounts.map((account) => account.platform),
          successMetric: "Track qualified inquiries, saves, profile actions, and offer-specific clicks without inventing a baseline.",
        },
        evidenceIds: [observationEvidenceIds[index % observationEvidenceIds.length]].filter((id): id is string => Boolean(id)),
      };
    }),
    outreachDrafts,
    objectionPlans: [
      {
        objection: "We already handle content internally.",
        likelihood: "medium",
        evidence: `The recommendation is a bounded pilot built around ${firstObservation?.title.toLowerCase() ?? "one observed opportunity"}, not a request to replace an internal team.`,
        response: "Acknowledge the existing capability, offer the researched concept as a small production test, and let the team judge it on strategic fit and execution quality.",
      },
      {
        objection: "How would this connect to business results?",
        likelihood: "medium",
        evidence: firstObservation?.implication ?? raw.scores.summary,
        response: "Tie the pilot to one public offer and one manual conversion path, then agree on qualified inquiries, bookings, visits, or clicks as the useful outcome before filming.",
      },
    ],
    relationshipTimeline: [
      {
        id: `timeline-${raw.id}-research`,
        occurredAt: capturedAt,
        type: "research",
        title: "Public-source intelligence package completed",
        detail: `${sources.length} source records and ${evidence.length} evidence records were reconciled for human review.`,
        actor: "Que Media Intelligence",
        nextAction: "Review the prepared outreach drafts and confirm every current signal immediately before manual contact.",
        evidenceIds: allBusinessEvidenceIds,
      },
      {
        id: `timeline-${raw.id}-audit`,
        occurredAt: capturedAt,
        type: "audit",
        title: "Website surface audit completed",
        detail: `The public website earned ${verification.website.score} of 100 on the documented HTML-level verification rubric. No performance speed metric was inferred.`,
        actor: "Que Media Intelligence",
        evidenceIds: [...websiteCheckEvidenceIds.values()],
      },
      ...(raw.whyNow ? [{
        id: `timeline-${raw.id}-signal`,
        occurredAt: whyNowOccurredAt,
        type: "signal" as const,
        title: raw.whyNow.title,
        detail: raw.whyNow.detail,
        actor: "Que Media Intelligence",
        evidenceIds: [whyNowEvidenceId].filter((id): id is string => Boolean(id)),
      }] : []),
    ],
    evidence,
    sources,
    executiveSummary: `${raw.name} is a ${raw.scores.contentFit}/100 fit for Que Media's content strengths and a ${raw.scores.opportunity}/100 opportunity. ${raw.scores.summary} ${raw.whyNow ? `The strongest current timing signal is ${raw.whyNow.title.toLowerCase()}.` : "No time-bounded trigger was manufactured where current evidence was unavailable."}`,
    nextBestAction: raw.whyNow
      ? `Review the ${primaryDraftChannel.replace("-", " ")} draft, recheck the current signal, and send manually if the timing still holds.`
      : `Review the ${primaryDraftChannel.replace("-", " ")} draft against the evidence and use an evergreen, observation-led opening without false urgency.`,
    reportReady: verification.outreachReady,
  };
}

export type { LeadVerification };
