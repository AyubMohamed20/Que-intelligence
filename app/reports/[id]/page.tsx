import type { Metadata } from "next";
import { ArrowLeft, FileCheck2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientReport } from "@/components/client-report";
import { PrintReportButton } from "@/components/report-actions";
import { StatusBadge } from "@/components/ui";
import { getLeadProfile, leadProfiles } from "@/lib/runtime-data";

export const dynamicParams = false;

export function generateStaticParams() {
  return leadProfiles.filter((lead) => lead.reportReady).map((lead) => ({ id: lead.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const lead = getLeadProfile(id);
  if (!lead?.reportReady) return { title: "Report not found" };
  return {
    title: `${lead.name} Intelligence Report`,
    description: `Client-ready growth intelligence report for ${lead.name}.`,
  };
}

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = getLeadProfile(id);
  if (!lead?.reportReady) notFound();

  return (
    <div className="report-viewer">
      <nav className="report-toolbar" aria-label="Report actions">
        <Link className="report-toolbar__back" href="/reports"><ArrowLeft aria-hidden="true" size={16} /> Report library</Link>
        <div className="report-toolbar__state"><FileCheck2 aria-hidden="true" size={16} /><span><strong>{lead.name}</strong><small>Client-ready audit</small></span></div>
        <div className="report-toolbar__actions">
          <StatusBadge tone="positive" icon={ShieldCheck}>Evidence validated</StatusBadge>
          <PrintReportButton />
        </div>
      </nav>
      <ClientReport lead={lead} />
    </div>
  );
}
