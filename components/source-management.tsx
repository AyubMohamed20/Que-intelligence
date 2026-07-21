"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  KeyRound,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Connector } from "@/lib/types";
import { EmptyState, StatusBadge } from "@/components/ui";

const statusTone: Record<Connector["status"], "positive" | "warning" | "info" | "neutral"> = {
  connected: "positive",
  limited: "warning",
  "setup-required": "info",
  planned: "neutral",
};

export function SourceManagement({ connectors }: { connectors: Connector[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(
    () => connectors.filter((connector) => {
      const matchesQuery = `${connector.name} ${connector.description} ${connector.category}`.toLowerCase().includes(query.toLowerCase());
      return matchesQuery && (status === "all" || connector.status === status);
    }),
    [connectors, query, status],
  );

  if (!connectors.length) {
    return (
      <section className="surface" aria-label="Source connection state">
        <EmptyState
          icon={Database}
          eyebrow="Source network"
          title="No sources connected"
          description="Add approved API, public-web, RSS, browser, or manual-import adapters before collecting business intelligence. No source health or synchronization data is being simulated."
        />
      </section>
    );
  }

  const recordCount = connectors.reduce((sum, connector) => sum + (connector.recordsLastSync ?? 0), 0);
  const availableCount = connectors.filter((connector) => connector.status === "connected" || connector.status === "limited").length;
  const latestSyncAt = connectors
    .map((connector) => connector.lastSyncAt)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];

  return (
    <div className="source-management">
      <section className="source-health" aria-label="Source health summary">
        <div className="source-health__primary surface--ink">
          <div>
            <span className="source-health__icon" aria-hidden="true"><Database size={22} /></span>
            <span className="meta-label">Approved source network</span>
          </div>
          <strong>{availableCount}/{connectors.length}</strong>
          <p>Connectors available or explicitly access-limited</p>
          <span><ShieldCheck aria-hidden="true" size={15} /> Every adapter has a collection purpose and retention policy.</span>
        </div>
        <dl className="source-health__details">
          <div><dt><Activity aria-hidden="true" size={17} /> Last sync records</dt><dd>{recordCount}</dd><span>Reported by connected adapters</span></div>
          <div><dt><Clock3 aria-hidden="true" size={17} /> Latest sync</dt><dd>{latestSyncAt ? new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" }).format(new Date(latestSyncAt)) : "Never"}</dd><span>{latestSyncAt ? new Intl.DateTimeFormat("en-CA", { hour: "numeric", minute: "2-digit" }).format(new Date(latestSyncAt)) : "No source run recorded"}</span></div>
          <div><dt><AlertTriangle aria-hidden="true" size={17} /> Limited access</dt><dd>{connectors.filter((connector) => connector.status === "limited").length}</dd><span>Shown as unavailable, never zero</span></div>
        </dl>
      </section>

      <section className="source-directory surface" aria-labelledby="source-directory-title">
        <div className="surface-header source-toolbar">
          <div>
            <h2 id="source-directory-title">Connector directory</h2>
            <p>Access method, refresh policy, coverage, and known limitations.</p>
          </div>
          <div className="source-filters">
            <label className="source-search">
              <Search aria-hidden="true" size={16} />
              <span className="sr-only">Search connectors</span>
              <input name="source-query" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sources…" autoComplete="off" spellCheck={false} />
            </label>
            <label>
              <span className="sr-only">Filter by status</span>
              <select name="source-status" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="connected">Connected</option>
                <option value="limited">Limited</option>
                <option value="setup-required">Setup required</option>
                <option value="planned">Planned</option>
              </select>
            </label>
          </div>
        </div>

        <p className="sr-only" role="status" aria-live="polite">{filtered.length} of {connectors.length} connectors shown.</p>

        <div className="connector-list">
          {filtered.map((connector) => (
            <article className="connector-row" key={connector.id}>
              <span className={`connector-mark connector-mark--${connector.status}`} aria-hidden="true">
                {connector.status === "connected" ? <CheckCircle2 size={19} /> : connector.status === "setup-required" ? <KeyRound size={19} /> : <Database size={19} />}
              </span>
              <div className="connector-identity">
                <strong>{connector.name}</strong>
                <span>{connector.description}</span>
                <div>
                  <StatusBadge tone={statusTone[connector.status]}>{connector.status.replace("-", " ")}</StatusBadge>
                  <span className="connector-method">{connector.accessMode.replace("-", " ")}</span>
                </div>
              </div>
              <dl className="connector-meta">
                <div><dt>Refresh</dt><dd>{connector.freshness}</dd></div>
                <div><dt>Coverage</dt><dd>{connector.coverage}</dd></div>
                <div><dt>Last sync</dt><dd>{connector.lastSyncAt ? new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "short", day: "numeric" }).format(new Date(connector.lastSyncAt)) : "Never"}</dd></div>
              </dl>
              <div className="connector-supports">
                <span className="meta-label">Supports</span>
                <p>{connector.supports.slice(0, 3).join(" · ")}</p>
                {connector.limitation ? <small>{connector.limitation}</small> : null}
              </div>
            </article>
          ))}
          {!filtered.length ? <div className="connector-empty">No sources match this view.</div> : null}
        </div>
      </section>
    </div>
  );
}
