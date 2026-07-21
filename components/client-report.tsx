import {
  ArrowUpRight,
  BarChart3,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  FileCheck2,
  Globe2,
  Lightbulb,
  MapPin,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
} from "lucide-react";
import type {
  AuditFinding,
  LeadProfile,
  ScoreCard,
  Severity,
} from "@/lib/types";
import { BusinessLogo, ScoreRing, StatusBadge, type ScoreRingTone, type StatusBadgeTone } from "@/components/ui";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function compactDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function findingTone(severity: Severity): StatusBadgeTone {
  if (severity === "positive") return "positive";
  if (severity === "critical" || severity === "high") return "critical";
  if (severity === "medium") return "warning";
  return "info";
}

function scoreTone(score: number): ScoreRingTone {
  if (score >= 80) return "positive";
  if (score >= 65) return "accent";
  if (score >= 45) return "warning";
  return "critical";
}

function getAccessibleSourceUrl(source: LeadProfile["sources"][number]) {
  if (!source.accessible) return null;

  try {
    const url = new URL(source.url);
    if (!(["http:", "https:"] as string[]).includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function ScoreMethod({ card }: { card: ScoreCard }) {
  return (
    <article className="report-method-card">
      <header>
        <div>
          <span className="report-kicker">{card.modelVersion}</span>
          <h3>{card.label}</h3>
          <p>{card.summary}</p>
        </div>
        <ScoreRing
          value={card.score}
          label={card.grade}
          detail="weighted"
          size={96}
          strokeWidth={7}
          tone={scoreTone(card.score)}
        />
      </header>
      <div className="report-dimension-list">
        {card.dimensions.map((dimension) => (
          <div className="report-dimension" key={dimension.key}>
            <div className="report-dimension__heading">
              <strong>{dimension.label}</strong>
              <span>{Math.round(dimension.weight * 100)}% weight</span>
              <b>{dimension.score}</b>
            </div>
            <div className="report-progress" aria-hidden="true">
              <span style={{ width: `${dimension.score}%` }} />
            </div>
            <p>{dimension.rationale}</p>
            <small>
              {dimension.evidenceIds.length} supporting evidence record{dimension.evidenceIds.length === 1 ? "" : "s"}
            </small>
          </div>
        ))}
      </div>
      <footer>Calculated {compactDate(card.calculatedAt)} from the evidence register in this report.</footer>
    </article>
  );
}

function FindingRow({ finding }: { finding: AuditFinding }) {
  return (
    <article className="report-finding">
      <div className="report-finding__meta">
        <StatusBadge tone={findingTone(finding.severity)}>{finding.severity}</StatusBadge>
        <span>{finding.effort} effort</span>
      </div>
      <h3>{finding.title}</h3>
      <p>{finding.observation}</p>
      <div className="report-finding__impact">
        <strong>Why it matters</strong>
        <span>{finding.implication}</span>
      </div>
      <div className="report-finding__action">
        <ArrowUpRight aria-hidden="true" size={16} />
        <span>{finding.recommendation}</span>
      </div>
    </article>
  );
}

function ReportSectionTitle({
  id,
  number,
  eyebrow,
  title,
  description,
}: {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="report-section-title">
      <span className="report-section-number">{number}</span>
      <div>
        <span className="report-kicker">{eyebrow}</span>
        <h2 id={id}>{title}</h2>
        <p>{description}</p>
      </div>
    </header>
  );
}

export function ClientReport({ lead }: { lead: LeadProfile }) {
  const websiteOpportunities = lead.websiteAudit.sections
    .flatMap((section) => section.opportunities)
    .sort((left, right) => {
      const order: Record<Severity, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
        positive: 4,
      };
      return order[left.severity] - order[right.severity];
    });
  const verifiedAccounts = lead.socialIntelligence.accounts.filter((account) => account.exists);
  const featuredPost = lead.socialIntelligence.topPosts[0];
  const hasLocalMetrics = [lead.localSeoAudit.rating, lead.localSeoAudit.reviewCount, lead.localSeoAudit.ownerResponseRate, lead.localSeoAudit.profileCompleteness, lead.localSeoAudit.napConsistency].some((value) => value !== undefined);
  const publicEmail = lead.contactChannels.find((channel) => channel.kind === "email");
  const publicPhone = lead.contactChannels.find((channel) => channel.kind === "phone");

  return (
    <article className="client-report" aria-labelledby="report-title">
      <header className="report-cover">
        <div className="report-cover__topline">
          <div className="report-wordmark">
            <span aria-hidden="true">Q</span>
            <div>
              <strong>Que Media</strong>
              <small>Business intelligence</small>
            </div>
          </div>
          <div className="report-confidentiality">
            <ShieldCheck aria-hidden="true" size={17} />
            Prepared for human review
          </div>
        </div>

        <div className="report-cover__content">
          <div>
            <span className="report-cover__eyebrow">Growth intelligence report</span>
            <h1 id="report-title">
              {lead.name} <em>opportunity brief</em>
            </h1>
            <p>{lead.executiveSummary}</p>
          </div>
          <div className="report-cover__identity" aria-label="Business identity">
            <BusinessLogo {...lead} tone={lead.thumbnailTone} />
            <strong>{lead.name}</strong>
            <span>{lead.industry}</span>
            <span><MapPin aria-hidden="true" size={14} /> {lead.location}</span>
            <span><Globe2 aria-hidden="true" size={14} /> {lead.identity.ownership}</span>
          </div>
        </div>

        <dl className="report-cover__meta">
          <div><dt>Prepared</dt><dd>{formatDate(lead.lastEnrichedAt)}</dd></div>
          <div><dt>Evidence</dt><dd>{lead.evidence.length} recorded observations</dd></div>
          <div><dt>Sources</dt><dd>{lead.sources.length} public sources</dd></div>
          <div><dt>Review state</dt><dd>{lead.reportReady ? "Report ready" : "Needs review"}</dd></div>
        </dl>
      </header>

      <section className="report-section report-executive" aria-labelledby="report-executive-title">
        <ReportSectionTitle
          id="report-executive-title"
          number="01"
          eyebrow="Decision brief"
          title="Opportunity overview"
          description="A concise reading of fit, timing, and the most relevant contribution Que Media could make."
        />
        <div className="report-score-grid" aria-label="Headline scores">
          <div><ScoreRing value={lead.contentFitScore} label="Content fit" detail={lead.contentFitScorecard.grade} size={112} tone={scoreTone(lead.contentFitScore)} /><p>How naturally this business fits Que Media's short-form strengths.</p></div>
          <div><ScoreRing value={lead.opportunityScore} label="Opportunity" detail={lead.opportunityScorecard.grade} size={112} tone={scoreTone(lead.opportunityScore)} /><p>Expected return on research and relationship effort.</p></div>
          <div><ScoreRing value={lead.responseLikelihood} label="Response" detail="Estimated" size={112} tone={scoreTone(lead.responseLikelihood)} /><p>Positive response estimate if outreach is timely and specific.</p></div>
          {lead.socialIntelligence.score !== undefined ? <div><ScoreRing value={lead.socialIntelligence.score} label="Social" detail="Current" size={112} tone={scoreTone(lead.socialIntelligence.score)} /><p>Current public social effectiveness across measured platforms.</p></div> : null}
        </div>

        <div className="report-brief-grid">
          <article className="report-priority-callout">
            <Target aria-hidden="true" size={22} />
            <span className="report-kicker">Recommended next move</span>
            <h3>{lead.nextBestAction}</h3>
            <p>{lead.whyNow}</p>
          </article>
          <article className="report-context-card">
            <span className="report-kicker">Business context</span>
            <p>{lead.overview}</p>
            <dl>
              <div><dt>Team</dt><dd>{lead.identity.employeeRange || "Unavailable"}</dd></div>
              <div><dt>Locations</dt><dd>{lead.identity.locationCount ?? "Unavailable"}</dd></div>
              <div><dt>Founded</dt><dd>{lead.identity.foundedYear ?? "Unavailable"}</dd></div>
              {publicEmail ? <div><dt>Public email</dt><dd>{publicEmail.value}</dd></div> : null}
              {publicPhone ? <div><dt>Public phone</dt><dd>{publicPhone.value}</dd></div> : null}
              {lead.identity.customerSegments[0] ? <div><dt>Audience</dt><dd>{lead.identity.customerSegments[0]}</dd></div> : null}
            </dl>
          </article>
        </div>

        <div className="report-pain-points">
          <div className="report-subheading">
            <div><span className="report-kicker">Observed friction</span><h3>Evidence-backed pain points</h3></div>
            <StatusBadge tone="info">Evidence linked</StatusBadge>
          </div>
          <div>
            {lead.likelyPainPoints.map((pain, index) => (
              <article key={pain.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div><h4>{pain.title}</h4><p>{pain.explanation}</p></div>
                <StatusBadge tone={pain.confidence === "high" ? "positive" : "warning"}>{pain.confidence}</StatusBadge>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="report-section report-methodology" aria-labelledby="report-method-title">
        <ReportSectionTitle
          id="report-method-title"
          number="02"
          eyebrow="Transparent qualification"
          title="How the scores were calculated"
          description="Every score is a weighted reading of observed facts. Each rationale links back to evidence in the appendix."
        />
        <div className="report-method-grid">
          <ScoreMethod card={lead.contentFitScorecard} />
          <ScoreMethod card={lead.opportunityScorecard} />
          <ScoreMethod card={lead.responseScorecard} />
        </div>
      </section>

      <section className="report-section report-why-now" aria-labelledby="report-why-now-title">
        <ReportSectionTitle
          id="report-why-now-title"
          number="03"
          eyebrow="Timing intelligence"
          title="Current timing signals"
          description="Recorded triggers that may make a useful, relevant conversation more timely."
        />
        <div className="report-signal-grid">
          {lead.whyNowSignals.map((signal) => (
            <article key={signal.id}>
              <header>
                <span className="report-signal-icon"><CalendarClock aria-hidden="true" size={18} /></span>
                <StatusBadge tone={signal.strength === "strong" ? "accent" : "warning"}>{signal.strength}</StatusBadge>
              </header>
              <span className="report-kicker">Signal date {compactDate(signal.occurredAt)}</span>
              <h3>{signal.title}</h3>
              <p>{signal.description}</p>
              <div><strong>Best contact window</strong><span>{signal.bestContactWindow}</span></div>
              <footer><strong>Conversation angle</strong><p>{signal.suggestedAngle}</p></footer>
            </article>
          ))}
          {lead.whyNowSignals.length === 0 ? <p>No current time-bounded business-change signal was verified. This report uses evergreen fit and observed opportunities without manufacturing urgency.</p> : null}
        </div>
      </section>

      <section className="report-section report-social" aria-labelledby="report-social-title">
        <ReportSectionTitle
          id="report-social-title"
          number="04"
          eyebrow="Social and content intelligence"
          title="Verified social presence"
          description="Verified account routes and evidence-backed content opportunities. Activity, performance, and production quality remain unscored without a complete media sample."
        />
        <div className="report-social-overview">
          <article className="report-ink-panel">
            <BarChart3 aria-hidden="true" size={22} />
            <span className="report-kicker">Content diagnosis</span>
            <h3>{lead.socialIntelligence.score !== undefined ? `${lead.socialIntelligence.score}/100 current effectiveness` : "Verified public social presence"}</h3>
            <p>{verifiedAccounts.length > 0 ? `${verifiedAccounts.length} public account${verifiedAccounts.length === 1 ? " was" : "s were"} verified. Performance was not scored unless a complete content sample was available.` : "No public social accounts are recorded in this profile."}</p>
            <div>
              {verifiedAccounts.map((account) => (
                <span key={account.platform}>{account.platform}{account.effectivenessScore !== undefined ? ` · ${account.effectivenessScore}` : ""} · {account.note}</span>
              ))}
            </div>
          </article>
          {featuredPost ? (
            <article className="report-featured-post">
              <span className="report-kicker">Best-performing pattern</span>
              <h3>{featuredPost.title}</h3>
              <div className="report-post-stats">
                <span><strong>{featuredPost.engagementRate}%</strong> engagement</span>
                {typeof featuredPost.views === "number" ? <span><strong>{featuredPost.views.toLocaleString()}</strong> views</span> : null}
                <span><strong>{featuredPost.comments}</strong> comments</span>
              </div>
              <dl>
                <div><dt>Hook</dt><dd>{featuredPost.hook}</dd></div>
                <div><dt>First three seconds</dt><dd>{featuredPost.firstThreeSeconds}</dd></div>
                <div><dt>Why it worked</dt><dd>{featuredPost.whyItWorked}</dd></div>
                <div><dt>Audience reaction</dt><dd>{featuredPost.audienceReaction}</dd></div>
              </dl>
            </article>
          ) : null}
        </div>

        <div className="report-social-grid">
          <article className="report-list-panel">
            <div className="report-subheading"><div><span className="report-kicker">Current mix</span><h3>Observed content mix</h3></div></div>
            <div className="report-content-mix">
              {lead.socialIntelligence.contentMix.map((item) => (
                <div key={item.category}>
                  <header><strong>{item.label}</strong><span>{item.share}% · {item.postCount} posts</span></header>
                  <div className="report-progress" aria-hidden="true"><span style={{ width: `${item.share}%` }} /></div>
                  <p>{item.assessment}</p>
                </div>
              ))}
              {lead.socialIntelligence.contentMix.length === 0 ? <p>Content mix was not quantified because a complete, comparable post sample was not available.</p> : null}
            </div>
          </article>
          <article className="report-list-panel">
            <div className="report-subheading"><div><span className="report-kicker">Production read</span><h3>Independent craft scores</h3></div></div>
            <div className="report-craft-list">
              {lead.socialIntelligence.productionQuality.map((quality) => (
                <div key={quality.dimension}>
                  <span>{quality.dimension}</span><strong>{quality.score}</strong>
                  <div className="report-progress" aria-hidden="true"><span style={{ width: `${quality.score}%` }} /></div>
                  <p>{quality.observation}</p>
                </div>
              ))}
              {lead.socialIntelligence.productionQuality.length === 0 ? <p>Production quality was not scored without a complete media sample.</p> : null}
            </div>
          </article>
        </div>

        <div className="report-opportunity-band">
          <div className="report-subheading"><div><span className="report-kicker">Whitespace</span><h3>Missed content opportunities</h3></div></div>
          <div>
            {lead.socialIntelligence.missedOpportunities.map((opportunity) => (
              <article key={opportunity.title}>
                <Lightbulb aria-hidden="true" size={18} />
                <div><h4>{opportunity.title}</h4><p>{opportunity.rationale}</p><span>{opportunity.format}</span></div>
                <StatusBadge tone={opportunity.potential === "high" ? "accent" : "info"}>{opportunity.potential} potential</StatusBadge>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="report-section report-digital" aria-labelledby="report-digital-title">
        <ReportSectionTitle
          id="report-digital-title"
          number="05"
          eyebrow="Website and local search"
          title="Website surface and local visibility status"
          description="The recorded audit covers HTML-level access, discovery metadata, mobile declaration, structure, contact actions, social linking, and search markup. Speed and local ranking are not inferred."
        />
        <div className="report-digital-scoreband">
          {lead.websiteAudit.score !== undefined ? <ScoreRing value={lead.websiteAudit.score} label="Website" detail="Current" size={116} tone={scoreTone(lead.websiteAudit.score)} /> : <StatusBadge tone="info">Website not scored</StatusBadge>}
          <div>
            <span className="report-kicker">Highest-impact website opportunity</span>
            <h3>{lead.websiteAudit.topOpportunity || "No verified website opportunity is recorded."}</h3>
          </div>
          {lead.localSeoAudit.score !== undefined ? <ScoreRing value={lead.localSeoAudit.score} label="Local SEO" detail="Current" size={116} tone={scoreTone(lead.localSeoAudit.score)} /> : <StatusBadge tone="info">Local SEO not scored</StatusBadge>}
        </div>

        {lead.websiteAudit.performance.length > 0 || hasLocalMetrics ? <div className="report-metric-row" aria-label="Website and local metrics">
          {lead.websiteAudit.performance.slice(0, 4).map((metric) => (
            <div key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}{metric.unit === "score" ? "" : ` ${metric.unit}`}</strong>
              <StatusBadge tone={metric.assessment === "good" ? "positive" : metric.assessment === "poor" ? "critical" : "warning"}>{metric.assessment}</StatusBadge>
            </div>
          ))}
          {lead.localSeoAudit.rating !== undefined ? <div><span>Google rating</span><strong>{lead.localSeoAudit.rating}</strong><small>{lead.localSeoAudit.reviewCount !== undefined ? `${lead.localSeoAudit.reviewCount} reviews` : "Review count not measured"}</small></div> : null}
          {lead.localSeoAudit.ownerResponseRate !== undefined ? <div><span>Owner response</span><strong>{lead.localSeoAudit.ownerResponseRate}%</strong><small>visible sample</small></div> : null}
          {lead.localSeoAudit.profileCompleteness !== undefined ? <div><span>Profile complete</span><strong>{lead.localSeoAudit.profileCompleteness}%</strong><small>{lead.localSeoAudit.primaryCategory}</small></div> : null}
          {lead.localSeoAudit.napConsistency !== undefined ? <div><span>NAP consistency</span><strong>{lead.localSeoAudit.napConsistency}%</strong><small>sampled sources</small></div> : null}
        </div> : <p>No verified website performance or Google Business profile metrics are recorded. Findings below are limited to directly observed evidence.</p>}

        <div className="report-finding-grid">
          {websiteOpportunities.slice(0, 6).map((finding) => <FindingRow finding={finding} key={finding.id} />)}
          {lead.localSeoAudit.findings.filter((finding) => finding.severity !== "positive").slice(0, 3).map((finding) => <FindingRow finding={finding} key={finding.id} />)}
        </div>

        {lead.websiteAudit.quickWins.length > 0 ? <article className="report-quick-wins">
          <div><CheckCircle2 aria-hidden="true" size={21} /><span><strong>{lead.websiteAudit.quickWins.length} practical quick win{lead.websiteAudit.quickWins.length === 1 ? "" : "s"}</strong><small>Prioritized from the recorded audit findings</small></span></div>
          <ol>{lead.websiteAudit.quickWins.map((win) => <li key={win}>{win}</li>)}</ol>
        </article> : <p>No missing HTML surface signal produced a technical quick win. Deeper live-browser, speed, accessibility, and conversion testing remains explicitly unmeasured.</p>}
      </section>

      <section className="report-section report-competitors" aria-labelledby="report-competitor-title">
        <ReportSectionTitle
          id="report-competitor-title"
          number="06"
          eyebrow="Local competitive context"
          title="Local competitive benchmark"
          description="Public local benchmarks are identified by industry and geography. Numeric comparisons are shown only when a matched public dataset exists."
        />
        <div className="report-competitor-grid">
          {lead.competitors.map((competitor) => (
            <article key={competitor.id}>
              <header>
                <span className="report-competitor-mark" aria-hidden="true"><UsersRound size={19} /></span>
                <div><h3>{competitor.name}</h3><p>{competitor.location} · {competitor.positioning}</p></div>
                {competitor.overallScore !== undefined ? <strong>{competitor.overallScore}</strong> : <StatusBadge tone="info">Not scored</StatusBadge>}
              </header>
              <p>{competitor.whyRelevant}</p>
              {competitor.metrics.length > 0 ? <div className="report-comparison-table" role="table" tabIndex={0} aria-label={`Scrollable comparison with ${competitor.name}`}>
                <div role="row" className="report-comparison-head"><span role="columnheader">Measure</span><span role="columnheader">Target</span><span role="columnheader">Competitor</span></div>
                {competitor.metrics.map((metric) => (
                  <div role="row" key={metric.key}>
                    <span role="cell"><strong>{metric.label}</strong><small>{metric.explanation}</small></span>
                    <b role="cell" className={metric.winner === "target" ? "is-winner" : ""}><span>{metric.targetValue}{metric.unit}</span>{metric.winner === "target" ? <small>Leads</small> : null}</b>
                    <b role="cell" className={metric.winner === "competitor" ? "is-winner" : ""}><span>{metric.competitorValue}{metric.unit}</span>{metric.winner === "competitor" ? <small>Leads</small> : null}</b>
                  </div>
                ))}
              </div> : <p>No numeric performance comparison was added without a matched public dataset.</p>}
              <footer>
                <div><span>Where they lead</span>{competitor.advantages.length > 0 ? <ul>{competitor.advantages.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Not scored from the available public evidence.</p>}</div>
                <div><span>Where the target can win</span>{competitor.vulnerabilities.length > 0 ? <ul>{competitor.vulnerabilities.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Not scored from the available public evidence.</p>}</div>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section className="report-section report-recommendations" aria-labelledby="report-recommendations-title">
        <ReportSectionTitle
          id="report-recommendations-title"
          number="07"
          eyebrow="Recommended moves"
          title="A focused content and growth plan"
          description="Recommendations connect observed audience behavior, business timing, current gaps, and Que Media's content-first strengths."
        />
        <div className="report-recommendation-list">
          {lead.recommendations.map((recommendation, index) => (
            <article key={recommendation.id}>
              <div className="report-recommendation-number">{String(index + 1).padStart(2, "0")}</div>
              <div className="report-recommendation-main">
                <div><StatusBadge tone={recommendation.priority === "urgent" || recommendation.priority === "high" ? "accent" : "info"}>{recommendation.priority}</StatusBadge><span>{recommendation.category}</span></div>
                <h3>{recommendation.title}</h3>
                <p>{recommendation.observation}</p>
                <div><strong>Recommended action</strong><p>{recommendation.action}</p></div>
                <small>{recommendation.impact}</small>
              </div>
              {recommendation.contentConcept ? (
                <aside>
                  <Sparkles aria-hidden="true" size={18} />
                  <span className="report-kicker">Production concept</span>
                  <h4>{recommendation.contentConcept.format}</h4>
                  <p><strong>Hook:</strong> {recommendation.contentConcept.hook}</p>
                  <ol>{recommendation.contentConcept.outline.map((step) => <li key={step}>{step}</li>)}</ol>
                  <p><strong>Measure:</strong> {recommendation.contentConcept.successMetric}</p>
                </aside>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="report-section report-evidence" aria-labelledby="report-evidence-title">
        <ReportSectionTitle
          id="report-evidence-title"
          number="08"
          eyebrow="Evidence register"
          title="What this report is built on"
          description="Claims are time-stamped, confidence-rated, and mapped to public sources. Unknown data is left unknown."
        />
        <div className="report-evidence-summary">
          <div><FileCheck2 aria-hidden="true" size={21} /><strong>{lead.evidence.length}</strong><span>evidence records</span></div>
          <div><SearchCheck aria-hidden="true" size={21} /><strong>{lead.sources.length}</strong><span>source records</span></div>
          <div><BookOpenCheck aria-hidden="true" size={21} /><strong>{lead.evidence.filter((item) => item.verified).length}</strong><span>verified observations</span></div>
        </div>

        <div className="report-source-register">
          <h3>Source register</h3>
          <div role="table" tabIndex={0} aria-label="Scrollable source register">
            <div role="row" className="report-source-head"><span role="columnheader">Source</span><span role="columnheader">Kind</span><span role="columnheader">Captured</span><span role="columnheader">Status</span></div>
            {lead.sources.map((source) => {
              const sourceUrl = getAccessibleSourceUrl(source);
              return (
                <div role="row" key={source.id}>
                  <span role="cell">
                    {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer"><strong>{source.label}</strong></a> : <strong>{source.label}</strong>}
                    <small>{source.publisher}</small>
                  </span>
                  <span role="cell">{source.kind.replaceAll("-", " ")}</span>
                  <span role="cell">{compactDate(source.capturedAt)}</span>
                  <span role="cell"><StatusBadge tone={sourceUrl ? "positive" : "critical"}>{sourceUrl ? "Accessible" : "Unavailable"}</StatusBadge></span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="report-evidence-register">
          <h3>Evidence index</h3>
          <div>
            {lead.evidence.map((evidence) => (
              <article key={evidence.id}>
                <header><span>{evidence.id}</span><StatusBadge tone={evidence.confidence === "high" ? "positive" : "warning"}>{evidence.confidence}</StatusBadge></header>
                <h4>{evidence.claim}</h4>
                <p>{evidence.detail}</p>
                <footer><span>{evidence.freshnessLabel}</span><span>{evidence.sourceIds.join(", ")}</span></footer>
              </article>
            ))}
          </div>
        </div>

        <aside className="report-ethics-note">
          <ShieldCheck aria-hidden="true" size={24} />
          <div>
            <h3>Research supports a human relationship</h3>
            <p>This report uses only professionally relevant public context. It prepares Que Media for a thoughtful conversation and never authorizes automated contact. Every message remains manually reviewed, personalized, and sent by a person.</p>
          </div>
        </aside>
      </section>

      <footer className="report-footer">
        <div className="report-wordmark report-wordmark--footer"><span aria-hidden="true">Q</span><div><strong>Que Media</strong><small>We turn views into customers.</small></div></div>
        <p>Prepared from the source and evidence records above · {formatDate(lead.lastEnrichedAt)}</p>
        <span>Research first. Human always.</span>
      </footer>
    </article>
  );
}
