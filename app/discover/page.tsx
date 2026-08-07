import { PageHeading } from "@/components/page-heading";
import { LeadTable } from "@/components/lead-table";
import { ResearchCyclePanel } from "@/components/research-cycle-panel";
import {
  getLatestResearchBatch,
  listOperatingLeadSummaries,
} from "@/lib/server/lead-repository";

export const metadata = { title: "Discover" };

export default async function DiscoverPage() {
  const leadSummaries = await listOperatingLeadSummaries();
  const latestBatch = await getLatestResearchBatch();
  return (
    <>
      <PageHeading
        eyebrow="Ottawa opportunity universe"
        title={<>Find the next 10. <em>Keep every strong lead.</em></>}
        description="Each research cycle continues until at least 10 newly qualified businesses have verified or usable email addresses. Strong leads without email remain visible, but do not satisfy the email-ready gate."
      />
      <ResearchCyclePanel initialBatch={latestBatch} />
      <section className="surface discovery-table" aria-labelledby="discovery-table-title">
        <div className="surface-header"><div><h2 id="discovery-table-title">Research library</h2><p>Scan new, opening-soon, recently opened, email-ready, and email-missing opportunities without confusing research with actual contact.</p></div></div>
        <LeadTable leads={leadSummaries} initialView="new-businesses" />
      </section>
    </>
  );
}
