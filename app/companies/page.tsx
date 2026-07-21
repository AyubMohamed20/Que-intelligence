import { PageHeading } from "@/components/page-heading";
import { LeadTable } from "@/components/lead-table";
import { leadSummaries } from "@/lib/runtime-data";

export const metadata = { title: "Companies" };

export default function CompaniesPage() {
  return (
    <>
      <PageHeading
        eyebrow="Company intelligence"
        title={<>One evolving record for <em>every business.</em></>}
        description="Profiles merge identity, public presence, audits, signals, strategy, relationship history, and manual outreach preparation."
      />
      <section className="surface discovery-table" aria-labelledby="company-directory-title">
        <div className="surface-header"><div><h2 id="company-directory-title">Intelligence library</h2><p>{leadSummaries.length} Ottawa-market business profiles passed the current source, contact, and duplicate checks.</p></div></div>
        <LeadTable leads={leadSummaries} />
      </section>
    </>
  );
}
