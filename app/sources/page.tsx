import { Cable } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { SourceManagement } from "@/components/source-management";
import { StatusBadge } from "@/components/ui";
import { connectors } from "@/lib/agent-registry";

export const metadata = { title: "Data sources" };

export default function SourcesPage() {
  return (
    <>
      <PageHeading
        eyebrow="Provenance and access"
        title={<>Every conclusion starts with a <em>known source.</em></>}
        description="Authorized adapters will show what the platform can observe, how often it refreshes, and which limitations must remain visible in analysis."
        actions={connectors.length ? undefined : <StatusBadge tone="pending" icon={Cable}>No sources connected</StatusBadge>}
      />
      <SourceManagement connectors={connectors} />
    </>
  );
}
