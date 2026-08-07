import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CompanyWorkspace,
  type WorkspaceTab,
} from "@/components/company-workspace";
import { getOperatingLeadProfile } from "@/lib/server/lead-repository";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lead = await getOperatingLeadProfile(id);
  if (!lead) notFound();
  return {
    title: lead.name,
    description: `Research, lead lifecycle, personalized outreach, and relationship history for ${lead.name}.`,
  };
}

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const lead = await getOperatingLeadProfile(id);
  if (!lead) notFound();
  const tabs: WorkspaceTab[] = [
    "overview",
    "social",
    "website",
    "competitors",
    "strategy",
    "outreach",
    "relationship",
  ];
  const initialTab = tabs.includes(tab as WorkspaceTab)
    ? (tab as WorkspaceTab)
    : "overview";
  return <CompanyWorkspace lead={lead} initialTab={initialTab} />;
}
