import { ShieldCheck } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { AgentOperations } from "@/components/agent-operations";
import { StatusBadge } from "@/components/ui";
import { researchAgents } from "@/lib/agent-registry";

export const metadata = { title: "Research agents" };

export default function AgentsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Research architecture"
        title={<>Connect specialists that <em>check their own work.</em></>}
        description="Configured workers can discover, audit, compare, and prepare. Evidence review and a mandatory human gate remain part of every outreach workflow."
        actions={<StatusBadge tone="positive" icon={ShieldCheck}>No send capability</StatusBadge>}
      />
      <AgentOperations agents={researchAgents} />
    </>
  );
}
