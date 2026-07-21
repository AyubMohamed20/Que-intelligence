import { PageHeading } from "@/components/page-heading";
import { SettingsPanel } from "@/components/settings-panel";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Workspace controls"
        title={<>Tune the system without hiding <em>how it thinks.</em></>}
        description="Set local scoring preferences, evidence thresholds, public-data boundaries, and notification cadence. Backend enforcement begins only after a research service is connected."
      />
      <SettingsPanel />
    </>
  );
}
