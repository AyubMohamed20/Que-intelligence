"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  FileText,
  Globe2,
  Lightbulb,
  MapPin,
  MessageSquareText,
  Phone,
  PlayCircle,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  AuditFinding,
  LeadProfile,
  OutreachChannel,
  Recommendation,
  ScoreCard,
} from "@/lib/types";
import { EvidenceDrawer } from "@/components/evidence-drawer";
import { BusinessLogo, ScoreRing, StatusBadge } from "@/components/ui";

type WorkspaceTab = "overview" | "social" | "website" | "competitors" | "strategy" | "outreach" | "relationship";

const tabs: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "social", label: "Social intelligence" },
  { id: "website", label: "Website & local" },
  { id: "competitors", label: "Competitors" },
  { id: "strategy", label: "Strategy" },
  { id: "outreach", label: "Outreach studio" },
  { id: "relationship", label: "Relationship" },
];

const channelNames: Record<OutreachChannel, string> = {
  email: "Email",
  "instagram-dm": "Instagram DM",
  linkedin: "LinkedIn",
  facebook: "Facebook",
  phone: "Phone",
  voicemail: "Voicemail",
  loom: "Loom video",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function humanize(value: string) {
  return value.replaceAll("-", " ");
}

function contactHref(channel: LeadProfile["contactChannels"][number]) {
  if (channel.kind === "email") return `mailto:${channel.value}`;
  if (channel.kind === "phone") return `tel:${channel.value.replace(/[^+\d]/g, "")}`;
  return channel.value;
}

function EmptySection({ children }: { children: string }) {
  return <p className="section-description">{children}</p>;
}

export function CompanyWorkspace({ lead }: { lead: LeadProfile }) {
  const [tab, setTab] = useState<WorkspaceTab>("overview");

  const focusTab = (index: number) => {
    const nextTab = tabs[index];
    setTab(nextTab.id);
    window.requestAnimationFrame(() => document.getElementById(`company-tab-${nextTab.id}`)?.focus());
  };

  const moveTabFocus = (index: number, direction: -1 | 1) => {
    focusTab((index + direction + tabs.length) % tabs.length);
  };

  const openTabFromContent = (nextTab: WorkspaceTab) => {
    setTab(nextTab);
    window.requestAnimationFrame(() => document.getElementById(`company-tab-${nextTab}`)?.focus());
  };

  return (
    <div className="company-workspace">
      <nav className="company-breadcrumb" aria-label="Breadcrumb">
        <Link href="/companies"><ArrowLeft aria-hidden="true" size={15} /> Companies</Link>
        <span>/</span>
        <span>{lead.name}</span>
      </nav>

      <header className="company-header surface">
        <div className="company-header__identity">
          <BusinessLogo {...lead} tone={lead.thumbnailTone} />
          <div>
            <div className="company-title-line"><h1>{lead.name}</h1><StatusBadge tone={lead.researchStatus === "ready" ? "positive" : lead.researchStatus === "quality-review" ? "warning" : "info"}>{humanize(lead.researchStatus)}</StatusBadge></div>
            <p>{[lead.industry, lead.neighborhood, lead.location].filter(Boolean).join(" · ")}</p>
            <div className="company-meta-row">
              {lead.website ? <span><Globe2 aria-hidden="true" size={14} /> {lead.website.replace(/^https?:\/\//, "")}</span> : null}
              {lead.identity.primaryLocation ? <span><MapPin aria-hidden="true" size={14} /> {lead.identity.primaryLocation}</span> : null}
              <span><Clock3 aria-hidden="true" size={14} /> Refreshed {formatDate(lead.lastEnrichedAt)}</span>
            </div>
          </div>
        </div>
        <div className="company-header__actions">
          <EvidenceDrawer evidenceIds={lead.evidence.slice(0, 6).map((item) => item.id)} evidence={lead.evidence} sources={lead.sources} label="Source record" title={`${lead.name} source record`} />
          {lead.reportReady ? <Link className="button button--secondary" href={`/reports/${lead.id}`}><FileText aria-hidden="true" size={16} /> Open report</Link> : null}
        </div>
        <div className="company-header__scores">
          <ScoreSummary label="Que Media fit" score={lead.contentFitScore} detail={`Grade ${lead.contentFitScorecard.grade}`} />
          <ScoreSummary label="Opportunity" score={lead.opportunityScore} detail={`Grade ${lead.opportunityScorecard.grade}`} />
          <ScoreSummary label="Response" score={lead.responseLikelihood} detail={`Grade ${lead.responseScorecard.grade}`} suffix="%" />
          <div className="company-priority"><span className="meta-label">Priority</span><strong>{humanize(lead.priority)}</strong><small>Expected return on effort</small></div>
        </div>
      </header>

      <nav className="workspace-tabs" aria-label="Company intelligence sections" role="tablist">
        {tabs.map((item, index) => (
          <button
            key={item.id}
            id={`company-tab-${item.id}`}
            type="button"
            role="tab"
            className={tab === item.id ? "is-active" : ""}
            aria-selected={tab === item.id}
            aria-controls={`company-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => setTab(item.id)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                moveTabFocus(index, 1);
              }
              if (event.key === "ArrowLeft") {
                event.preventDefault();
                moveTabFocus(index, -1);
              }
              if (event.key === "Home") {
                event.preventDefault();
                focusTab(0);
              }
              if (event.key === "End") {
                event.preventDefault();
                focusTab(tabs.length - 1);
              }
            }}
          >
            {item.label}
            {item.id === "outreach" ? <span>{lead.outreachDrafts.length}</span> : null}
          </button>
        ))}
      </nav>

      <div className="workspace-content">
        <div id="company-panel-overview" role="tabpanel" aria-labelledby="company-tab-overview" tabIndex={tab === "overview" ? 0 : -1} hidden={tab !== "overview"}>
          <OverviewTab lead={lead} openTab={openTabFromContent} />
        </div>
        <div id="company-panel-social" role="tabpanel" aria-labelledby="company-tab-social" tabIndex={tab === "social" ? 0 : -1} hidden={tab !== "social"}>
          <SocialTab lead={lead} />
        </div>
        <div id="company-panel-website" role="tabpanel" aria-labelledby="company-tab-website" tabIndex={tab === "website" ? 0 : -1} hidden={tab !== "website"}>
          <WebsiteTab lead={lead} />
        </div>
        <div id="company-panel-competitors" role="tabpanel" aria-labelledby="company-tab-competitors" tabIndex={tab === "competitors" ? 0 : -1} hidden={tab !== "competitors"}>
          <CompetitorsTab lead={lead} />
        </div>
        <div id="company-panel-strategy" role="tabpanel" aria-labelledby="company-tab-strategy" tabIndex={tab === "strategy" ? 0 : -1} hidden={tab !== "strategy"}>
          <StrategyTab lead={lead} openTab={openTabFromContent} />
        </div>
        <div id="company-panel-outreach" role="tabpanel" aria-labelledby="company-tab-outreach" tabIndex={tab === "outreach" ? 0 : -1} hidden={tab !== "outreach"}>
          <OutreachTab lead={lead} />
        </div>
        <div id="company-panel-relationship" role="tabpanel" aria-labelledby="company-tab-relationship" tabIndex={tab === "relationship" ? 0 : -1} hidden={tab !== "relationship"}>
          <RelationshipTab lead={lead} />
        </div>
      </div>
    </div>
  );
}

function ScoreSummary({ label, score, detail, suffix = "" }: { label: string; score: number; detail: string; suffix?: string }) {
  return (
    <div className="company-score" aria-label={`${label}: ${score}${suffix}`}>
      <span>{label}</span>
      <strong>{score}{suffix}</strong>
      <small>{detail}</small>
      <div><span style={{ width: `${score}%` }} /></div>
    </div>
  );
}

function OverviewTab({ lead, openTab }: { lead: LeadProfile; openTab: (tab: WorkspaceTab) => void }) {
  const hasOutreachDrafts = lead.outreachDrafts.length > 0;

  return (
    <div className="overview-layout">
      <div className="overview-main">
        <section className="executive-brief" aria-labelledby="executive-brief-title">
          <div className="section-heading-row"><div><span className="meta-label">Decision brief</span><h2 id="executive-brief-title" className="section-title">The case for a conversation</h2></div><EvidenceDrawer evidenceIds={lead.evidence.slice(0, 8).map((item) => item.id)} evidence={lead.evidence} sources={lead.sources} compact /></div>
          <p className="executive-summary">{lead.executiveSummary}</p>
          {lead.nextBestAction ? <div className="brief-callout">
            <Sparkles aria-hidden="true" size={20} />
            <div><strong>Best opening angle</strong><p>{lead.nextBestAction}</p></div>
            {hasOutreachDrafts ? <button className="text-button" type="button" onClick={() => openTab("outreach")}>Open drafts <ArrowRight aria-hidden="true" size={14} /></button> : null}
          </div> : null}
        </section>

        <section aria-labelledby="score-reasons-title">
          <div className="section-heading-row"><div><h2 id="score-reasons-title" className="section-title">How this business was scored</h2><p className="section-description">Transparent factors, weights, and supporting observations.</p></div></div>
          <div className="scorecard-columns">
            <ScorecardBreakdown card={lead.contentFitScorecard} lead={lead} />
            <ScorecardBreakdown card={lead.opportunityScorecard} lead={lead} />
          </div>
        </section>

        <section aria-labelledby="pain-points-title">
          <div className="section-heading-row"><div><h2 id="pain-points-title" className="section-title">Evidence-backed pain points</h2><p className="section-description">Observed gaps, not assumed problems.</p></div></div>
          <div className="pain-point-list">
            {lead.likelyPainPoints.map((pain, index) => (
              <article key={pain.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{pain.title}</h3><p>{pain.explanation}</p></div>
                <StatusBadge tone={pain.confidence === "high" ? "positive" : "warning"}>{pain.confidence} confidence</StatusBadge>
                <EvidenceDrawer evidenceIds={pain.evidenceIds} evidence={lead.evidence} sources={lead.sources} compact />
              </article>
            ))}
            {lead.likelyPainPoints.length === 0 ? <EmptySection>No evidence-backed pain points are recorded.</EmptySection> : null}
          </div>
        </section>

        <section aria-labelledby="public-contact-title">
          <div className="section-heading-row"><div><h2 id="public-contact-title" className="section-title">Public contact routes</h2><p className="section-description">Business contact details corroborated on public business sources.</p></div></div>
          <div className="public-contact-list" aria-labelledby="public-contact-title">
            {lead.contactChannels.map((channel) => (
              <a href={contactHref(channel)} target={channel.kind === "email" || channel.kind === "phone" ? undefined : "_blank"} rel={channel.kind === "email" || channel.kind === "phone" ? undefined : "noreferrer"} key={`${channel.kind}-${channel.value}`}>
                <span><strong>{channel.label}</strong><small>{channel.value}</small></span>
                <StatusBadge tone={channel.preferred ? "accent" : "positive"}>{channel.preferred ? "Preferred" : "Verified public"}</StatusBadge>
              </a>
            ))}
            {lead.contactChannels.length === 0 ? <EmptySection>No corroborated public contact route is recorded.</EmptySection> : null}
          </div>
        </section>

        <section aria-labelledby="decision-maker-title">
          <div className="section-heading-row"><div><h2 id="decision-maker-title" className="section-title">Decision-maker context</h2><p className="section-description">Public and professionally relevant only.</p></div></div>
          <div className="decision-maker-list">
            {lead.decisionMakers.map((person) => (
              <article key={person.id}>
                <span className="person-avatar" aria-hidden="true"><UserRound size={19} /></span>
                <div><h3>{person.name}</h3><span>{person.role}</span><p>{person.publicContext}</p></div>
                <div className="person-relevance"><span className="meta-label">Why relevant</span><p>{person.relevance}</p></div>
                <EvidenceDrawer evidenceIds={person.evidenceIds} evidence={lead.evidence} sources={lead.sources} compact />
              </article>
            ))}
            {lead.decisionMakers.length === 0 ? <EmptySection>No publicly verified decision makers are recorded.</EmptySection> : null}
          </div>
        </section>
      </div>

      <aside className="overview-rail">
        <section className="why-now-panel surface--ink" aria-labelledby="why-now-panel-title">
          <div className="why-now-panel__header"><CalendarClock aria-hidden="true" size={21} /><div><span className="meta-label">Why now</span><h2 id="why-now-panel-title">The timing window</h2></div></div>
          <div className="why-now-signals">
            {lead.whyNowSignals.map((signal) => (
              <article key={signal.id}>
                <div><StatusBadge tone={signal.strength === "strong" ? "accent" : "warning"}>{signal.strength}</StatusBadge><span>{formatDate(signal.occurredAt)}</span></div>
                <h3>{signal.title}</h3>
                <p>{signal.description}</p>
                <small>{signal.bestContactWindow}</small>
                <EvidenceDrawer evidenceIds={signal.evidenceIds} evidence={lead.evidence} sources={lead.sources} compact label="Evidence" />
              </article>
            ))}
            {lead.whyNowSignals.length === 0 ? <EmptySection>No current timing signals are recorded.</EmptySection> : null}
          </div>
        </section>

        <section className="business-facts surface" aria-labelledby="business-facts-title">
          <div className="surface-header"><div><h2 id="business-facts-title">Business facts</h2><p>Resolved across public sources.</p></div></div>
          <dl>
            <div><dt>Ownership</dt><dd>{lead.identity.ownership || "Unavailable"}</dd></div>
            <div><dt>Founded</dt><dd>{lead.identity.foundedYear ?? "Unavailable"}</dd></div>
            <div><dt>Team</dt><dd>{lead.identity.employeeRange || "Unavailable"}</dd></div>
            <div><dt>Locations</dt><dd>{lead.identity.locationCount ?? "Unavailable"}</dd></div>
            <div><dt>Primary audience</dt><dd>{lead.identity.customerSegments.join(", ") || "Unavailable"}</dd></div>
            <div><dt>Offerings</dt><dd>{lead.identity.offerings.slice(0, 4).join(", ") || "Unavailable"}</dd></div>
          </dl>
        </section>

        {lead.nextBestAction ? (
          <section className="next-action surface" aria-labelledby="next-action-title">
            <span className="next-action__icon" aria-hidden="true"><Target size={20} /></span>
            <span className="meta-label">Recommended next action</span>
            <h2 id="next-action-title">{lead.nextBestAction}</h2>
            <p>Suggested channel: {channelNames[lead.primaryChannel]}</p>
            {hasOutreachDrafts ? <button className="button button--primary" type="button" onClick={() => openTab("outreach")}>Review message <ArrowRight aria-hidden="true" size={15} /></button> : null}
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function ScorecardBreakdown({ card, lead }: { card: ScoreCard; lead: LeadProfile }) {
  return (
    <article className="scorecard-breakdown surface">
      <div className="scorecard-breakdown__header"><ScoreRing value={card.score} label={card.label} size={104} /><div><StatusBadge tone="accent">Grade {card.grade}</StatusBadge><p>{card.summary}</p><small>{card.modelVersion} · {formatDate(card.calculatedAt)}</small></div></div>
      <div className="dimension-list">
        {card.dimensions.map((dimension) => (
          <div key={dimension.key}>
            <div><span><strong>{dimension.label}</strong><small>{Math.round(dimension.weight * 100)}% weight</small></span><b>{dimension.score}</b></div>
            <div className="dimension-bar"><span style={{ width: `${dimension.score}%` }} /></div>
            <p>{dimension.rationale}</p>
            <EvidenceDrawer evidenceIds={dimension.evidenceIds} evidence={lead.evidence} sources={lead.sources} compact />
          </div>
        ))}
        {card.dimensions.length === 0 ? <EmptySection>No scoring dimensions are recorded.</EmptySection> : null}
      </div>
    </article>
  );
}

function SocialTab({ lead }: { lead: LeadProfile }) {
  const social = lead.socialIntelligence;
  const dominantContent = [...social.contentMix].sort((left, right) => right.share - left.share)[0];
  const sampledPostCount = social.contentMix.reduce((sum, item) => sum + item.postCount, 0);
  const verifiedAccounts = social.accounts.filter((account) => account.exists);
  const confirmedActiveAccounts = verifiedAccounts.filter((account) => account.active === true);

  return (
    <div className="social-layout">
      <section className="social-summary surface--ink" aria-labelledby="social-summary-title">
        <div><span className="meta-label">Social intelligence</span><h2 id="social-summary-title">{social.score !== undefined ? `Social audit score: ${social.score}` : "Verified social presence"}</h2><p>{dominantContent?.assessment ?? "Public account links are verified. Performance has not been scored without a complete content sample."}</p></div>
        {social.score !== undefined ? <ScoreRing value={social.score} label="Social" size={126} tone="accent" /> : <StatusBadge tone="info">Not scored</StatusBadge>}
        <dl><div><dt>Verified platforms</dt><dd>{verifiedAccounts.length}</dd></div><div><dt>Confirmed active</dt><dd>{confirmedActiveAccounts.length || "Not measured"}</dd></div><div><dt>Posts sampled</dt><dd>{sampledPostCount || "Not measured"}</dd></div><div><dt>Largest content category</dt><dd>{dominantContent?.label ?? "Unavailable"}</dd></div></dl>
      </section>

      <section className="platform-observations surface" aria-labelledby="platform-title">
        <div className="surface-header"><div><h2 id="platform-title">Platform observations</h2><p>Public observed metrics only. Missing owner data remains unavailable.</p></div><StatusBadge tone="info">Public observed</StatusBadge></div>
        <div className="platform-table-wrap" tabIndex={0} aria-label="Scrollable public social platform observations"><table className="platform-table"><caption className="sr-only">Public social platform observations</caption><thead><tr><th scope="col">Platform</th><th scope="col">Account</th><th scope="col">30-day posts</th><th scope="col">Visible engagement</th><th scope="col">Effectiveness</th><th scope="col">Assessment</th></tr></thead><tbody>
          {social.accounts.map((account) => <tr key={account.platform}><td><strong>{account.platform}</strong></td><td>{account.exists ? <a href={account.url} target="_blank" rel="noreferrer">{account.handle}</a> : "Not found"}</td><td>{account.postsLast30Days ?? "Not measured"}</td><td>{account.averageEngagementRate !== undefined ? `${account.averageEngagementRate}%` : "Not measured"}</td><td>{account.effectivenessScore !== undefined ? <span className="platform-score">{account.effectivenessScore}</span> : "Not scored"}</td><td>{account.note}</td></tr>)}
          {social.accounts.length === 0 ? <tr><td colSpan={6}>No public social accounts are recorded.</td></tr> : null}
        </tbody></table></div>
      </section>

      <div className="social-two-column">
        <section aria-labelledby="content-mix-title">
          <div className="section-heading-row"><div><h2 id="content-mix-title" className="section-title">Content DNA</h2><p className="section-description">What the brand publishes and what the audience rewards.</p></div></div>
          <div className="content-mix-list">
            {social.contentMix.map((item) => <article key={item.category}><div><strong>{item.label}</strong><span>{item.postCount} posts · {item.averageEngagementRate}% visible engagement</span></div><div className="content-mix-bar"><span style={{ width: `${item.share}%` }} /></div><b>{item.share}%</b><p>{item.assessment}</p></article>)}
            {social.contentMix.length === 0 ? <EmptySection>No content mix observations are recorded.</EmptySection> : null}
          </div>
        </section>
        <section className="quality-panel surface" aria-labelledby="quality-title">
          <div className="surface-header"><div><h2 id="quality-title">Production quality</h2><p>Independent craft scores with visible observations.</p></div></div>
          <div className="quality-list">{social.productionQuality.map((item) => <div key={item.dimension}><span><strong>{item.dimension}</strong><b>{item.score}</b></span><div><span style={{ width: `${item.score}%` }} /></div><p>{item.observation}</p><EvidenceDrawer evidenceIds={item.evidenceIds} evidence={lead.evidence} sources={lead.sources} compact /></div>)}{social.productionQuality.length === 0 ? <EmptySection>No production quality observations are recorded.</EmptySection> : null}</div>
        </section>
      </div>

      <section aria-labelledby="top-content-title">
        <div className="section-heading-row"><div><h2 id="top-content-title" className="section-title">Top content observations</h2><p className="section-description">Hooks, first three seconds, production choices, calls to action, and audience reaction.</p></div></div>
        <div className="top-content-list">{social.topPosts.map((post, index) => <article className="top-content-item" key={post.id}><div className="post-rank"><span>{String(index + 1).padStart(2, "0")}</span><PlayCircle aria-hidden="true" size={22} /></div><div className="post-summary"><div><StatusBadge tone="accent">{post.platform}</StatusBadge><span>{post.format} · {formatDate(post.publishedAt)}</span></div><h3>{post.title}</h3><p>{post.whyItWorked}</p></div><dl><div><dt>Hook</dt><dd>{post.hook}</dd></div><div><dt>First three seconds</dt><dd>{post.firstThreeSeconds}</dd></div><div><dt>Visual technique</dt><dd>{post.visualTechnique}</dd></div><div><dt>Audience reaction</dt><dd>{post.audienceReaction}</dd></div></dl><EvidenceDrawer evidenceIds={post.evidenceIds} evidence={lead.evidence} sources={lead.sources} compact /></article>)}{social.topPosts.length === 0 ? <EmptySection>No top-content observations are recorded.</EmptySection> : null}</div>
      </section>

      <section aria-labelledby="missed-opportunities-title">
        <div className="section-heading-row"><div><h2 id="missed-opportunities-title" className="section-title">Missed content opportunities</h2><p className="section-description">Formats the business can credibly own, based on its personality and audience questions.</p></div></div>
        <div className="opportunity-list">{social.missedOpportunities.map((item) => <article key={item.title}><Lightbulb aria-hidden="true" size={19} /><div><StatusBadge tone={item.potential === "high" ? "warning" : "info"}>{item.potential} potential</StatusBadge><h3>{item.title}</h3><p>{item.rationale}</p><small>{item.format}</small></div><EvidenceDrawer evidenceIds={item.evidenceIds} evidence={lead.evidence} sources={lead.sources} compact /></article>)}{social.missedOpportunities.length === 0 ? <EmptySection>No missed content opportunities are recorded.</EmptySection> : null}</div>
      </section>
    </div>
  );
}

function WebsiteTab({ lead }: { lead: LeadProfile }) {
  const audit = lead.websiteAudit;
  const local = lead.localSeoAudit;
  const hasLocalProfileMetrics = [local.rating, local.reviewCount, local.reviewVelocityPerMonth, local.ownerResponseRate, local.napConsistency, local.profileCompleteness, local.photoCount].some((value) => value !== undefined);
  return (
    <div className="audit-layout">
      <section className="audit-scoreband surface" aria-labelledby="audit-score-title">
        <div>{audit.score !== undefined ? <ScoreRing value={audit.score} label="Website" size={116} /> : <StatusBadge tone="info">Not scored</StatusBadge>}<div><span className="meta-label">Website experience</span><h2 id="audit-score-title">{audit.score !== undefined ? `Website audit score: ${audit.score}` : "Website audit observations"}</h2><p>{audit.topOpportunity || "No top website opportunity is recorded."}</p></div></div>
        <div>{local.score !== undefined ? <ScoreRing value={local.score} label="Local SEO" size={116} tone="warning" /> : <StatusBadge tone="info">Not scored</StatusBadge>}<div><span className="meta-label">Local visibility</span><h2>{local.score !== undefined ? `Local SEO audit score: ${local.score}` : "Local SEO observations"}</h2><p>{local.findings[0]?.implication ?? "No local SEO finding is recorded."}</p></div></div>
      </section>

      <section aria-labelledby="performance-title"><div className="section-heading-row"><div><h2 id="performance-title" className="section-title">Mobile performance</h2><p className="section-description">Recorded performance observations from the latest website audit.</p></div><StatusBadge tone="info">Audited {formatDate(audit.auditedAt)}</StatusBadge></div><div className="performance-metrics">{audit.performance.map((metric) => <article key={metric.label}><span className={`metric-state metric-state--${metric.assessment}`} aria-hidden="true" /><span>{metric.label}</span><strong>{metric.value}{metric.unit}</strong><StatusBadge tone={metric.assessment === "good" ? "positive" : metric.assessment === "needs-attention" ? "warning" : "critical"}>{metric.assessment.replace("-", " ")}</StatusBadge></article>)}{audit.performance.length === 0 ? <EmptySection>No performance observations are recorded.</EmptySection> : null}</div></section>

      <section className="audit-sections surface" aria-labelledby="audit-findings-title"><div className="surface-header"><div><h2 id="audit-findings-title">Website audit</h2><p>Strengths and highest-impact improvements across the full customer journey.</p></div></div><div className="audit-section-list">{audit.sections.map((section) => <details key={section.id} open={section.id === audit.sections[0]?.id}><summary><span><strong>{section.label}</strong><small>{section.summary}</small></span><b>{section.score}</b></summary><div className="audit-findings"><div><span className="meta-label">Strengths</span>{section.strengths.map((finding) => <AuditFindingRow key={finding.id} finding={finding} lead={lead} />)}{section.strengths.length === 0 ? <EmptySection>No strengths are recorded for this section.</EmptySection> : null}</div><div><span className="meta-label">Opportunities</span>{section.opportunities.map((finding) => <AuditFindingRow key={finding.id} finding={finding} lead={lead} />)}{section.opportunities.length === 0 ? <EmptySection>No opportunities are recorded for this section.</EmptySection> : null}</div></div></details>)}{audit.sections.length === 0 ? <EmptySection>No website audit sections are recorded.</EmptySection> : null}</div></section>

      <div className="local-grid">
        <section className="surface local-profile" aria-labelledby="local-profile-title"><div className="surface-header"><div><h2 id="local-profile-title">Google Business profile</h2><p>Profile health and public review observation.</p></div></div>{hasLocalProfileMetrics ? <dl>{local.rating !== undefined ? <div><dt>Rating</dt><dd>{local.rating}</dd><span>{local.reviewCount !== undefined ? `${local.reviewCount} reviews` : "Review count not measured"}</span></div> : null}{local.reviewVelocityPerMonth !== undefined ? <div><dt>Review velocity</dt><dd>{local.reviewVelocityPerMonth}</dd><span>per month</span></div> : null}{local.ownerResponseRate !== undefined ? <div><dt>Owner response</dt><dd>{local.ownerResponseRate}%</dd><span>visible sample</span></div> : null}{local.napConsistency !== undefined ? <div><dt>NAP consistency</dt><dd>{local.napConsistency}%</dd><span>across sampled sources</span></div> : null}{local.profileCompleteness !== undefined ? <div><dt>Profile complete</dt><dd>{local.profileCompleteness}%</dd><span>{local.primaryCategory}</span></div> : null}{local.photoCount !== undefined ? <div><dt>Photos</dt><dd>{local.photoCount}</dd><span>public observed</span></div> : null}</dl> : <EmptySection>No verified Google Business profile metrics are recorded.</EmptySection>}</section>
        <section className="surface review-themes" aria-labelledby="review-themes-title"><div className="surface-header"><div><h2 id="review-themes-title">Review themes</h2><p>What customers repeatedly notice.</p></div></div><div>{local.sentimentThemes.map((theme) => <article key={theme.theme}><StatusBadge tone={theme.sentiment === "positive" ? "positive" : theme.sentiment === "mixed" ? "warning" : "critical"}>{theme.sentiment}</StatusBadge><div><strong>{theme.theme}</strong><p>{theme.exampleSummary}</p></div><span>{theme.mentionCount} mentions</span></article>)}{local.sentimentThemes.length === 0 ? <EmptySection>No review themes are recorded.</EmptySection> : null}</div></section>
      </div>

      <section className="local-rankings surface" aria-labelledby="local-rankings-title"><div className="surface-header"><div><h2 id="local-rankings-title">Local ranking observations</h2><p>Point-in-time samples, not guaranteed rank positions.</p></div></div>{local.rankObservations.length > 0 ? <div className="local-ranking-table" role="table" tabIndex={0} aria-label="Scrollable local ranking observations"><div className="local-ranking-row is-header" role="row"><span role="columnheader">Query</span><span role="columnheader">Area</span><span role="columnheader">Observed</span><span role="columnheader">Note</span></div>{local.rankObservations.map((row) => <div className="local-ranking-row" role="row" key={`${row.query}-${row.area}`}><strong role="cell">{row.query}</strong><span role="cell">{row.area}</span><b role="cell">{row.position ?? "Not seen"}</b><p role="cell">{row.note}</p></div>)}</div> : <EmptySection>No local ranking observations are recorded.</EmptySection>}</section>
    </div>
  );
}

function AuditFindingRow({ finding, lead }: { finding: AuditFinding; lead: LeadProfile }) {
  return <article className="audit-finding"><div><StatusBadge tone={finding.severity === "positive" ? "positive" : finding.severity === "high" || finding.severity === "critical" ? "critical" : "warning"}>{finding.severity}</StatusBadge><span>{finding.effort} effort</span></div><h3>{finding.title}</h3><p>{finding.observation}</p><strong>{finding.recommendation}</strong><EvidenceDrawer evidenceIds={finding.evidenceIds} evidence={lead.evidence} sources={lead.sources} compact /></article>;
}

function CompetitorsTab({ lead }: { lead: LeadProfile }) {
  return (
    <div className="competitor-layout">
      <section className="competitor-intro surface--ink"><div><span className="meta-label">Local benchmark</span><h2>{lead.competitors.length > 0 ? `Compared with ${lead.competitors.length} local ${lead.competitors.length === 1 ? "benchmark" : "benchmarks"}` : "No local benchmarks recorded"}</h2><p>{lead.competitors[0]?.whyRelevant ?? "Competitor comparisons will appear after verified local benchmarks are added."}</p></div><div className="benchmark-score"><span>Target</span><strong>{lead.contentFitScore}</strong><small>Que Media fit</small></div></section>
      {lead.competitors.map((competitor) => <section className="competitor-block" key={competitor.id}><div className="competitor-heading"><div><span className="company-avatar" aria-hidden="true">{competitor.name.split(" ").map((word) => word[0]).join("").slice(0, 2)}</span><div><h2>{competitor.name}</h2><p>{[competitor.location, competitor.positioning].filter(Boolean).join(" · ")}</p></div></div>{competitor.overallScore !== undefined ? <ScoreRing value={competitor.overallScore} label="Maturity" size={94} tone="neutral" /> : <StatusBadge tone="info">Not scored</StatusBadge>}</div><p className="competitor-relevance">{competitor.whyRelevant}</p>{competitor.metrics.length > 0 ? <div className="competitor-table" role="table" tabIndex={0} aria-label={`Scrollable comparison with ${competitor.name}`}><div className="competitor-metric is-header" role="row"><span role="columnheader">Measure</span><span role="columnheader">{lead.name}</span><span role="columnheader">{competitor.name}</span><span role="columnheader">Read</span></div>{competitor.metrics.map((metric) => <div className="competitor-metric" role="row" key={metric.key}><strong role="cell">{metric.label}</strong><span role="cell">{metric.targetValue}{metric.unit}</span><span role="cell">{metric.competitorValue}{metric.unit}</span><p role="cell"><StatusBadge tone={metric.winner === "target" ? "positive" : metric.winner === "competitor" ? "warning" : "neutral"}>{metric.winner === "target" ? "Target leads" : metric.winner === "competitor" ? "Competitor leads" : "Even"}</StatusBadge>{metric.explanation}</p></div>)}</div> : <EmptySection>No comparison metrics are recorded for this benchmark.</EmptySection>}<div className="competitor-takeaways"><div><span className="meta-label">Where they lead</span>{competitor.advantages.length > 0 ? <ul>{competitor.advantages.map((item) => <li key={item}>{item}</li>)}</ul> : <EmptySection>No competitor advantages are recorded.</EmptySection>}</div><div><span className="meta-label">Where they are vulnerable</span>{competitor.vulnerabilities.length > 0 ? <ul>{competitor.vulnerabilities.map((item) => <li key={item}>{item}</li>)}</ul> : <EmptySection>No competitor vulnerabilities are recorded.</EmptySection>}</div></div><EvidenceDrawer evidenceIds={competitor.evidenceIds} evidence={lead.evidence} sources={lead.sources} label="Open benchmark evidence" /></section>)}
    </div>
  );
}

function StrategyTab({ lead, openTab }: { lead: LeadProfile; openTab: (tab: WorkspaceTab) => void }) {
  const primaryRecommendation = lead.recommendations[0];

  return (
    <div className="strategy-layout">
      <section className="strategy-lead"><span className="strategy-lead__icon" aria-hidden="true"><Lightbulb size={22} /></span><div><span className="meta-label">Highest-priority recommendation</span><h2>{primaryRecommendation?.title ?? "No strategic recommendation recorded"}</h2><p>{primaryRecommendation?.action ?? "Recommendations will appear after the business evidence has been analyzed."}</p></div>{primaryRecommendation && lead.outreachDrafts.length > 0 ? <button className="button button--primary" type="button" onClick={() => openTab("outreach")}>Use in outreach <ArrowRight aria-hidden="true" size={15} /></button> : null}</section>
      <section aria-labelledby="recommendations-title"><div className="section-heading-row"><div><h2 id="recommendations-title" className="section-title">Prioritized recommendations</h2><p className="section-description">Every recorded idea includes its observation, action, impact, and supporting evidence.</p></div></div><div className="recommendation-list">{lead.recommendations.map((recommendation, index) => <RecommendationRow key={recommendation.id} recommendation={recommendation} index={index} lead={lead} />)}{lead.recommendations.length === 0 ? <EmptySection>No strategic recommendations are recorded.</EmptySection> : null}</div></section>
      <section className="objection-planning surface" aria-labelledby="objection-title"><div className="surface-header"><div><h2 id="objection-title">Likely objections</h2><p>Evidence-based responses for a human conversation, not scripted rebuttals.</p></div></div><div>{lead.objectionPlans.map((plan) => <article key={plan.objection}><div><StatusBadge tone={plan.likelihood === "high" ? "warning" : "info"}>{plan.likelihood} likelihood</StatusBadge><h3>“{plan.objection}”</h3><p>{plan.evidence}</p></div><div><span className="meta-label">Suggested response</span><p>{plan.response}</p></div></article>)}{lead.objectionPlans.length === 0 ? <EmptySection>No objection plans are recorded.</EmptySection> : null}</div></section>
    </div>
  );
}

function RecommendationRow({ recommendation, index, lead }: { recommendation: Recommendation; index: number; lead: LeadProfile }) {
  return <article className="recommendation-row"><span className="recommendation-index">{String(index + 1).padStart(2, "0")}</span><div className="recommendation-copy"><div><StatusBadge tone={recommendation.priority === "urgent" || recommendation.priority === "high" ? "warning" : "info"}>{recommendation.priority}</StatusBadge><span>{recommendation.category.replace("-", " ")}</span></div><h3>{recommendation.title}</h3><p>{recommendation.observation}</p><strong>{recommendation.action}</strong>{recommendation.contentConcept ? <details><summary>Open production concept</summary><div><span className="meta-label">Hook</span><p>{recommendation.contentConcept.hook}</p><span className="meta-label">Story beats</span><ol>{recommendation.contentConcept.outline.map((item) => <li key={item}>{item}</li>)}</ol><span className="meta-label">Production</span><p>{recommendation.contentConcept.productionNotes}</p><span className="meta-label">Success signal</span><p>{recommendation.contentConcept.successMetric}</p></div></details> : null}</div><div className="recommendation-impact"><span className="meta-label">Expected impact</span><p>{recommendation.impact}</p><EvidenceDrawer evidenceIds={recommendation.evidenceIds} evidence={lead.evidence} sources={lead.sources} compact /></div></article>;
}

function OutreachTab({ lead }: { lead: LeadProfile }) {
  const [channel, setChannel] = useState<OutreachChannel>(lead.outreachDrafts[0]?.channel ?? "email");
  const [horizontalChannels, setHorizontalChannels] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const [drafts, setDrafts] = useState(() => Object.fromEntries(lead.outreachDrafts.map((draft) => [draft.channel, `${draft.opening}\n\n${draft.body}\n\n${draft.callToAction}`])) as Record<OutreachChannel, string>);
  const activeDraft = lead.outreachDrafts.find((draft) => draft.channel === channel) ?? lead.outreachDrafts[0];
  const text = drafts[channel] ?? "";
  const conversationAnchors = [
    lead.whyNowSignals[0]?.title,
    lead.socialIntelligence.missedOpportunities[0]?.title,
    lead.websiteAudit.topOpportunity,
    lead.decisionMakers[0]?.relevance,
  ].filter((value): value is string => Boolean(value));

  useEffect(() => {
    const media = window.matchMedia("(max-width: 820px)");
    const syncOrientation = () => setHorizontalChannels(media.matches);
    syncOrientation();
    media.addEventListener("change", syncOrientation);
    return () => media.removeEventListener("change", syncOrientation);
  }, []);

  const moveChannelFocus = (index: number, direction: -1 | 1) => {
    const nextIndex = (index + direction + lead.outreachDrafts.length) % lead.outreachDrafts.length;
    const nextChannel = lead.outreachDrafts[nextIndex]?.channel;
    if (!nextChannel) return;
    setChannel(nextChannel);
    window.requestAnimationFrame(() => document.getElementById(`outreach-channel-${nextChannel}`)?.focus());
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(activeDraft?.subject ? `${activeDraft.subject}\n\n${text}` : text);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
    window.setTimeout(() => setCopyStatus("idle"), 1800);
  };

  if (!activeDraft) {
    return (
      <div className="outreach-layout">
        <section className="outreach-boundary-banner"><ShieldCheck aria-hidden="true" size={20} /><div><strong>Prepared for a person, never sent by an agent</strong><p>Every draft requires human review before it can leave this workspace.</p></div><StatusBadge tone="positive">Manual only</StatusBadge></section>
        <section className="surface" aria-labelledby="no-outreach-drafts-title"><div className="surface-header"><div><h2 id="no-outreach-drafts-title">No outreach drafts available</h2><p>Drafts will appear after verified business evidence has been converted into channel-specific messaging.</p></div></div></section>
      </div>
    );
  }

  return (
    <div className="outreach-layout">
      <section className="outreach-boundary-banner"><ShieldCheck aria-hidden="true" size={20} /><div><strong>Prepared for a person, never sent by an agent</strong><p>Edit the message, verify every observation, then copy it into the channel you choose.</p></div><StatusBadge tone="positive">Manual only</StatusBadge></section>
      <div className="outreach-grid">
        <aside className="channel-list" aria-label="Outreach channels" aria-orientation={horizontalChannels ? "horizontal" : "vertical"} role="tablist">{lead.outreachDrafts.map((draft, index) => <button key={draft.channel} id={`outreach-channel-${draft.channel}`} type="button" role="tab" className={channel === draft.channel ? "is-active" : ""} aria-label={`${channelNames[draft.channel]}, ${draft.status.replace("-", " ")}`} aria-selected={channel === draft.channel} aria-controls="outreach-message-panel" tabIndex={channel === draft.channel ? 0 : -1} onClick={() => setChannel(draft.channel)} onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowRight") { event.preventDefault(); moveChannelFocus(index, 1); } if (event.key === "ArrowUp" || event.key === "ArrowLeft") { event.preventDefault(); moveChannelFocus(index, -1); } }}><span>{draft.channel === "phone" || draft.channel === "voicemail" ? <Phone aria-hidden="true" size={17} /> : draft.channel === "loom" ? <PlayCircle aria-hidden="true" size={17} /> : <MessageSquareText aria-hidden="true" size={17} />}{channelNames[draft.channel]}</span><StatusBadge tone={draft.status === "approved" ? "positive" : "warning"}>{draft.status.replace("-", " ")}</StatusBadge></button>)}</aside>
        <section className="message-editor surface" id="outreach-message-panel" role="tabpanel" aria-labelledby={`outreach-channel-${channel}`} tabIndex={0}>
          <div className="surface-header"><div><span className="meta-label">{channelNames[channel]}</span><h2 id="message-editor-title">Draft editor</h2></div><div className="button-row"><EvidenceDrawer evidenceIds={activeDraft.evidenceIds} evidence={lead.evidence} sources={lead.sources} compact /><button className="button button--secondary" type="button" onClick={copy}>{copyStatus === "copied" ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}{copyStatus === "copied" ? "Copied" : copyStatus === "error" ? "Copy failed" : "Copy draft"}</button><span className="sr-only" role="status" aria-live="polite">{copyStatus === "copied" ? "Draft copied to the clipboard." : copyStatus === "error" ? "The clipboard was unavailable. Select and copy the draft manually." : ""}</span></div></div>
          <div className="message-editor__body">{activeDraft?.subject ? <label className="field"><span>Subject</span><input name="outreach-subject" value={activeDraft.subject} readOnly /></label> : null}<label className="field"><span>Message</span><textarea name="outreach-message" value={text} onChange={(event) => setDrafts((current) => ({ ...current, [channel]: event.target.value }))} aria-describedby="draft-help" autoComplete="off" /></label><p id="draft-help">Specific observations stay editable. Nothing leaves this workspace.</p></div>
          <div className="personalization-check"><span className="meta-label">Personalization check</span>{activeDraft.personalizationPoints.map((point) => <div key={point}><CheckCircle2 aria-hidden="true" size={16} /><span>{point}</span></div>)}{activeDraft.personalizationPoints.length === 0 ? <EmptySection>No personalization points are recorded for this draft.</EmptySection> : null}</div>
        </section>
        <aside className="outreach-context"><section className="surface"><div className="surface-header"><div><h2>Response estimate</h2><p>Based on timing, fit, evidence, and personalization.</p></div></div><div className="response-estimate"><ScoreRing value={lead.responseLikelihood} label="Response" size={118} tone="positive" /><p>{lead.responseScorecard.summary}</p></div></section><section className="surface"><div className="surface-header"><div><h2>Conversation anchors</h2><p>Points worth remembering before reaching out.</p></div></div>{conversationAnchors.length > 0 ? <ul className="conversation-anchors">{conversationAnchors.map((anchor) => <li key={anchor}>{anchor}</li>)}</ul> : <EmptySection>No conversation anchors are recorded.</EmptySection>}</section></aside>
      </div>
    </div>
  );
}

function RelationshipTab({ lead }: { lead: LeadProfile }) {
  const rememberedContext = Array.from(new Set([
    lead.whyNow ? `Why now: ${lead.whyNow}` : "",
    lead.topSignal ? `Top signal: ${lead.topSignal}` : "",
    ...lead.socialIntelligence.brandPersonality.slice(0, 2).map((trait) => `${trait.trait}: ${trait.evidence}`),
    ...lead.decisionMakers.slice(0, 2).map((person) => `${person.name}: ${person.relevance}`),
  ].filter(Boolean)));

  return (
    <div className="relationship-layout">
      <section className="timeline-section" aria-labelledby="timeline-title">
        <div className="section-heading-row">
          <div><h2 id="timeline-title" className="section-title">Relationship intelligence</h2><p className="section-description">Recorded research history, signals, decisions, and next steps.</p></div>
        </div>
        {lead.relationshipTimeline.length > 0 ? <ol className="relationship-timeline">{lead.relationshipTimeline.map((event) => <li key={event.id}><span className={`timeline-icon timeline-icon--${event.type}`} aria-hidden="true">{event.type === "signal" ? <TrendingUp size={16} /> : event.type === "audit" ? <SearchCheck size={16} /> : <CheckCircle2 size={16} />}</span><div><div><strong>{event.title}</strong><span>{formatDate(event.occurredAt)}</span></div><p>{event.detail}</p><small>{event.actor}</small>{event.nextAction ? <div className="timeline-next"><Target aria-hidden="true" size={14} /><span>{event.nextAction}</span></div> : null}</div></li>)}</ol> : <EmptySection>No relationship events are recorded.</EmptySection>}
      </section>
      <aside className="relationship-rail">
        <section className="next-action surface">
          <span className="next-action__icon" aria-hidden="true"><Target size={20} /></span>
          <span className="meta-label">Next action</span>
          <h2>{lead.nextBestAction || "No next action recorded"}</h2>
          <p>Suggested channel: {channelNames[lead.primaryChannel]}</p>
        </section>
        <section className="surface relationship-memory"><div className="surface-header"><div><h2>Recorded context</h2><p>Profile evidence retained for the next conversation.</p></div></div>{rememberedContext.length > 0 ? <ul>{rememberedContext.map((item) => <li key={item}>{item}</li>)}</ul> : <EmptySection>No relationship context is recorded.</EmptySection>}</section>
      </aside>
    </div>
  );
}
