"use client";

import {
  ArrowUpDown,
  Building2,
  CalendarDays,
  ChevronRight,
  Filter,
  Mail,
  MailQuestion,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  LifecycleStatus,
  OperatingLeadSummary,
} from "@/lib/operating-types";
import { BusinessLogo, EmptyState, StatusBadge } from "@/components/ui";

export type SavedLeadView =
  | "all"
  | "new-businesses"
  | "opening-soon"
  | "recently-opened"
  | "email-available"
  | "email-missing"
  | "high-priority"
  | "ready-for-outreach"
  | "contacted-today"
  | "not-yet-contacted"
  | "follow-up-due"
  | "replied"
  | "positive-reply"
  | "meeting-booked"
  | "disqualified";

type SortOption = "lead-score" | "recent" | "opening-date" | "last-contact";

const viewLabels: Record<SavedLeadView, string> = {
  all: "All leads",
  "new-businesses": "New businesses",
  "opening-soon": "Opening soon",
  "recently-opened": "Recently opened",
  "email-available": "Email available",
  "email-missing": "Email missing",
  "high-priority": "High-priority leads",
  "ready-for-outreach": "Ready for outreach",
  "contacted-today": "Contacted today",
  "not-yet-contacted": "Not yet contacted",
  "follow-up-due": "Follow-up due",
  replied: "Replied",
  "positive-reply": "Positive reply",
  "meeting-booked": "Meeting booked",
  disqualified: "Disqualified",
};

const lifecycleTone: Record<
  LifecycleStatus,
  "positive" | "warning" | "info" | "neutral" | "critical"
> = {
  researched: "neutral",
  qualified: "info",
  "ready-for-outreach": "positive",
  contacted: "info",
  "follow-up-due": "warning",
  replied: "info",
  interested: "positive",
  "meeting-booked": "positive",
  "not-interested": "neutral",
  "invalid-contact": "critical",
  disqualified: "neutral",
  closed: "neutral",
};

