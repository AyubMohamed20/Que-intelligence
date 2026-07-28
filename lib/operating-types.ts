import type {
  Confidence,
  LeadProfile,
  LeadSummary,
  Priority,
  RelationshipEvent,
} from "@/lib/types";

export type LifecycleStatus =
  | "researched"
  | "qualified"
  | "ready-for-outreach"
  | "contacted"
  | "follow-up-due"
  | "replied"
  | "interested"
  | "meeting-booked"
  | "not-interested"
  | "invalid-contact"
  | "disqualified"
  | "closed";

export type QualificationStatus =
  | "pending-review"
  | "qualified"
  | "disqualified";

export type OpeningStatus =
  | "opening-soon"
  | "recently-opened"
  | "established"
  | "relocating"
  | "rebranding"
  | "expanding"
  | "reopening"
  | "renovating"
  | "new-service"
  | "unknown";

export type EmailProvenance =
  | "official"
  | "inferred"
  | "third-party-listed"
  | "unavailable";

export type EmailVerificationStatus =
  | "verified"
  | "usable"
  | "unverified"
  | "invalid"
  | "unavailable";

export type EmailContactType =
  | "role-based"
  | "personal-business"
  | "general-business"
  | "unknown";

export type ReplyStatus =
  | "none"
  | "received"
  | "positive"
  | "negative"
  | "automatic";

export type FollowUpStatus =
  | "not-required"
  | "scheduled"
  | "due"
  | "completed"
  | "paused";

export type OutreachSendingStatus =
  | "draft"
  | "approved"
  | "submitting"
  | "queued"
  | "sent"
  | "delivered"
  | "replied"
  | "bounced"
  | "failed"
  | "cancelled";

export type ActorType =
  | "human"
  | "codex"
  | "claude-code"
  | "research-agent"
  | "instantly-webhook"
  | "instantly-sync"
  | "system"
  | "api";

export interface LeadScoreFactor {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  rationale: string;
  evidenceIds: string[];
  missing: boolean;
}

export interface LeadQualityScore {
  score: number;
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C" | "D";
  version: string;
  calculatedAt: string;
  summary: string;
  factors: LeadScoreFactor[];
}

export interface OperationalLeadState {
  leadId: string;
  lifecycleStatus: LifecycleStatus;
  qualificationStatus: QualificationStatus;
  qualificationReason: string;
  openingStatus: OpeningStatus;
  openingDate?: string;
  openingDateConfidence: Confidence;
  primaryEmail?: string;
  emailProvenance: EmailProvenance;
  emailVerificationStatus: EmailVerificationStatus;
  emailContactType: EmailContactType;
  emailLastVerifiedAt?: string;
  addedAt: string;
  qualifiedAt?: string;
  lastContactAt?: string;
  lastReplyAt?: string;
  replyStatus: ReplyStatus;
  followUpStatus: FollowUpStatus;
  nextAction: string;
  nextActionDueAt?: string;
  assignedTo?: string;
  internalNotes: string;
  sourceActorType: ActorType;
  sourceActorId: string;
  sourceBatchId?: string;
  qualityScore: LeadQualityScore;
  createdAt: string;
  updatedAt: string;
}

