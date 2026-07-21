"use client";

import { ArrowUpDown, Building2, ChevronRight, Filter, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { LeadSummary, Priority } from "@/lib/types";
import { BusinessLogo, EmptyState, StatusBadge } from "@/components/ui";

const priorityTone: Record<Priority, "critical" | "warning" | "info" | "neutral"> = {
  urgent: "critical",
  high: "warning",
  medium: "info",
  low: "neutral",
};

const stageLabel: Record<LeadSummary["stage"], string> = {
  watchlist: "Watchlist",
  qualified: "Qualified",
  "audit-ready": "Audit ready",
  "outreach-ready": "Outreach ready",
  contacted: "Contacted",
  conversation: "Conversation",
  proposal: "Proposal",
  client: "Client",
  "not-a-fit": "Not a fit",
};

type SortOption = "priority" | "content-fit" | "opportunity" | "response" | "recent";

const priorityRank: Record<Priority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

export function LeadTable({ leads, compact = false }: { leads: LeadSummary[]; compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState<SortOption>("priority");

  const visibleLeads = useMemo(() => {
    const filtered = leads.filter((lead) => {
      const haystack = `${lead.name} ${lead.industry} ${lead.neighborhood} ${lead.tags.join(" ")}`.toLowerCase();
      return haystack.includes(query.toLowerCase()) && (priority === "all" || lead.priority === priority);
    });

    return [...filtered].sort((a, b) => {
      if (sort === "content-fit") return b.contentFitScore - a.contentFitScore;
      if (sort === "opportunity") return b.opportunityScore - a.opportunityScore;
      if (sort === "response") return b.responseLikelihood - a.responseLikelihood;
      if (sort === "recent") return new Date(b.lastEnrichedAt).getTime() - new Date(a.lastEnrichedAt).getTime();
      return priorityRank[b.priority] - priorityRank[a.priority] || b.opportunityScore - a.opportunityScore;
    });
  }, [leads, priority, query, sort]);

  if (!leads.length) {
    return (
      <div className={`lead-table-shell ${compact ? "lead-table-shell--compact" : ""}`}>
        <EmptyState
          icon={Building2}
          eyebrow="Company library"
          title="No researched businesses yet"
          description="Businesses will appear here only after discovery results are resolved into verified, evidence-backed profiles."
          role="status"
        />
      </div>
    );
  }

  return (
    <div className={`lead-table-shell ${compact ? "lead-table-shell--compact" : ""}`}>
      {!compact ? (
        <div className="lead-toolbar">
          <label className="lead-search">
            <Search aria-hidden="true" size={17} />
            <span className="sr-only">Search companies</span>
            <input name="lead-query" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, industry, or neighborhood…" autoComplete="off" spellCheck={false} />
          </label>
          <div className="lead-toolbar__filters">
            <label>
              <Filter aria-hidden="true" size={16} />
              <span className="sr-only">Filter priority</span>
              <select name="lead-priority" value={priority} onChange={(event) => setPriority(event.target.value)}>
                <option value="all">All priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label>
              <ArrowUpDown aria-hidden="true" size={16} />
              <span className="sr-only">Sort leads</span>
              <select name="lead-sort" value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
                <option value="priority">Expected return on effort</option>
                <option value="content-fit">Que Media content fit</option>
                <option value="opportunity">Opportunity</option>
                <option value="response">Response likelihood</option>
                <option value="recent">Recently enriched</option>
              </select>
            </label>
          </div>
        </div>
      ) : null}

      {!compact ? <p className="sr-only" role="status" aria-live="polite">{visibleLeads.length} of {leads.length} businesses shown, sorted by {sort.replace("-", " ")}.</p> : null}

      <div className="lead-table-scroll" tabIndex={0} aria-label="Scrollable company opportunity table">
        <table className="lead-table">
          <caption className="sr-only">Ranked Ottawa-market business intelligence opportunities</caption>
          <thead>
            <tr>
              <th scope="col">Business</th>
              <th scope="col">Why now</th>
              <th scope="col">Content fit</th>
              <th scope="col">Opportunity</th>
              <th scope="col">Response</th>
              <th scope="col">Stage</th>
              <th scope="col"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody>
            {visibleLeads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <Link className="company-cell" href={`/companies/${lead.id}`}>
                    <BusinessLogo {...lead} tone={lead.thumbnailTone} />
                    <span><strong>{lead.name}</strong><small>{lead.industry} · {lead.neighborhood}</small></span>
                  </Link>
                </td>
                <td>
                  <div className="why-now-cell"><StatusBadge tone={priorityTone[lead.priority]}>{lead.priority}</StatusBadge><span>{lead.whyNow}</span></div>
                </td>
                <td><ScoreCell score={lead.contentFitScore} label="fit" /></td>
                <td><ScoreCell score={lead.opportunityScore} label="opportunity" /></td>
                <td><ScoreCell score={lead.responseLikelihood} label="response" /></td>
                <td><span className="stage-label">{stageLabel[lead.stage]}</span></td>
                <td><Link className="row-open" href={`/companies/${lead.id}`} aria-label={`Open ${lead.name}`}><ChevronRight aria-hidden="true" size={18} /></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!visibleLeads.length ? <div className="lead-table-empty">No businesses match these filters. Clear a filter to broaden the view.</div> : null}
      {!compact ? <div className="lead-table-foot"><span>Showing {visibleLeads.length} of {leads.length} researched businesses</span><span>Sorted by {sort.replace("-", " ")}</span></div> : null}
    </div>
  );
}

function ScoreCell({ score, label }: { score: number; label: string }) {
  return (
    <div className="table-score" aria-label={`${label}: ${score} out of 100`}>
      <strong>{score}</strong>
      <span><span style={{ width: `${score}%` }} /></span>
    </div>
  );
}
