import "server-only";

import type {
  EmailVerificationStatus,
  LeadQualityScore,
  LeadScoreFactor,
  ResearchLeadInput,
} from "@/lib/operating-types";
import type { LeadProfile } from "@/lib/types";
import { nowIso } from "@/lib/server/time";

const factorWeights = {
  recency: 12,
  openingOrExpansion: 12,
  marketingNeed: 12,
  queMediaFit: 14,
  decisionMakerAccess: 8,
  emailReliability: 12,
  socialOpportunity: 6,
  websiteOpportunity: 6,
  likelyBudget: 7,
  businessScale: 5,
  urgency: 3,
  evidenceStrength: 3,
} as const;

const factorLabels: Record<keyof typeof factorWeights, string> = {
  recency: "Opportunity recency",
  openingOrExpansion: "Opening or expansion activity",
  marketingNeed: "Marketing need",
  queMediaFit: "Q Media service fit",
  decisionMakerAccess: "Decision-maker access",
  emailReliability: "Email availability and reliability",
  socialOpportunity: "Social-media opportunity",
  websiteOpportunity: "Website opportunity",
  likelyBudget: "Likely commercial capacity",
  businessScale: "Business scale",
  urgency: "Outreach urgency",
  evidenceStrength: "Evidence strength",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function grade(score: number): LeadQualityScore["grade"] {
  if (score >= 93) return "A+";
  if (score >= 87) return "A";
  if (score >= 82) return "B+";
  if (score >= 76) return "B";
  if (score >= 70) return "C+";
  if (score >= 62) return "C";
  return "D";
}

function buildScore(factors: LeadScoreFactor[], calculatedAt = nowIso()): LeadQualityScore {
  const score = Math.round(
    factors.reduce((total, factor) => total + factor.score, 0),
  );
  const strongest = [...factors]
    .sort(
      (a, b) =>
        b.score / b.maxScore - a.score / a.maxScore ||
        b.maxScore - a.maxScore,
    )
    .slice(0, 3)
    .map((factor) => factor.label.toLowerCase());
  const missing = factors.filter((factor) => factor.missing).length;
  return {
    score,
    grade: grade(score),
    version: "qmi-lead-quality-v1.0",
    calculatedAt,
    summary: `Ranked from ${factors.length} visible factors. Strongest signals: ${strongest.join(
      ", ",
    )}.${missing ? ` ${missing} factor${missing === 1 ? "" : "s"} include a missing-data penalty.` : ""}`,
    factors,
  };
}

function evidenceFor(profile: LeadProfile, terms: string[]) {
  const matches = profile.evidence
    .filter((item) => {
      const haystack = `${item.claim} ${item.detail} ${item.tags.join(" ")}`.toLowerCase();
      return terms.some((term) => haystack.includes(term));
    })
    .map((item) => item.id);
  return matches.length ? matches.slice(0, 4) : profile.evidence.slice(0, 2).map((item) => item.id);
}

function emailPoints(status: EmailVerificationStatus) {
  if (status === "verified") return 12;
  if (status === "usable") return 9;
  if (status === "unverified") return 4;
  return 0;
}

export function calculateProfileQualityScore(
  profile: LeadProfile,
  emailStatus: EmailVerificationStatus,
): LeadQualityScore {
  const timingSignal = profile.whyNowSignals[0];
  const timely =
    timingSignal &&
    Date.now() - new Date(timingSignal.occurredAt).getTime() <=
      120 * 24 * 60 * 60 * 1000;
  const changeTypes = new Set([
    "opening",
    "expansion",
    "service-launch",
    "marketing-change",
  ]);
  const websiteScore = profile.websiteAudit.score;
  const hasDecisionMaker = profile.decisionMakers.length > 0;
  const socialCount = profile.socialIntelligence.accounts.filter(
    (account) => account.exists,
  ).length;
  const scaleKnown =
    Boolean(profile.identity.locationCount) ||
    Boolean(profile.identity.employeeRange.trim());

  return buildScore(
    [
      {
        key: "recency",
        label: factorLabels.recency,
        score: timely ? 11 : timingSignal ? 7 : 3,
        maxScore: factorWeights.recency,
        rationale: timely
          ? "A dated, current opportunity signal is attached to the record."
          : timingSignal
            ? "A timing signal exists, but it is not within the strongest recency window."
            : "No time-bounded signal is recorded, so the lead receives an evergreen-fit score only.",
        evidenceIds: evidenceFor(profile, ["signal", "why now", "opening", "expansion"]),
        missing: !timingSignal,
      },
      {
        key: "openingOrExpansion",
        label: factorLabels.openingOrExpansion,
        score: timingSignal
          ? changeTypes.has(timingSignal.type)
            ? 11
            : 7
          : 2,
        maxScore: factorWeights.openingOrExpansion,
        rationale: timingSignal
          ? changeTypes.has(timingSignal.type)
            ? `The record contains a verified ${timingSignal.type.replace("-", " ")} signal.`
            : "The current signal is useful but is not a confirmed opening, expansion, or service launch."
          : "No opening or expansion activity is confirmed.",
        evidenceIds: timingSignal?.evidenceIds ?? [],
        missing: !timingSignal,
      },
      {
        key: "marketingNeed",
        label: factorLabels.marketingNeed,
        score: Math.round((profile.opportunityScore / 100) * factorWeights.marketingNeed),
        maxScore: factorWeights.marketingNeed,
        rationale: `${profile.likelyPainPoints.length} evidence-backed marketing observation${profile.likelyPainPoints.length === 1 ? " is" : "s are"} recorded.`,
        evidenceIds: profile.likelyPainPoints.flatMap((item) => item.evidenceIds).slice(0, 4),
        missing: profile.likelyPainPoints.length === 0,
      },
      {
        key: "queMediaFit",
        label: factorLabels.queMediaFit,
        score: Math.round((profile.contentFitScore / 100) * factorWeights.queMediaFit),
        maxScore: factorWeights.queMediaFit,
        rationale: profile.contentFitScorecard.summary,
        evidenceIds: profile.contentFitScorecard.dimensions.flatMap((item) => item.evidenceIds).slice(0, 4),
        missing: false,
      },
      {
        key: "decisionMakerAccess",
        label: factorLabels.decisionMakerAccess,
        score: hasDecisionMaker ? 8 : 2,
        maxScore: factorWeights.decisionMakerAccess,
        rationale: hasDecisionMaker
          ? "A publicly documented, professionally relevant decision-maker is recorded."
          : "No decision-maker has been verified; outreach may require routing through a general business channel.",
        evidenceIds: profile.decisionMakers.flatMap((person) => person.evidenceIds).slice(0, 3),
        missing: !hasDecisionMaker,
      },
      {
        key: "emailReliability",
        label: factorLabels.emailReliability,
        score: emailPoints(emailStatus),
        maxScore: factorWeights.emailReliability,
        rationale:
          emailStatus === "verified"
            ? "The primary email is a verified public business route."
            : emailStatus === "usable"
              ? "A usable business email is recorded but still needs a final verification check."
              : emailStatus === "unverified"
                ? "An email is recorded, but its routing or verification is uncertain."
                : "No usable email is recorded, so this lead cannot count toward the email-ready target.",
        evidenceIds: evidenceFor(profile, ["email", "contact"]),
        missing: emailStatus === "unavailable",
      },
      {
        key: "socialOpportunity",
        label: factorLabels.socialOpportunity,
        score: socialCount > 0 ? 4 : 2,
        maxScore: factorWeights.socialOpportunity,
        rationale:
          socialCount > 0
            ? `${socialCount} public social account${socialCount === 1 ? " is" : "s are"} available for content review. Performance is not inferred.`
            : "No verified public social account is available for a deeper opportunity assessment.",
        evidenceIds: evidenceFor(profile, ["social", "instagram", "facebook", "tiktok"]),
        missing: socialCount === 0,
      },
      {
        key: "websiteOpportunity",
        label: factorLabels.websiteOpportunity,
        score:
          typeof websiteScore === "number"
            ? websiteScore < 70
              ? 6
              : websiteScore < 86
                ? 5
                : 3
            : 2,
        maxScore: factorWeights.websiteOpportunity,
        rationale:
          typeof websiteScore === "number"
            ? `The documented HTML-level website score is ${websiteScore}/100; lower scores indicate more visible improvement room.`
            : "A website opportunity score is unavailable.",
        evidenceIds: profile.websiteAudit.sections.flatMap((section) =>
          [...section.opportunities, ...section.strengths].flatMap((finding) => finding.evidenceIds),
        ).slice(0, 4),
        missing: typeof websiteScore !== "number",
      },
      {
        key: "likelyBudget",
        label: factorLabels.likelyBudget,
        score: Math.round((profile.opportunityScore / 100) * factorWeights.likelyBudget),
        maxScore: factorWeights.likelyBudget,
        rationale:
          "Commercial capacity is estimated conservatively from the existing opportunity rubric; no private financial claim is made.",
        evidenceIds: profile.opportunityScorecard.dimensions.flatMap((item) => item.evidenceIds).slice(0, 3),
        missing: false,
      },
      {
        key: "businessScale",
        label: factorLabels.businessScale,
        score: scaleKnown
          ? profile.identity.locationCount && profile.identity.locationCount > 1
            ? 5
            : 4
          : 3,
        maxScore: factorWeights.businessScale,
        rationale: scaleKnown
          ? "Public profile data provides a usable business-scale signal."
          : "Business size is not documented; the model uses a neutral score instead of inventing a team or revenue estimate.",
        evidenceIds: evidenceFor(profile, ["location", "team", "ownership"]),
        missing: !scaleKnown,
      },
      {
        key: "urgency",
        label: factorLabels.urgency,
        score: timely ? 3 : timingSignal ? 2 : 1,
        maxScore: factorWeights.urgency,
        rationale: timely
          ? "The current signal supports prompt review."
          : "No immediate deadline is asserted.",
        evidenceIds: timingSignal?.evidenceIds ?? [],
        missing: !timingSignal,
      },
      {
        key: "evidenceStrength",
        label: factorLabels.evidenceStrength,
        score:
          profile.sources.length >= 5
            ? 3
            : profile.sources.length >= 2
              ? 2
              : 0,
        maxScore: factorWeights.evidenceStrength,
        rationale: `${profile.sources.length} source records and ${profile.evidence.length} evidence records support this profile.`,
        evidenceIds: profile.evidence.slice(0, 4).map((item) => item.id),
        missing: profile.sources.length < 2,
      },
    ],
    profile.lastEnrichedAt,
  );
}

export function calculateResearchInputQualityScore(
  input: ResearchLeadInput,
  evidenceIdsByUrl: Map<string, string>,
): LeadQualityScore {
  const evidenceIds = (terms: string[]) =>
    input.evidence
      .filter((item) =>
        item.supports.some((claim) =>
          terms.some((term) => claim.toLowerCase().includes(term)),
        ),
      )
      .map((item) => evidenceIdsByUrl.get(item.url))
      .filter((id): id is string => Boolean(id))
      .slice(0, 4);

  const rationales: Record<keyof typeof factorWeights, string> = {
    recency: "How recently the opportunity or business-change signal occurred.",
    openingOrExpansion: `Business status is recorded as ${input.business.status.replaceAll("-", " ")}.`,
    marketingNeed: `${input.likelyMarketingNeeds.length} specific marketing need${input.likelyMarketingNeeds.length === 1 ? " is" : "s are"} recorded.`,
    queMediaFit: input.fitReason,
    decisionMakerAccess: input.decisionMakers.length
      ? `${input.decisionMakers.length} public decision-maker record${input.decisionMakers.length === 1 ? " is" : "s are"} attached.`
      : "No public decision-maker has been identified.",
    emailReliability: input.contacts.some(
      (contact) =>
        contact.kind === "email" &&
        ["verified", "verified-public", "usable"].includes(contact.verificationStatus),
    )
      ? "A verified or usable public business email is recorded."
      : "No verified or usable email is recorded.",
    socialOpportunity: `${input.socialProfiles.length} public social profile${input.socialProfiles.length === 1 ? " is" : "s are"} recorded for review.`,
    websiteOpportunity: input.business.website
      ? "An official website is available for a conversion and content review."
      : "No official website is recorded.",
    likelyBudget: "A decision-support estimate only; no private financial claim is stored.",
    businessScale: "A decision-support estimate based only on public business context.",
    urgency: `Researcher urgency is ${input.urgency}.`,
    evidenceStrength: `${input.evidence.length} direct source records support the submission.`,
  };

  const termMap: Record<keyof typeof factorWeights, string[]> = {
    recency: ["date", "recent", "opening", "launch"],
    openingOrExpansion: ["opening", "expansion", "relocation", "launch"],
    marketingNeed: ["marketing", "website", "social", "content"],
    queMediaFit: ["fit", "content", "video", "marketing"],
    decisionMakerAccess: ["owner", "decision", "founder", "manager"],
    emailReliability: ["email", "contact"],
    socialOpportunity: ["social", "instagram", "facebook", "tiktok"],
    websiteOpportunity: ["website", "seo", "conversion"],
    likelyBudget: ["size", "location", "commercial"],
    businessScale: ["size", "location", "team"],
    urgency: ["urgent", "opening", "date", "launch"],
    evidenceStrength: [],
  };

  const factors = (
    Object.keys(factorWeights) as Array<keyof typeof factorWeights>
  ).map((key) => {
    const rawValue = clamp(input.scoreInputs[key], 0, 5);
    const maxScore = factorWeights[key];
    return {
      key,
      label: factorLabels[key],
      score: Math.round((rawValue / 5) * maxScore),
      maxScore,
      rationale: rationales[key],
      evidenceIds:
        key === "evidenceStrength"
          ? [...evidenceIdsByUrl.values()].slice(0, 4)
          : evidenceIds(termMap[key]),
      missing: rawValue === 0,
    };
  });

  return buildScore(factors, input.trace.researchedAt);
}

export const leadQualityWeights = factorWeights;
