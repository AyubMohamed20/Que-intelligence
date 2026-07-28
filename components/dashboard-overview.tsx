import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  CircleDot,
  Clock3,
  MailCheck,
  MessageSquareReply,
  Send,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import type {
  DailyOutreachDashboard,
  OperatingLeadSummary,
} from "@/lib/operating-types";
import { BusinessLogo, StatusBadge } from "@/components/ui";

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function dateTime(value?: string) {
  if (!value) return "Not contacted";
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function DashboardOverview({
  dashboard,
  leads,
}: {
  dashboard: DailyOutreachDashboard;
  leads: OperatingLeadSummary[];
}) {
  const progress = Math.min(
    100,
    Math.round(
      (dashboard.newBusinessesContactedToday / dashboard.target) * 100,
    ),
  );
  const readyLeads = leads
    .filter(
      (lead) =>
        lead.lifecycleStatus === "ready-for-outreach" &&
        ["verified", "usable"].includes(lead.emailVerificationStatus),
    )
    .sort(
      (a, b) =>
        b.leadQualityScore - a.leadQualityScore ||
        b.opportunityScore - a.opportunityScore,
    )
    .slice(0, 5);
  const maxDaily = Math.max(
    dashboard.target,
    ...dashboard.performance.map((point) => point.contacted),
  );

  const metrics = [
    {
      label: "Qualified today",
      value: dashboard.qualifiedAddedToday,
      helper: "Research gate passed",
      icon: CheckCircle2,
      tone: "blue",
    },
    {
      label: "Email-ready today",
      value: dashboard.emailReadyQualifiedToday,
      helper: "Verified or usable",
      icon: MailCheck,
      tone: "green",
    },
    {
      label: "Contacted today",
      value: dashboard.newBusinessesContactedToday,
      helper: "Instantly sent event confirmed",
      icon: Send,
      tone: "violet",
    },
    {
      label: "Remaining",
      value: dashboard.remainingToTarget,
      helper: `To reach ${dashboard.target}`,
      icon: Target,
      tone: dashboard.targetAchieved ? "green" : "amber",
    },
    {
      label: "Follow-ups",
      value: dashboard.followUpsCompletedToday,
      helper: "Completed today",
      icon: Clock3,
      tone: "blue",
    },
    {
      label: "Replies",
      value: dashboard.repliesReceivedToday,
      helper: `${dashboard.positiveRepliesToday} positive`,
      icon: MessageSquareReply,
      tone: "violet",
    },
    {
      label: "Meetings",
      value: dashboard.meetingsBookedToday,
      helper: "Booked today",
      icon: CalendarCheck2,
      tone: "green",
    },
    {
      label: "Sending errors",
      value: dashboard.sendingErrorsToday,
      helper: "Needs review",
      icon: AlertTriangle,
      tone: dashboard.sendingErrorsToday ? "red" : "neutral",
    },
  ];

  return (
    <div className="daily-dashboard">
      <section className="daily-goal-card" aria-labelledby="daily-goal-title">
        <div className="daily-goal-card__copy">
          <div className="daily-goal-card__eyebrow">
            <Target aria-hidden="true" size={18} />
            <span>Daily personalized outreach target</span>
          </div>
          <h2 id="daily-goal-title">
            {dashboard.targetAchieved
              ? "Today’s target is complete."
              : `${dashboard.remainingToTarget} more new business${dashboard.remainingToTarget === 1 ? "" : "es"} to contact.`}
          </h2>
          <p>
            Only the first confirmed <code>email_sent</code> event for a
            qualified lead with a usable email counts. Research records and
            queued campaign additions do not inflate this number.
          </p>
          <div
            className="daily-goal-progress"
            role="progressbar"
            aria-label="Daily outreach progress"
            aria-valuemin={0}
            aria-valuemax={dashboard.target}
            aria-valuenow={dashboard.newBusinessesContactedToday}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="daily-goal-card__footer">
            <strong>
              {dashboard.newBusinessesContactedToday} / {dashboard.target}
            </strong>
            <span>{progress}% complete · {dashboard.timezone}</span>
          </div>
        </div>
        <div className="daily-goal-card__actions">
          <div>
            <span>Ready queue</span>
            <strong>{dashboard.readyQueueCount}</strong>
            <small>qualified + email-ready</small>
          </div>
          <div>
            <span>Follow-up due</span>
            <strong>{dashboard.followUpDueCount}</strong>
            <small>requires a next action</small>
          </div>
          <Link className="button button--primary" href="/outreach">
            Open outreach queue <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </section>

      <section className="daily-metric-grid" aria-label="Today’s operating metrics">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className={`daily-metric daily-metric--${metric.tone}`} key={metric.label}>
              <span className="daily-metric__icon">
                <Icon aria-hidden="true" size={17} />
              </span>
              <div>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.helper}</small>
              </div>
            </article>
          );
        })}
      </section>

      <div className="daily-dashboard-grid">
        <section className="surface daily-performance" aria-labelledby="daily-performance-title">
          <div className="surface-header">
            <div>
              <h2 id="daily-performance-title">Outreach performance by day</h2>
              <p>Confirmed new-business sends across the last 14 local dates.</p>
            </div>
            <StatusBadge tone="info">Target {dashboard.target}</StatusBadge>
          </div>
          <div className="daily-bars" role="img" aria-label="Fourteen-day confirmed outreach chart">
            {dashboard.performance.map((point) => (
              <div className="daily-bar" key={point.date}>
                <div>
                  <span
                    style={{
                      height: `${Math.max(3, (point.contacted / maxDaily) * 100)}%`,
                    }}
                  />
                  <i
                    style={{
                      bottom: `${(dashboard.target / maxDaily) * 100}%`,
                    }}
                  />
                </div>
                <strong>{point.contacted}</strong>
                <small>{shortDate(point.date)}</small>
              </div>
            ))}
          </div>
          <div className="daily-performance__legend">
            <span><CircleDot aria-hidden="true" size={13} /> Confirmed sends</span>
            <span><Target aria-hidden="true" size={13} /> Daily target</span>
          </div>
        </section>

        <section className="surface daily-funnel" aria-labelledby="daily-funnel-title">
          <div className="surface-header">
            <div>
              <h2 id="daily-funnel-title">Today’s acquisition funnel</h2>
              <p>Research and contact remain separate milestones.</p>
            </div>
          </div>
          <ol>
            <li>
              <span>01</span>
              <div><strong>{dashboard.qualifiedAddedToday}</strong><small>qualified leads added</small></div>
            </li>
            <li>
              <span>02</span>
              <div><strong>{dashboard.emailReadyQualifiedToday}</strong><small>qualified and email-ready</small></div>
            </li>
            <li>
              <span>03</span>
              <div><strong>{dashboard.newBusinessesContactedToday}</strong><small>confirmed new contacts</small></div>
            </li>
            <li>
              <span>04</span>
              <div><strong>{dashboard.repliesReceivedToday}</strong><small>replies received</small></div>
            </li>
          </ol>
        </section>
      </div>

      <section className="surface ready-queue" aria-labelledby="ready-queue-title">
        <div className="surface-header">
          <div>
            <h2 id="ready-queue-title">Next qualified businesses</h2>
            <p>Highest transparent lead-quality scores among email-ready, uncontacted records.</p>
          </div>
          <Link className="text-button" href="/companies">
            View all leads <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </div>
        {readyLeads.length ? (
          <ol>
            {readyLeads.map((lead, index) => (
              <li key={lead.id}>
                <span className="ready-queue__rank">{index + 1}</span>
                <BusinessLogo {...lead} tone={lead.thumbnailTone} />
                <Link href={`/companies/${lead.id}`}>
                  <strong>{lead.name}</strong>
                  <small>{lead.industry} · {lead.neighborhood}</small>
                </Link>
                <div>
                  <span>Lead score</span>
                  <strong>{lead.leadQualityScore}</strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong>{lead.emailVerificationStatus}</strong>
                </div>
                <div>
                  <span>Last contact</span>
                  <strong>{dateTime(lead.lastContactAt)}</strong>
                </div>
                <Link className="row-open" href={`/companies/${lead.id}`} aria-label={`Open ${lead.name}`}>
                  <ArrowRight aria-hidden="true" size={17} />
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="ready-queue__empty">
            <Users aria-hidden="true" size={20} />
            <p>No uncontacted qualified leads with usable email are ready.</p>
            <Link className="text-button" href="/discover">Start a research cycle</Link>
          </div>
        )}
      </section>
    </div>
  );
}
