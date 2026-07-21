import type {
  DashboardMetric,
  IntelligenceActivity,
  LeadProfile,
  LeadSummary,
  PipelineBucket,
} from "@/lib/types";
import { verifiedLeadProfiles, verifiedLeadSummaries } from "@/lib/verified-lead-data";

/**
 * Runtime records are built only from the verified research artifacts in
 * `research/`. No prospect, metric, activity, or outreach fixture is seeded.
 */
export const leadSummaries: LeadSummary[] = verifiedLeadSummaries;
export const leadProfiles: LeadProfile[] = verifiedLeadProfiles;
const reportReadyCount = leadProfiles.filter((lead) => lead.reportReady).length;
const currentSignalCount = leadProfiles.filter((lead) => lead.whyNowSignals.length > 0).length;
const sourceRecordCount = leadProfiles.reduce((sum, lead) => sum + lead.sources.length, 0);
const averageOpportunity = leadProfiles.length > 0 ? Math.round(leadProfiles.reduce((sum, lead) => sum + lead.opportunityScore, 0) / leadProfiles.length) : 0;

export const dashboardMetrics: DashboardMetric[] = [
  { id: "verified-leads", label: "Verified leads", value: leadProfiles.length, displayValue: String(leadProfiles.length), change: 0, changeLabel: "Current researched cohort", direction: "stable", helper: "Distinct Ottawa-market businesses that passed the source and contact gate." },
  { id: "outreach-ready", label: "Outreach ready", value: reportReadyCount, displayValue: String(reportReadyCount), change: 0, changeLabel: "Human review required", direction: "stable", helper: "Prepared profiles with no automatic send action." },
  { id: "current-signals", label: "Current signals", value: currentSignalCount, displayValue: String(currentSignalCount), change: 0, changeLabel: "Time-bounded evidence", direction: "stable", helper: "Profiles with a verified Why Now signal." },
  { id: "source-records", label: "Source records", value: sourceRecordCount, displayValue: String(sourceRecordCount), change: 0, changeLabel: "Public citations", direction: "stable", helper: "Source records attached across the verified cohort." },
];
export const pipelineSummary: PipelineBucket[] = leadProfiles.length > 0 ? [{ stage: "outreach-ready", label: "Outreach ready", count: reportReadyCount, scoreAverage: averageOpportunity }] : [];
export const intelligenceActivity: IntelligenceActivity[] = [];

export function getLeadSummary(id: string): LeadSummary | undefined {
  return leadSummaries.find((lead) => lead.id === id);
}

export function getLeadProfile(id: string): LeadProfile | undefined {
  return leadProfiles.find((lead) => lead.id === id);
}
