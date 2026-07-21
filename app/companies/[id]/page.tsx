import type { Metadata } from "next";
import { ArrowLeft, Bot, Clock3 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyWorkspace } from "@/components/company-workspace";
import { BusinessLogo, EmptyState, ScoreRing, StatusBadge } from "@/components/ui";
import { getLeadProfile, getLeadSummary, leadSummaries } from "@/lib/runtime-data";

export const dynamicParams = false;

export function generateStaticParams() {
  return leadSummaries.map((lead) => ({ id: lead.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const lead = getLeadSummary(id);
  if (!lead) return { title: "Company not found" };
  return {
    title: lead.name,
    description: `Verified business intelligence and manual outreach preparation for ${lead.name}.`,
  };
}

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const summary = getLeadSummary(id);
  if (!summary) notFound();
  const profile = getLeadProfile(id);
  if (profile) return <CompanyWorkspace lead={profile} />;

  return (
    <div className="company-compiling">
      <Link className="company-breadcrumb" href="/companies"><ArrowLeft aria-hidden="true" size={15} /> Companies</Link>
      <section className="company-header surface">
        <div className="company-header__identity"><BusinessLogo {...summary} tone={summary.thumbnailTone} /><div><div className="company-title-line"><h1>{summary.name}</h1><StatusBadge tone="warning">Research in progress</StatusBadge></div><p>{summary.industry} · {summary.neighborhood}</p></div></div>
        <div className="company-header__scores"><ScoreRing value={summary.contentFitScore} label="Content fit" size={92} /><ScoreRing value={summary.opportunityScore} label="Opportunity" size={92} tone="warning" /><ScoreRing value={summary.responseLikelihood} label="Response" size={92} tone="neutral" /></div>
      </section>
      <section className="surface"><EmptyState icon={Bot} eyebrow="Specialists at work" title="The intelligence package is still being verified." description={`${summary.sourceCount} sources and ${summary.evidenceCount} evidence records are being reconciled. ${summary.topSignal} is already visible, but no outreach draft will be prepared until the evidence reviewer clears the package.`} action={<Link className="button button--secondary" href="/agents"><Clock3 aria-hidden="true" size={16} /> View research agents</Link>} secondaryAction={<Link className="button button--ghost" href="/companies">Return to companies</Link>} /></section>
    </div>
  );
}
