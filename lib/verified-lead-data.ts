import hospitalityRecords from "@/research/hospitality-leads.json";
import wellnessRecords from "@/research/wellness-leads.json";
import visualServiceRecords from "@/research/visual-service-leads.json";
import verificationReport from "@/research/verified-leads-audit.json";
import { buildVerifiedLeadProfile, type LeadVerification, type VerifiedLeadRecord } from "@/lib/verified-lead-factory";
import type { LeadSummary } from "@/lib/types";

const rawRecords = [
  ...hospitalityRecords,
  ...wellnessRecords,
  ...visualServiceRecords,
] as unknown as VerifiedLeadRecord[];

const audits = verificationReport.audits as unknown as LeadVerification[];

export const verifiedLeadProfiles = rawRecords.map((record) => {
  const verification = audits.find((audit) => audit.id === record.id);
  if (!verification) throw new Error(`Missing verification audit for ${record.id}`);
  return buildVerifiedLeadProfile(record, verification);
});

export const verifiedLeadSummaries: LeadSummary[] = verifiedLeadProfiles.map((profile) => ({
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
}));

export const leadVerificationSummary = verificationReport.summary;
