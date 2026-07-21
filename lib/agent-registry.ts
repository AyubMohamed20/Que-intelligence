import type { Connector, ResearchAgent } from "@/lib/types";

/**
 * Operational registries remain empty until real workers and authorized source
 * adapters are connected. Static health, run, and synchronization records are
 * intentionally prohibited.
 */
export const researchAgents: ResearchAgent[] = [];
export const connectors: Connector[] = [];

export const orchestrationStages = [
  { id: "discover", label: "Discover", description: "Find and resolve businesses from approved sources." },
  { id: "enrich", label: "Enrich", description: "Build verified identity, context, and timing signals." },
  { id: "analyze", label: "Analyze", description: "Audit the digital presence and competitive landscape." },
  { id: "strategize", label: "Strategize", description: "Translate evidence into priorities and recommendations." },
  { id: "validate", label: "Validate", description: "Hold unsupported claims for human review." },
  { id: "prepare", label: "Prepare", description: "Draft materials for manual review and use." },
] as const;

export const agentRegistry = researchAgents;
export const connectorRegistry = connectors;
