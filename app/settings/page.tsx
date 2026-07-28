import { PageHeading } from "@/components/page-heading";
import { InstantlySettings } from "@/components/instantly-settings";
import { SettingsPanel } from "@/components/settings-panel";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Workspace controls"
        title={<>Control access without exposing <em>sensitive credentials.</em></>}
        description="Review Instantly sender and campaign eligibility, then tune local display preferences. Integration secrets and authorization rules remain server-side."
      />
      <InstantlySettings />
      <SettingsPanel />
    </>
  );
}
