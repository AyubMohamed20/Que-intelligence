import { LeadTable } from "@/components/lead-table";
import { PageHeading } from "@/components/page-heading";
import {
  getDailyDashboard,
  listOperatingLeadSummaries,
} from "@/lib/server/lead-repository";

export const metadata = { title: "Outreach" };
export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const dashboard = await getDailyDashboard();
  const leads = await listOperatingLeadSummaries();

  return (
    <>
      <PageHeading
        eyebrow="Daily sending desk"
        title={<>Turn verified research into <em>reviewed conversations.</em></>}
        description="Choose an email-ready qualified lead, verify its evidence-backed draft, then approve the exact campaign, sender, recipient, subject, and message inside the lead workspace."
      />
      <section className="outreach-queue-summary" aria-label="Outreach queue status">
        <article className="surface">
          <span>Actually contacted today</span>
          <strong>{dashboard.newBusinessesContactedToday}</strong>
          <small>Counted only after Instantly reports email_sent</small>
        </article>
        <article className="surface">
          <span>Remaining to daily target</span>
          <strong>{dashboard.remainingToTarget}</strong>
          <small>Target: {dashboard.target} new qualified businesses</small>
        </article>
        <article className="surface">
          <span>Ready queue</span>
          <strong>{dashboard.readyQueueCount}</strong>
          <small>Qualified, email-ready, and not yet contacted</small>
        </article>
        <article className="surface">
          <span>Follow-ups due</span>
          <strong>{dashboard.followUpDueCount}</strong>
          <small>Existing conversations requiring action</small>
        </article>
      </section>
      <LeadTable leads={leads} initialView="ready-for-outreach" />
    </>
  );
}