export interface OutreachAction {
  id: string;
  leadId: string;
  idempotencyKey: string;
  recipientEmail: string;
  senderAccount: string;
  instantlyCampaignId: string;
  instantlyCampaignName: string;
  subject: string;
  messageBody: string;
  messageVersion: number;
  personalizationVariables: Record<string, string>;
  evidenceIds: string[];
  approvedBy: string;
  approvedAt: string;
  status: OutreachSendingStatus;
  instantlyLeadId?: string;
  instantlyEmailId?: string;
  deliveryStatus: string;
  replyStatus: ReplyStatus;
  replyDate?: string;
  latestResponse?: string;
  followUpStatus: FollowUpStatus;
  nextAction: string;
  errorCode?: string;
  errorMessage?: string;
  firstSentAt?: string;
  localDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityEvent {
  id: string;
  leadId?: string;
  occurredAt: string;
  localDate: string;
  type:
    | "lead-created"
    | "lead-updated"
    | "qualification"
    | "status-change"
    | "research"
    | "evidence"
    | "message-approved"
    | "send-attempt"
    | "outreach"
    | "delivery"
    | "reply"
    | "meeting"
    | "note"
    | "sync"
    | "error";
  title: string;
  detail: string;
  actorId: string;
  actorType: ActorType;
  metadata: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  occurredAt: string;
  actorId: string;
  actorType: ActorType;
  action: string;
  resourceType: string;
  resourceId: string;
  outcome: "success" | "blocked" | "failed";
  detail: string;
  metadata: Record<string, unknown>;
}

export interface OperatingLeadSummary extends LeadSummary {
  lifecycleStatus: LifecycleStatus;
  qualificationStatus: QualificationStatus;
  openingStatus: OpeningStatus;
  openingDate?: string;
  leadQualityScore: number;
  leadQualityGrade: LeadQualityScore["grade"];
  leadQualityReasons: string[];
  primaryEmail?: string;
  emailVerificationStatus: EmailVerificationStatus;
  emailProvenance: EmailProvenance;
  lastContactAt?: string;
  lastReplyAt?: string;
  replyStatus: ReplyStatus;
  followUpStatus: FollowUpStatus;
  nextAction: string;
  nextActionDueAt?: string;
  addedAt: string;
  assignedTo?: string;
  searchableText: string;
}

export interface OperatingLeadProfile extends LeadProfile {
  operations: OperationalLeadState;
  outreachHistory: OutreachAction[];
  operationalTimeline: ActivityEvent[];
  relationshipTimeline: RelationshipEvent[];
}

export interface DailyPerformancePoint {
  date: string;
  researched: number;
  qualified: number;
  emailReady: number;
  contacted: number;
  followUps: number;
  replies: number;
  positiveReplies: number;
  meetings: number;
  errors: number;
}

export interface DailyOutreachDashboard {
  date: string;
  timezone: string;
  target: number;
  qualifiedAddedToday: number;
  emailReadyQualifiedToday: number;
  totalEmailReadyQualified: number;
  newBusinessesContactedToday: number;
  remainingToTarget: number;
  targetAchieved: boolean;
  followUpsCompletedToday: number;
  repliesReceivedToday: number;
  positiveRepliesToday: number;
  meetingsBookedToday: number;
  sendingErrorsToday: number;
  readyQueueCount: number;
  followUpDueCount: number;
  performance: DailyPerformancePoint[];
}

export interface ResearchBatch {
  id: string;
  status: "active" | "complete" | "blocked";
  targetEmailReady: number;
  totalAdded: number;
  qualifiedCount: number;
  emailReadyQualifiedCount: number;
  remainingEmailReady: number;
  startedAt: string;
  completedAt?: string;
  actorId: string;
  actorType: ActorType;
}

export interface InstantlyAccountOption {
  email: string;
  status: number;
  statusLabel: string;
  warmupStatus: number;
  warmupStatusLabel: string;
  warmupScore?: number;
  setupPending: boolean;
  approved: boolean;
  healthy: boolean;
  eligible: boolean;
  eligibilityReasons: string[];
  dailyLimit?: number;
  lastUsedAt?: string;
}

export interface InstantlyCampaignOption {
  id: string;
  name: string;
  status: number;
  statusLabel: string;
  approved: boolean;
  active: boolean;
  senderAccounts: string[];
  selectedSender?: string;
  templateReady: boolean;
  eligible: boolean;
  eligibilityReasons: string[];
  dailyLimit?: number;
  dailyMaxLeads?: number;
  stopOnReply?: boolean;
}

export interface InstantlyOptions {
  configured: boolean;
  connectionState: "connected" | "not-configured" | "error";
  lastCheckedAt: string;
  webhookConfigured: boolean;
  accounts: InstantlyAccountOption[];
  campaigns: InstantlyCampaignOption[];
  message?: string;
}

export interface OutreachSubmission {
  campaignId: string;
  senderAccount: string;
  recipientEmail: string;
  subject: string;
  messageBody: string;
  personalizationVariables?: Record<string, string>;
  evidenceIds: string[];
  confirmation: true;
}

export interface LeadStatusUpdate {
  lifecycleStatus?: LifecycleStatus;
  qualificationStatus?: QualificationStatus;
  qualificationReason?: string;
  emailVerificationStatus?: EmailVerificationStatus;
  emailProvenance?: EmailProvenance;
  emailContactType?: EmailContactType;
  followUpStatus?: FollowUpStatus;
  nextAction?: string;
  nextActionDueAt?: string | null;
  assignedTo?: string | null;
  internalNotes?: string;
  reason: string;
}

export interface ResearchLeadContactInput {
  kind: "email" | "phone" | "contact-form";
  value: string;
  label: string;
  provenance: EmailProvenance | "official" | "third-party-listed";
  verificationStatus: EmailVerificationStatus | "verified-public";
  contactType?: EmailContactType;
  isPrimary?: boolean;
  evidenceUrls: string[];
}

export interface ResearchEvidenceInput {
  url: string;
  title: string;
  publisher: string;
  note: string;
  kind:
    | "official-website"
    | "official-social"
    | "google-business"
    | "local-news"
    | "directory"
    | "press-release"
    | "municipal"
    | "commercial-development"
    | "community"
    | "other";
  publishedAt?: string | null;
  discoveredAt: string;
  supports: string[];
  confidence: Confidence;
}

export interface ResearchObservationInput {
  title: string;
  detail: string;
  implication: string;
  evidenceUrls: string[];
}

export interface ResearchLeadInput {
  schemaVersion: "1.0";
  business: {
    name: string;
    category: string;
    description: string;
    website?: string;
    status: OpeningStatus;
    openingDate?: string;
    openingDateConfidence?: Confidence;
    foundedYear?: number;
    ownership?: string;
    logoUrl?: string;
  };
  location: {
    city: string;
    neighborhood?: string;
    address?: string;
    region?: string;
  };
  contacts: ResearchLeadContactInput[];
  socialProfiles: Array<{
    platform: "instagram" | "facebook" | "tiktok" | "linkedin" | "x" | "youtube";
    url: string;
    handle?: string;
  }>;
  decisionMakers: Array<{
    name: string;
    role: string;
    context: string;
    confidence: Confidence;
    evidenceUrls: string[];
  }>;
  services: string[];
  products: string[];
  discoveryReason: string;
  fitReason: string;
  likelyMarketingNeeds: string[];
  recommendedServiceAngle: string;
  suggestedOutreachApproach: string;
  urgency: Priority;
  confidence: Confidence;
  researchNotes: string;
  observations: ResearchObservationInput[];
  evidence: ResearchEvidenceInput[];
  scoreInputs: {
    recency: number;
    openingOrExpansion: number;
    marketingNeed: number;
    queMediaFit: number;
    decisionMakerAccess: number;
    emailReliability: number;
    socialOpportunity: number;
    websiteOpportunity: number;
    likelyBudget: number;
    businessScale: number;
    urgency: number;
    evidenceStrength: number;
  };
  outreachDraft?: {
    subject: string;
    opening: string;
    body: string;
    callToAction: string;
    evidenceUrls: string[];
  };
  trace: {
    actorType: Exclude<ActorType, "instantly-webhook" | "instantly-sync" | "system">;
    actorId: string;
    process?: string;
    batchId?: string;
    researchedAt: string;
  };
}
