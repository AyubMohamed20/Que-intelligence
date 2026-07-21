/**
 * Shared domain types for Que Media Intelligence.
 *
 * The product is research and preparation software. None of these types model
 * automated sending because every outreach action must remain human reviewed.
 */

export type ISODate = string;
export type Confidence = "low" | "medium" | "high";
export type Trend = "up" | "down" | "stable" | "new";
export type Priority = "urgent" | "high" | "medium" | "low";
export type Severity = "critical" | "high" | "medium" | "low" | "positive";
export type ResearchStatus =
  | "discovered"
  | "researching"
  | "quality-review"
  | "ready"
  | "monitoring";

export type LeadStage =
  | "watchlist"
  | "qualified"
  | "audit-ready"
  | "outreach-ready"
  | "contacted"
  | "conversation"
  | "proposal"
  | "client"
  | "not-a-fit";

export type SourceKind =
  | "website"
  | "google-business"
  | "instagram"
  | "tiktok"
  | "facebook"
  | "youtube"
  | "linkedin"
  | "x"
  | "threads"
  | "pinterest"
  | "directory"
  | "local-news"
  | "job-board"
  | "public-record"
  | "manual-note"
  | "derived-analysis";

export interface Source {
  id: string;
  label: string;
  kind: SourceKind;
  url: string;
  publisher: string;
  capturedAt: ISODate;
  lastPublishedAt?: ISODate;
  freshnessDays: number;
  accessible: boolean;
}

export interface Evidence {
  id: string;
  claim: string;
  detail: string;
  sourceIds: string[];
  observedAt: ISODate;
  confidence: Confidence;
  verified: boolean;
  freshnessLabel: string;
  tags: string[];
}

export interface ContactChannel {
  kind: "email" | "phone" | "linkedin" | "instagram" | "facebook";
  label: string;
  value: string;
  public: boolean;
  preferred?: boolean;
}

export interface DecisionMaker {
  id: string;
  name: string;
  role: string;
  relevance: string;
  publicContext: string;
  confidence: Confidence;
  channels: ContactChannel[];
  evidenceIds: string[];
}

export interface BusinessHours {
  day: string;
  hours: string;
}

export interface BusinessIdentity {
  legalName?: string;
  displayName: string;
  foundedYear?: number;
  ownership: string;
  employeeRange: string;
  locationCount?: number;
  primaryLocation: string;
  serviceArea: string[];
  hours: BusinessHours[];
  offerings: string[];
  customerSegments: string[];
}

export interface ScoreDimension {
  key: string;
  label: string;
  score: number;
  weight: number;
  trend: Trend;
  rationale: string;
  evidenceIds: string[];
}

export interface ScoreCard {
  label: string;
  score: number;
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D";
  summary: string;
  calculatedAt: ISODate;
  modelVersion: string;
  dimensions: ScoreDimension[];
}

export interface WhyNowSignal {
  id: string;
  title: string;
  description: string;
  type:
    | "opening"
    | "expansion"
    | "hiring"
    | "campaign"
    | "seasonal"
    | "event"
    | "milestone"
    | "competitor"
    | "service-launch"
    | "marketing-change";
  strength: "strong" | "moderate" | "emerging";
  occurredAt: ISODate;
  bestContactWindow: string;
  expiresAt?: ISODate;
  evidenceIds: string[];
  suggestedAngle: string;
}

export interface AuditFinding {
  id: string;
  title: string;
  observation: string;
  implication: string;
  severity: Severity;
  effort: "small" | "medium" | "large";
  evidenceIds: string[];
  recommendation: string;
}

export interface AuditSection {
  id: string;
  label: string;
  score: number;
  summary: string;
  strengths: AuditFinding[];
  opportunities: AuditFinding[];
}

export interface PerformanceMetric {
  label: string;
  value: number;
  unit: string;
  assessment: "good" | "needs-attention" | "poor";
}

export interface WebsiteAudit {
  score?: number;
  auditedAt: ISODate;
  url: string;
  performance: PerformanceMetric[];
  sections: AuditSection[];
  quickWins: string[];
  topOpportunity: string;
}

export interface ReviewSentimentTheme {
  theme: string;
  sentiment: "positive" | "mixed" | "negative";
  mentionCount: number;
  exampleSummary: string;
}

