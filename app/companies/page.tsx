import { PageHeading } from "@/components/page-heading";
import { LeadTable } from "@/components/lead-table";
import { listOperatingLeadSummaries } from "@/lib/server/lead-repository";

export const metadata = { title: "Companies" };

export default async function CompaniesPage() {
  const leadSummaries = await listOperatingLeadSummaries();
  return (
    <>
      <PageHeading
        eyebrow="Company intelligence"
        title={<>One evolving record for <em>every business.</em></>}
        description="Profiles merge research, evidence, contacts, qualification, personalized outreach, Instantly activity, replies, and the next action."
      />
      <section className="surface discovery-table" aria-labelledby="company-directory-title">
        <div className="surface-header"><div><h2 id="company-directory-title">Lead operating system</h2><p>{leadSummaries.length} Ottawa-market records with research, evidence, and lifecycle state.</p></div></div>
        <LeadTable leads={leadSummaries} />
      </section>
    </>
  );
}