function localDate(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function displayDate(value?: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function matchesView(
  lead: OperatingLeadSummary,
  view: SavedLeadView,
  today: string,
) {
  if (view === "all") return true;
  if (view === "new-businesses") {
    return [
      "opening-soon",
      "recently-opened",
      "relocating",
      "rebranding",
      "expanding",
      "reopening",
      "renovating",
      "new-service",
    ].includes(lead.openingStatus);
  }
  if (view === "opening-soon") return lead.openingStatus === "opening-soon";
  if (view === "recently-opened") return lead.openingStatus === "recently-opened";
  if (view === "email-available") {
    return ["verified", "usable"].includes(lead.emailVerificationStatus);
  }
  if (view === "email-missing") {
    return ["unavailable", "invalid", "unverified"].includes(
      lead.emailVerificationStatus,
    );
  }
  if (view === "high-priority") return lead.leadQualityScore >= 80;
  if (view === "ready-for-outreach") {
    return lead.lifecycleStatus === "ready-for-outreach";
  }
  if (view === "contacted-today") return localDate(lead.lastContactAt) === today;
  if (view === "not-yet-contacted") return !lead.lastContactAt;
  if (view === "follow-up-due") {
    return (
      lead.lifecycleStatus === "follow-up-due" ||
      lead.followUpStatus === "due"
    );
  }
  if (view === "replied") return lead.replyStatus !== "none";
  if (view === "positive-reply") return lead.replyStatus === "positive";
  if (view === "meeting-booked") return lead.lifecycleStatus === "meeting-booked";
  if (view === "disqualified") return lead.qualificationStatus === "disqualified";
  return true;
}

export function LeadTable({
  leads,
  compact = false,
  initialView = "all",
}: {
  leads: OperatingLeadSummary[];
  compact?: boolean;
  initialView?: SavedLeadView;
}) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<SavedLeadView>(initialView);
  const [sort, setSort] = useState<SortOption>("lead-score");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const today = localDate(new Date().toISOString());

  const visibleLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = leads.filter((lead) => {
      if (normalizedQuery && !lead.searchableText.includes(normalizedQuery)) {
        return false;
      }
      if (!matchesView(lead, view, today)) return false;
      const addedDate = localDate(lead.addedAt);
      if (fromDate && addedDate < fromDate) return false;
      if (toDate && addedDate > toDate) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sort === "recent") {
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      }
      if (sort === "opening-date") {
        return (
          new Date(a.openingDate ?? "9999-12-31").getTime() -
          new Date(b.openingDate ?? "9999-12-31").getTime()
        );
      }
      if (sort === "last-contact") {
        return (
          new Date(b.lastContactAt ?? 0).getTime() -
          new Date(a.lastContactAt ?? 0).getTime()
        );
      }
      return (
        b.leadQualityScore - a.leadQualityScore ||
        b.opportunityScore - a.opportunityScore
      );
    });
  }, [fromDate, leads, query, sort, toDate, today, view]);

  if (!leads.length) {
    return (
      <div className={`lead-table-shell ${compact ? "lead-table-shell--compact" : ""}`}>
        <EmptyState
          icon={Building2}
          eyebrow="Lead operating system"
          title="No researched businesses yet"
          description="Businesses appear only after a structured, evidence-backed record passes validation."
          role="status"
        />
      </div>
    );
  }

  return (
    <div className={`lead-table-shell lead-table-shell--operating ${compact ? "lead-table-shell--compact" : ""}`}>
      {!compact ? (
        <div className="lead-toolbar lead-toolbar--operating">
          <label className="lead-search">
            <Search aria-hidden="true" size={17} />
            <span className="sr-only">Search leads</span>
            <input
              name="lead-query"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search business, category, location, contact, domain, or notes…"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <div className="lead-toolbar__filters">
            <label>
              <Filter aria-hidden="true" size={16} />
              <span className="sr-only">Saved view</span>
              <select
                name="lead-view"
                value={view}
                onChange={(event) => setView(event.target.value as SavedLeadView)}
              >
                {Object.entries(viewLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              <ArrowUpDown aria-hidden="true" size={16} />
              <span className="sr-only">Sort leads</span>
              <select
                name="lead-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
              >
                <option value="lead-score">Lead quality score</option>
                <option value="recent">Recently added</option>
                <option value="opening-date">Opening date</option>
                <option value="last-contact">Last contact</option>
              </select>
            </label>
          </div>
          <div className="lead-date-filter">
            <CalendarDays aria-hidden="true" size={16} />
            <label>
              <span>Added from</span>
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
            </label>
            <label>
              <span>to</span>
              <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
            </label>
          </div>
        </div>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite">
        {visibleLeads.length} of {leads.length} leads shown in {viewLabels[view]}.
      </p>

      <div className="lead-table-scroll" tabIndex={0} aria-label="Scrollable lead operating table">
        <table className="lead-table lead-table--operating">
          <caption className="sr-only">Q Intelligence lead lifecycle and outreach table</caption>
          <thead>
            <tr>
              <th scope="col">Business</th>
              <th scope="col">Opening</th>
              <th scope="col">Lead score</th>
              <th scope="col">Email</th>
              <th scope="col">Qualification</th>
              <th scope="col">Outreach</th>
              <th scope="col">Reply</th>
              <th scope="col">Next action</th>
              <th scope="col"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody>
            {visibleLeads.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <Link className="company-cell" href={`/companies/${lead.id}`}>
                    <BusinessLogo {...lead} tone={lead.thumbnailTone} />
                    <span>
                      <strong>{lead.name}</strong>
                      <small>{lead.industry} · {lead.neighborhood}</small>
                    </span>
                  </Link>
                </td>
                <td>
                  <span className="operating-cell">
                    <strong>{lead.openingStatus.replaceAll("-", " ")}</strong>
                    <small>{displayDate(lead.openingDate)}</small>
                  </span>
                </td>
                <td>
                  <div className="lead-quality-cell">
                    <strong>{lead.leadQualityScore}</strong>
                    <span>Grade {lead.leadQualityGrade}</span>
                  </div>
                </td>
                <td>
                  <span className="email-readiness">
                    {["verified", "usable"].includes(lead.emailVerificationStatus)
                      ? <Mail aria-hidden="true" size={15} />
                      : <MailQuestion aria-hidden="true" size={15} />}
                    <span>
                      <strong>{lead.emailVerificationStatus}</strong>
                      <small>{lead.primaryEmail ?? "No email available"}</small>
                    </span>
                  </span>
                </td>
                <td>
                  <StatusBadge tone={lead.qualificationStatus === "qualified" ? "positive" : lead.qualificationStatus === "disqualified" ? "neutral" : "warning"}>
                    {lead.qualificationStatus.replaceAll("-", " ")}
                  </StatusBadge>
                </td>
                <td>
                  <span className="operating-cell">
                    <StatusBadge tone={lifecycleTone[lead.lifecycleStatus]}>
                      {lead.lifecycleStatus.replaceAll("-", " ")}
                    </StatusBadge>
                    <small>{displayDate(lead.lastContactAt)}</small>
                  </span>
                </td>
                <td>
                  <span className="operating-cell">
                    <strong>{lead.replyStatus.replaceAll("-", " ")}</strong>
                    <small>{displayDate(lead.lastReplyAt)}</small>
                  </span>
                </td>
                <td>
                  <span className="next-action-cell">{lead.nextAction}</span>
                </td>
                <td>
                  <Link className="row-open" href={`/companies/${lead.id}`} aria-label={`Open ${lead.name}`}>
                    <ChevronRight aria-hidden="true" size={18} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!visibleLeads.length ? (
        <div className="lead-table-empty">
          No leads match this saved view and date range.
        </div>
      ) : null}
      {!compact ? (
        <div className="lead-table-foot">
          <span>Showing {visibleLeads.length} of {leads.length} leads</span>
          <span>{viewLabels[view]} · sorted by {sort.replaceAll("-", " ")}</span>
        </div>
      ) : null}
    </div>
  );
}
