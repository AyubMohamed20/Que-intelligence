import { DiscoverySweepAction } from "@/components/discovery-sweep-action";
import { PageHeading } from "@/components/page-heading";
import { LeadTable } from "@/components/lead-table";
import { leadSummaries } from "@/lib/runtime-data";

export const metadata = { title: "Discover" };

export default function DiscoverPage() {
  return (
    <>
      <PageHeading
        eyebrow="Ottawa opportunity universe"
        title={<>Find fewer businesses. <em>Understand them better.</em></>}
        description="Multi-source discovery merges duplicate listings, detects growth signals, and ranks businesses by Que Media fit and expected return on effort."
        actions={<DiscoverySweepAction />}
      />
      <section className="surface discovery-table" aria-labelledby="discovery-table-title">
        <div className="surface-header"><div><h2 id="discovery-table-title">Qualified businesses</h2><p>{leadSummaries.length} distinct Ottawa-market businesses are ranked from the verified research cohort. Configure a source before starting another discovery sweep.</p></div></div>
        <LeadTable leads={leadSummaries} />
      </section>
    </>
  );
}
