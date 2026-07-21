import { connectors, orchestrationStages, researchAgents } from "@/lib/agent-registry";

export function GET() {
  return Response.json({
    data: {
      agents: researchAgents,
      connectors,
      stages: orchestrationStages,
    },
    meta: {
      asOf: new Date().toISOString(),
      dataState: researchAgents.length || connectors.length ? "connected" : "empty",
      outreachCapability: "none",
    },
  });
}
