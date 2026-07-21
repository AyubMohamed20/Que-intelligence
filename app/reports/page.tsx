import type { Metadata } from "next";
import { ArrowRight, FileText, Radar } from "lucide-react";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { BusinessLogo, EmptyState, StatusBadge } from "@/components/ui";
import { leadProfiles } from "@/lib/runtime-data";

export const metadata: Metadata = {
  title: "Reports",
  description: "Evidence-backed opportunity reports prepared for manual Que Media outreach.",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function ReportsPage() {
  const readyReports = leadProfiles.filter((lead) => lead.reportReady);

  return (
    <div className="reports-library">
      <PageHeading
        eyebrow="Client-ready intelligence"
        title={<>Reports that make the first conversation <em>worth having.</em></>}
        description="Professional decision briefs built from research, not generic templates. Each report explains the opportunity, timing, strategy, and evidence behind every recommendation."
        actions={readyReports[0] ? (
          <Link className="button button--primary" href={`/reports/${readyReports[0].id}`}>
            <FileText aria-hidden="true" size={16} /> Open latest report
          </Link>
        ) : undefined}
      />

      {readyReports.length ? (
        <section className="report-queue surface" aria-labelledby="report-library-title">
          <div className="surface-header">
            <div><h2 id="report-library-title">Ready reports</h2><p>Every report passed the current source, contact, duplicate, and website validation checks. Outreach still requires human review.</p></div>
          </div>
          <div className="report-queue__table" role="table" aria-label="Ready intelligence reports">
            <div className="report-queue__row report-queue__head" role="row">
              <span role="columnheader">Business</span><span role="columnheader">Status</span><span role="columnheader">Evidence</span><span role="columnheader">Refreshed</span><span role="columnheader">Report</span>
            </div>
            {readyReports.map((lead) => (
              <div className="report-queue__row" role="row" key={lead.id}>
                <span role="cell"><BusinessLogo {...lead} tone={lead.thumbnailTone} /><span><strong>{lead.name}</strong><small>{lead.industry} · {lead.neighborhood}</small></span></span>
                <span role="cell"><StatusBadge tone="positive">Validated</StatusBadge></span>
                <span role="cell"><strong>{lead.evidenceCount}</strong><small>{lead.sourceCount} sources</small></span>
                <span role="cell"><strong>{formatDate(lead.lastEnrichedAt)}</strong><small>Verified research</small></span>
                <span role="cell"><Link className="text-button" href={`/reports/${lead.id}`}>Open report <ArrowRight aria-hidden="true" size={14} /></Link></span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="surface" aria-label="Report library">
          <EmptyState
            icon={FileText}
            eyebrow="Report library"
            title="No intelligence reports yet"
            description="A client-ready report will appear only after a business profile has enough verified evidence and passes human quality review."
            action={<Link className="button button--primary" href="/discover"><Radar aria-hidden="true" size={16} /> Start with discovery</Link>}
            secondaryAction={<Link className="button button--secondary" href="/companies">View company library</Link>}
          />
        </section>
      )}
    </div>
  );
}
