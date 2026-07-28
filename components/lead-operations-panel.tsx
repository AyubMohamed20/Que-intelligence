"use client";

import { LoaderCircle, Save, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type {
  FollowUpStatus,
  LifecycleStatus,
  OperatingLeadProfile,
  QualificationStatus,
} from "@/lib/operating-types";

const lifecycleStatuses: LifecycleStatus[] = [
  "researched",
  "qualified",
  "ready-for-outreach",
  "contacted",
  "follow-up-due",
  "replied",
  "interested",
  "meeting-booked",
  "not-interested",
  "invalid-contact",
  "disqualified",
  "closed",
];

const qualificationStatuses: QualificationStatus[] = [
  "pending-review",
  "qualified",
  "disqualified",
];

const followUpStatuses: FollowUpStatus[] = [
  "not-required",
  "scheduled",
  "due",
  "completed",
  "paused",
];

function humanize(value: string) {
  return value.replaceAll("-", " ");
}

export function LeadOperationsPanel({
  lead,
}: {
  lead: OperatingLeadProfile;
}) {
  const router = useRouter();
  const [lifecycleStatus, setLifecycleStatus] = useState(
    lead.operations.lifecycleStatus,
  );
  const [qualificationStatus, setQualificationStatus] = useState(
    lead.operations.qualificationStatus,
  );
  const [followUpStatus, setFollowUpStatus] = useState(
    lead.operations.followUpStatus,
  );
  const [nextAction, setNextAction] = useState(lead.operations.nextAction);
  const [nextActionDueAt, setNextActionDueAt] = useState(
    lead.operations.nextActionDueAt?.slice(0, 16) ?? "",
  );
  const [internalNotes, setInternalNotes] = useState(
    lead.operations.internalNotes,
  );
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lifecycleStatus,
          qualificationStatus,
          followUpStatus,
          nextAction,
          nextActionDueAt: nextActionDueAt
            ? new Date(nextActionDueAt).toISOString()
            : null,
          internalNotes,
          reason,
        }),
      });
      const payload = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Lead update failed.");
      }
      setReason("");
      setMessage("Lead workflow updated and recorded in the audit log.");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Lead update failed.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="lead-operations-panel surface" aria-labelledby="lead-operations-title">
      <div className="surface-header">
        <div>
          <span className="meta-label">Operating record</span>
          <h2 id="lead-operations-title">Lifecycle and next action</h2>
          <p>Every manual change requires a reason and creates an audit entry.</p>
        </div>
        <ShieldCheck aria-hidden="true" size={20} />
      </div>
      <div className="lead-operations-panel__fields">
        <label className="field">
          <span>Lifecycle</span>
          <select
            value={lifecycleStatus}
            onChange={(event) =>
              setLifecycleStatus(event.target.value as LifecycleStatus)
            }
          >
            {lifecycleStatuses.map((status) => (
              <option value={status} key={status}>
                {humanize(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Qualification</span>
          <select
            value={qualificationStatus}
            onChange={(event) =>
              setQualificationStatus(
                event.target.value as QualificationStatus,
              )
            }
          >
            {qualificationStatuses.map((status) => (
              <option value={status} key={status}>
                {humanize(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Follow-up</span>
          <select
            value={followUpStatus}
            onChange={(event) =>
              setFollowUpStatus(event.target.value as FollowUpStatus)
            }
          >
            {followUpStatuses.map((status) => (
              <option value={status} key={status}>
                {humanize(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Next action due</span>
          <input
            type="datetime-local"
            value={nextActionDueAt}
            onChange={(event) => setNextActionDueAt(event.target.value)}
          />
        </label>
        <label className="field field--wide">
          <span>Next action</span>
          <input
            value={nextAction}
            onChange={(event) => setNextAction(event.target.value)}
            maxLength={500}
          />
        </label>
        <label className="field field--wide">
          <span>Internal notes</span>
          <textarea
            value={internalNotes}
            onChange={(event) => setInternalNotes(event.target.value)}
            maxLength={5000}
          />
        </label>
        <label className="field field--wide">
          <span>Reason for this change</span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Required for the audit trail"
            maxLength={500}
          />
        </label>
      </div>
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      {message ? <p className="field-success" role="status">{message}</p> : null}
      <div className="lead-operations-panel__actions">
        <button
          className="button button--primary"
          type="button"
          onClick={save}
          disabled={saving || !reason.trim()}
        >
          {saving ? (
            <LoaderCircle aria-hidden="true" className="is-spinning" size={16} />
          ) : (
            <Save aria-hidden="true" size={16} />
          )}
          Save operating record
        </button>
      </div>
    </section>
  );
}
