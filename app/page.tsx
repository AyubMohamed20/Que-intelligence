import { PageHeading } from "@/components/page-heading";
import { DashboardOverview } from "@/components/dashboard-overview";
import {
  getDailyDashboard,
  listOperatingLeadSummaries,
} from "@/lib/server/lead-repository";

export default async function HomePage() {
  const dashboard = await getDailyDashboard();
  const leads = await listOperatingLeadSummaries();
  return (
    <>
      <PageHeading
        eyebrow="Daily acquisition command"
        title={<>Research deeply. <em>Contact deliberately.</em></>}
        description="One operating view for qualified Ottawa prospects, personalized Instantly outreach, replies, next actions, and the daily goal of 10 newly contacted email-ready businesses."
      />
      <DashboardOverview dashboard={dashboard} leads={leads} />
    </>
  );
}
