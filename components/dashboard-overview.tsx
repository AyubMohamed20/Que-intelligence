import {
  ArrowRight,
  Building2,
  Cable,
  FileText,
  Radar,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { BusinessLogo, EmptyState, StatusBadge } from "@/components/ui";
import {
  dashboardMetrics,
  leadProfiles,
  leadSummaries,
} from "@/lib/runtime-data";

export function DashboardOverview() {
  if (!dashboardMetrics.length || !leadProfiles.length || !leadSummaries.length) {
    return <EmptyDashboardOverview />;
  }

  const rankedLeads = [...leadSummaries]
    .sort(
      (a, b) =>
        b.opportunityScore - a.opportunityScore ||
        b.contentFitScore - a.contentFitScore ||
        a.name.localeCompare(b.name),
    )
    .slice(0, 5);
  const topLead = rankedLeads[0];
  const currentSignalCount = leadProfiles.filter(
    (lead) => lead.whyNowSignals.length > 0,
  ).length;
  const readyReportCount = leadProfiles.filter((lead) => lead.reportReady).length;
  const signalNoun = currentSignalCount === 1 ? "business carries" : "businesses carry";

  return (
    <div className="dashboard-overview">
      <section className="decision-brief" aria-labelledby="decision-brief-title">
        <div className="decision-brief__copy">
          <span className="decision-brief__mark" aria-hidden="true">
            <Radar size={20} />
          </span>
          <p>Verified intelligence briefing</p>
          <h2 id="decision-brief-title">
            The cohort is ready. <em>{currentSignalCount} {signalNoun} a current signal.</em>
          </h2>
          <p>
            {leadSummaries.length} distinct Ottawa-market businesses are ranked from verified
            opportunity and Que Media content-fit scores. Every outreach action remains manual.
          </p>
          <div className="decision-brief__actions">
            <Link className="button button--primary" href="/companies">
              <Building2 aria-hidden="true" size={16} /> Open companies
            </Link>
            <Link className="button button--ghost" href="/reports">
              View reports <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>
        </div>

        <article className="decision-brief__focus" aria-label={`Top-ranked lead: ${topLead.name}`}>
          <div className="focus-header">
            <StatusBadge tone="positive">Source checked</StatusBadge>
            <span>Highest opportunity score</span>
          </div>
          <div className="focus-company">
            <BusinessLogo {...topLead} tone={topLead.thumbnailTone} />
            <div>
              <strong>{topLead.name}</strong>
              <span>{topLead.industry} · {topLead.neighborhood}</span>
            </div>
          </div>
          <dl>
            <div><dt>Opportunity</dt><dd>{topLead.opportunityScore}</dd></div>
            <div><dt>Content fit</dt><dd>{topLead.contentFitScore}</dd></div>
            <div><dt>Response</dt><dd>{topLead.responseLikelihood}</dd></div>
          </dl>
          <div className="focus-reason">
            <Radar aria-hidden="true" size={17} />
            <div>
              <strong>Current context</strong>
              <p>{topLead.whyNow}</p>
            </div>
          </div>
          <div className="focus-proof">
            <ShieldCheck aria-hidden="true" size={16} />
            {topLead.evidenceCount} evidence points across {topLead.sourceCount} sources
          </div>
          <Link className="text-button focus-company-link" href={`/companies/${topLead.id}`}>
            Open company brief <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </article>
      </section>

      <section className="surface metric-strip" aria-labelledby="cohort-metrics-title">
        <h2 className="sr-only" id="cohort-metrics-title">Current verified cohort metrics</h2>
        {dashboardMetrics.slice(0, 4).map((metric) => (
          <article key={metric.id}>
            <div>
              <span>{metric.label}</span>
              <strong>{metric.displayValue}</strong>
            </div>
            <small>{metric.helper}</small>
          </article>
        ))}
      </section>

      <div className="dashboard-main-grid">
        <section className="surface briefing-rankings" aria-labelledby="priority-companies-title">
          <div className="surface-header">
            <div>
              <h2 id="priority-companies-title">Priority companies</h2>
              <p>Opportunity score leads the order. Content fit breaks ties.</p>
            </div>
            <Link className="text-button" href="/companies">
              View all {leadSummaries.length} <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </div>
          <ol className="priority-lead-list">
            {rankedLeads.map((lead, index) => (
              <li className="priority-lead-item" key={lead.id}>
                <span className="priority-lead__rank">
                  <span className="sr-only">Rank </span>{index + 1}
                </span>
                <BusinessLogo {...lead} tone={lead.thumbnailTone} />
                <Link className="priority-lead__identity" href={`/companies/${lead.id}`}>
                  <strong>{lead.name}</strong>
                  <span>{lead.industry} · {lead.neighborhood}</span>
                </Link>
                <div className="priority-lead__scores">
                  <span aria-label={`Opportunity: ${lead.opportunityScore} out of 100`}>
                    <small>Opportunity</small>
                    <strong>{lead.opportunityScore}</strong>
                  </span>
                  <span aria-label={`Content fit: ${lead.contentFitScore} out of 100`}>
                    <small>Content fit</small>
                    <strong>{lead.contentFitScore}</strong>
                  </span>
                </div>
                <Link className="row-open" href={`/companies/${lead.id}`} aria-label={`Open ${lead.name}`}>
                  <ArrowRight aria-hidden="true" size={17} />
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section className="surface briefing-navigation" aria-labelledby="briefing-navigation-title">
          <div className="surface-header">
            <div>
              <h2 id="briefing-navigation-title">Continue the review</h2>
              <p>Move from the cohort view into the evidence.</p>
            </div>
          </div>
          <div className="briefing-navigation__signal">
            <Radar aria-hidden="true" size={18} />
            <p><strong>{currentSignalCount} of {leadProfiles.length}</strong> profiles carry verified current signals.</p>
          </div>
          <nav className="briefing-navigation__links" aria-label="Dashboard destinations">
            <Link href="/companies">
              <Building2 aria-hidden="true" size={18} />
              <span><strong>Company intelligence</strong><small>{leadSummaries.length} verified profiles</small></span>
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
            <Link href="/reports">
              <FileText aria-hidden="true" size={18} />
              <span><strong>Client-ready reports</strong><small>{readyReportCount} available for review</small></span>
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </nav>
          <p className="briefing-navigation__boundary">
            <ShieldCheck aria-hidden="true" size={16} /> Research prepares the conversation. A person reviews and sends.
          </p>
        </section>
      </div>
    </div>
  );
}

function EmptyDashboardOverview() {
  return (
    <div className="dashboard-overview">
      <section className="surface" aria-label="Intelligence briefing">
        <EmptyState
          icon={Radar}
          eyebrow="Workspace ready"
          title="Your intelligence briefing is waiting for research"
          description="Connect approved public sources, discover Ottawa businesses, and verify the evidence before any company is scored or recommended for outreach."
          action={
            <Link className="button button--primary" href="/sources">
              <Cable aria-hidden="true" size={16} /> Configure sources
            </Link>
          }
          secondaryAction={
            <Link className="button button--secondary" href="/discover">
              Open discovery
            </Link>
          }
        />
      </section>

      <div className="dashboard-main-grid">
        <section className="surface" aria-labelledby="empty-company-library-title">
          <EmptyState
            icon={Building2}
            eyebrow="Company intelligence"
            title={<span id="empty-company-library-title">No researched businesses yet</span>}
            description="Verified business profiles will collect identity, timing signals, online presence, and strategic opportunities in one evidence-backed record."
            action={<Link className="button button--secondary" href="/companies">Open company library</Link>}
          />
        </section>

        <section className="surface" aria-labelledby="empty-report-library-title">
          <EmptyState
            icon={FileText}
            eyebrow="Client-ready reports"
            title={<span id="empty-report-library-title">No reports are ready</span>}
            description="Reports remain unavailable until their source claims are reconciled and their recommendations pass human review."
            action={<Link className="button button--secondary" href="/reports">Open report library</Link>}
          />
        </section>
      </div>
    </div>
  );
}