export interface LocalSeoAudit {
  score?: number;
  auditedAt: ISODate;
  primaryCategory: string;
  additionalCategories: string[];
  rating?: number;
  reviewCount?: number;
  reviewVelocityPerMonth?: number;
  ownerResponseRate?: number;
  photoCount?: number;
  lastPostAt?: ISODate;
  napConsistency?: number;
  profileCompleteness?: number;
  rankObservations: Array<{
    query: string;
    area: string;
    position: number | null;
    note: string;
  }>;
  sentimentThemes: ReviewSentimentTheme[];
  findings: AuditFinding[];
}

export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "facebook"
  | "youtube"
  | "linkedin"
  | "pinterest"
  | "threads"
  | "x";

export interface SocialAccount {
  platform: SocialPlatform;
  handle: string;
  url: string;
  exists: boolean;
  active?: boolean;
  followers?: number;
  postsLast30Days?: number;
  averageEngagementRate?: number;
  postingCadence: string;
  lastPostAt?: ISODate;
  trend?: Trend;
  effectivenessScore?: number;
  note: string;
  sourceId?: string;
}

export type ContentCategory =
  | "educational"
  | "entertaining"
  | "promotional"
  | "behind-the-scenes"
  | "staff"
  | "customer-story"
  | "testimonial"
  | "trend"
  | "faq"
  | "transformation"
  | "tour"
  | "product-showcase"
  | "founder-story"
  | "community"
  | "seasonal"
  | "process";

export interface ContentMixItem {
  category: ContentCategory;
  label: string;
  postCount: number;
  share: number;
  averageEngagementRate: number;
  assessment: string;
}

export interface TopContentPost {
  id: string;
  platform: SocialPlatform;
  publishedAt: ISODate;
  title: string;
  format: string;
  category: ContentCategory;
  views?: number;
  likes: number;
  comments: number;
  shares?: number;
  engagementRate: number;
  hook: string;
  firstThreeSeconds: string;
  visualTechnique: string;
  pacing: string;
  callToAction: string;
  whyItWorked: string;
  audienceReaction: string;
  evidenceIds: string[];
}

export interface CraftScore {
  dimension: string;
  score: number;
  observation: string;
  evidenceIds: string[];
}

export interface BrandTrait {
  trait: string;
  confidence: number;
  evidence: string;
}

export interface SocialIntelligence {
  score?: number;
  analyzedAt: ISODate;
  accounts: SocialAccount[];
  contentMix: ContentMixItem[];
  topPosts: TopContentPost[];
  productionQuality: CraftScore[];
  brandConsistency: CraftScore[];
  brandPersonality: BrandTrait[];
  missedOpportunities: Array<{
    title: string;
    rationale: string;
    potential: "high" | "medium" | "low";
    format: string;
    evidenceIds: string[];
  }>;
  audienceQuestions: string[];
}

export interface CompetitorMetric {
  key: string;
  label: string;
  targetValue: number;
  competitorValue: number;
  unit: string;
  winner: "target" | "competitor" | "tie";
  explanation: string;
}

export interface CompetitorComparison {
  id: string;
  name: string;
  location: string;
  positioning: string;
  whyRelevant: string;
  overallScore?: number;
  metrics: CompetitorMetric[];
  advantages: string[];
  vulnerabilities: string[];
  evidenceIds: string[];
}

export interface Recommendation {
  id: string;
  title: string;
  category: "content" | "website" | "local-seo" | "brand" | "conversion" | "campaign";
  priority: Priority;
  impact: string;
  observation: string;
  action: string;
  contentConcept?: {
    format: string;
    hook: string;
    outline: string[];
    productionNotes: string;
    distribution: string[];
    successMetric: string;
  };
  evidenceIds: string[];
}

export type OutreachChannel =
  | "email"
  | "instagram-dm"
  | "linkedin"
  | "facebook"
  | "phone"
  | "voicemail"
  | "loom";

export interface OutreachDraft {
  id: string;
  channel: OutreachChannel;
  subject?: string;
  opening: string;
  body: string;
  callToAction: string;
  personalizationPoints: string[];
  evidenceIds: string[];
  status: "draft" | "needs-review" | "approved";
  tone: string;
  generatedAt: ISODate;
}

