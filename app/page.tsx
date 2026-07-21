import { PageHeading } from "@/components/page-heading";
import { DashboardOverview } from "@/components/dashboard-overview";

export default function HomePage() {
  return (
    <>
      <PageHeading
        eyebrow="Morning briefing"
        title={<>Know who matters <em>before you reach out.</em></>}
        description="Review the verified Ottawa-market businesses with the strongest Que Media fit, clearest opportunity, and most useful current context before any manual outreach."
      />
      <DashboardOverview />
    </>
  );
}
