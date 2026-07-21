"use client";

import {
  Bot,
  Building2,
  Clock3,
  Combine,
  FileCheck2,
  FileText,
  MapPinned,
  MonitorSmartphone,
  Palette,
  Radar,
  ScanSearch,
  Sparkles,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ResearchAgent } from "@/lib/types";
import { EmptyState, StatusBadge } from "@/components/ui";

const iconMap: Record<string, LucideIcon> = {
  Radar,
  Combine,
  Building2,
  MonitorSmartphone,
  MapPinned,
  ScanSearch,
  Palette,
  Target,
  Sparkles,
  FileCheck2,
  FileText,
  Bot,
};

const stageNames: Record<ResearchAgent["stage"], string> = {
  discover: "Discover",
  enrich: "Enrich",
  analyze: "Analyze",
  strategize: "Strategize",
  validate: "Validate",
  prepare: "Prepare",
};

function formatTime(value?: string) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function AgentOperations({ agents }: { agents: ResearchAgent[] }) {
  if (!agents.length) {
    return (
      <section className="surface" aria-label="Research agent connection state">
        <EmptyState
          icon={Bot}
          eyebrow="Research system"
          title="No research agents connected"
          description="Connect real workers and their evidence gates before running discovery, audits, strategy, or outreach preparation. The workspace will not invent agent health or run history."
        />
      </section>
    );
  }

  const runsToday = agents.reduce((sum, agent) => sum + agent.runCountToday, 0);
  const averageConfidence = Math.round(agents.reduce((sum, agent) => sum + agent.averageConfidence, 0) / agents.length);
  const latestRunAt = agents
    .map((agent) => agent.lastRunAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];

  return (
    <div className="agent-operations">
      <section className="agent-summary surface" aria-label="Agent operations summary">
        <div className="agent-summary__intro">
          <span className="agent-summary__mark" aria-hidden="true"><Bot size={24} /></span>
          <div>
            <span className="meta-label">Research system</span>
            <h2>{agents.length} specialists, one evidence standard</h2>
            <p>Each agent owns one job. The verifier can hold any weak claim before it reaches a report or outreach draft.</p>
          </div>
        </div>
        <dl className="agent-summary__stats">
          <div><dt>Runs today</dt><dd>{runsToday}</dd></div>
          <div><dt>Mean confidence</dt><dd>{averageConfidence}%</dd></div>
          <div><dt>Needs review</dt><dd>{agents.filter((agent) => agent.status === "review-needed").length}</dd></div>
        </dl>
      </section>

      <section className="orchestration-flow" aria-labelledby="orchestration-title">
        <div className="section-heading-row">
          <div>
            <h2 id="orchestration-title" className="section-title">Research orchestration</h2>
            <p className="section-description">A durable path from discovery to a human-reviewed conversation brief.</p>
          </div>
          <StatusBadge tone="info">{agents.length} connected</StatusBadge>
        </div>
        <ol>
          {(["discover", "enrich", "analyze", "strategize", "validate", "prepare"] as const).map((stage, index) => {
            const count = agents.filter((agent) => agent.stage === stage).length;
            return (
              <li key={stage}>
                <span>{index + 1}</span>
                <div><strong>{stageNames[stage]}</strong><small>{count} {count === 1 ? "agent" : "agents"}</small></div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="agent-list surface" aria-labelledby="agent-list-title">
        <div className="surface-header">
          <div>
            <h2 id="agent-list-title">Specialist health</h2>
            <p>Live state, recent work, and who reviews each output.</p>
          </div>
          <span className="data-freshness"><Clock3 aria-hidden="true" size={15} /> {latestRunAt ? `Latest run ${formatTime(latestRunAt)}` : "No run recorded"}</span>
        </div>
        <div className="agent-list__rows">
          {agents.map((agent) => {
            const Icon = iconMap[agent.icon] ?? Bot;
            const lastRun = [...agent.runs].sort(
              (left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
            )[0];
            return (
              <article className="agent-row" key={agent.id}>
                <span className={`agent-icon agent-icon--${agent.accent}`} aria-hidden="true"><Icon size={19} /></span>
                <div className="agent-row__identity">
                  <strong>{agent.name}</strong>
                  <span>{agent.role}</span>
                </div>
                <div className="agent-row__status">
                  <StatusBadge tone={agent.status === "review-needed" ? "warning" : agent.status === "working" ? "accent" : "positive"}>
                    {agent.status.replace("-", " ")}
                  </StatusBadge>
                  <span>{stageNames[agent.stage]}</span>
                </div>
                <div className="agent-row__confidence">
                  <span><strong>{agent.averageConfidence}%</strong> confidence</span>
                </div>
                <div className="agent-row__run">
                  <strong>{lastRun?.summary ?? "No run recorded."}</strong>
                  <span>Last {formatTime(agent.lastRunAt)} · Next {formatTime(agent.nextRunAt)}</span>
                </div>
                <details className="agent-details">
                  <summary>Details</summary>
                  <div>
                    <p>{agent.description}</p>
                    <span className="meta-label">Capabilities</span>
                    <ul>{agent.capabilities.map((capability) => <li key={capability}>{capability}</li>)}</ul>
                    <span className="meta-label">Review path</span>
                    <p>{agent.reviewedByAgentIds.length ? `${agent.reviewedByAgentIds.length} downstream reviewers` : "No downstream reviewer configured"}</p>
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