export interface ObjectionPlan {
  objection: string;
  likelihood: "high" | "medium" | "low";
  evidence: string;
  response: string;
}

export interface RelationshipEvent {
  id: string;
  occurredAt: ISODate;
  type:
    | "discovered"
    | "research"
    | "signal"
    | "audit"
    | "note"
    | "outreach"
    | "reply"
    | "meeting"
    | "proposal"
    | "status-change";
  title: string;
  detail: string;
  actor: string;
  nextAction?: string;
  evidenceIds?: string[];
}

export interface LeadSummary {
  id: string;
  name: string;
  initials: string;
  logoPath?: string;
  logoSurface?: "light" | "dark";
  industry: string;
  neighborhood: string;
  location: string;
  summary: string;
  stage: LeadStage;
  researchStatus: ResearchStatus;
  priority: Priority;
  opportunityScore: number;
  contentFitScore: number;
  responseLikelihood: number;
  whyNow: string;
  topSignal: string;
  tags: string[];
  sourceCount: number;
  evidenceCount: number;
  lastEnrichedAt: ISODate;
  nextReviewAt: ISODate;
  primaryChannel: OutreachChannel;
  thumbnailTone: string;
}

export interface LeadProfile extends LeadSummary {
  website: string;
  identity: BusinessIdentity;
  contactChannels: ContactChannel[];
  overview: string;
  likelyPainPoints: Array<{
    title: string;
    explanation: string;
    confidence: Confidence;
    evidenceIds: string[];
  }>;
  decisionMakers: DecisionMaker[];
  opportunityScorecard: ScoreCard;
  contentFitScorecard: ScoreCard;
  responseScorecard: ScoreCard;
  whyNowSignals: WhyNowSignal[];
  websiteAudit: WebsiteAudit;
  localSeoAudit: LocalSeoAudit;
  socialIntelligence: SocialIntelligence;
  competitors: CompetitorComparison[];
  recommendations: Recommendation[];
  outreachDrafts: OutreachDraft[];
  objectionPlans: ObjectionPlan[];
  relationshipTimeline: RelationshipEvent[];
  evidence: Evidence[];
  sources: Source[];
  executiveSummary: string;
  nextBestAction: string;
  reportReady: boolean;
}

export interface DashboardMetric {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  change: number;
  changeLabel: string;
  direction: Trend;
  helper: string;
}

export interface PipelineBucket {
  stage: LeadStage;
  label: string;
  count: number;
  scoreAverage: number;
}

export interface IntelligenceActivity {
  id: string;
  occurredAt: ISODate;
  agentId: string;
  leadId?: string;
  title: string;
  detail: string;
  type: "discovery" | "enrichment" | "audit" | "signal" | "quality" | "draft";
  confidence: Confidence;
}

export interface AgentRun {
  id: string;
  startedAt: ISODate;
  completedAt?: ISODate;
  leadId?: string;
  status: "queued" | "running" | "completed" | "review-needed" | "failed";
  summary: string;
  itemsReviewed: number;
  findingsCreated: number;
}

export interface ResearchAgent {
  id: string;
  name: string;
  shortName: string;
  role: string;
  description: string;
  stage: "discover" | "enrich" | "analyze" | "strategize" | "validate" | "prepare";
  status: "active" | "working" | "waiting" | "review-needed";
  icon: string;
  accent: string;
  capabilities: string[];
  reviewsAgentIds: string[];
  reviewedByAgentIds: string[];
  lastRunAt?: ISODate;
  nextRunAt?: ISODate;
  runCountToday: number;
  averageConfidence: number;
  runs: AgentRun[];
}

export type ConnectorCategory =
  | "discovery"
  | "web"
  | "social"
  | "local-seo"
  | "business-data"
  | "news"
  | "hiring"
  | "performance";

export interface Connector {
  id: string;
  name: string;
  category: ConnectorCategory;
  description: string;
  status: "connected" | "limited" | "setup-required" | "planned";
  accessMode: "api" | "public-web" | "browser" | "manual-import" | "rss";
  freshness: string;
  coverage: string;
  lastSyncAt?: ISODate;
  recordsLastSync?: number;
  supports: string[];
  limitation?: string;
}
