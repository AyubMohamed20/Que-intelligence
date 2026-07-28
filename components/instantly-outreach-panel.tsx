"use client";

import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  InstantlyOptions,
  OperatingLeadProfile,
  OutreachAction,
} from "@/lib/operating-types";
import { StatusBadge } from "@/components/ui";

type ApiError = { error?: { message?: string } };

function formatDateTime(value?: string) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function humanize(value: string) {
  return value.replaceAll("-", " ");
}

function actionTone(status: OutreachAction["status"]) {
  if (["sent", "delivered", "replied"].includes(status)) return "positive";
  if (["failed", "bounced", "cancelled"].includes(status)) return "critical";
  return "warning";
}

export function InstantlyOutreachPanel({
  lead,
  recipientEmail,
  subject,
  messageBody,
  evidenceIds,
}: {
  lead: OperatingLeadProfile;
  recipientEmail: string;
  subject: string;
  messageBody: string;
  evidenceIds: string[];
}) {
  const router = useRouter();
  const idempotencyKey = useRef<string>(crypto.randomUUID());
  const [options, setOptions] = useState<InstantlyOptions>();
  const [campaignId, setCampaignId] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const eligibleCampaigns = useMemo(
    () => options?.campaigns.filter((campaign) => campaign.eligible) ?? [],
    [options],
  );
  const selectedCampaign = eligibleCampaigns.find(
    (campaign) => campaign.id === campaignId,
  );

  const loadOptions = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/instantly/options", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: InstantlyOptions;
      } & ApiError;
      if (!response.ok || !payload.data) {
        throw new Error(
          payload.error?.message ?? "Instantly options could not be loaded.",
        );
      }
      setOptions(payload.data);
      const first = payload.data.campaigns.find(
        (campaign) => campaign.eligible,
      );
      setCampaignId((current) => current || first?.id || "");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Instantly options could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  };

  const beginReview = async () => {
    if (!options) await loadOptions();
    setReviewing(true);
    setConfirmed(false);
    setMessage("");
  };

  const submit = async () => {
    if (!selectedCampaign?.selectedSender || !confirmed) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/leads/${lead.id}/outreach`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey.current,
        },
        body: JSON.stringify({
          campaignId: selectedCampaign.id,
          senderAccount: selectedCampaign.selectedSender,
          recipientEmail,
          subject,
          messageBody,
          personalizationVariables: {
            business_name: lead.name,
            q_intelligence_lead_id: lead.id,
          },
          evidenceIds,
          confirmation: true,
        }),
      });
      const payload = (await response.json()) as {
        data?: OutreachAction;
      } & ApiError;
      if (!response.ok || !payload.data) {
        throw new Error(
          payload.error?.message ?? "Instantly submission failed.",
        );
      }
      setMessage(
        "Approved and queued in Instantly. It will count toward today’s goal only after Instantly reports email_sent.",
      );
      setReviewing(false);
      setConfirmed(false);
      idempotencyKey.current = crypto.randomUUID();
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Instantly submission failed.",
      );
    } finally {
      setLoading(false);
    }
  };

  const sync = async () => {
    setSyncing(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/instantly/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const payload = (await response.json()) as ApiError;
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Instantly refresh failed.");
      }
      setMessage("Instantly activity refreshed.");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Instantly refresh failed.",
      );
    } finally {
      setSyncing(false);
    }
  };

  const outreachReady =
    lead.operations.qualificationStatus === "qualified" &&
    ["verified", "usable"].includes(
      lead.operations.emailVerificationStatus,
    ) &&
    Boolean(recipientEmail) &&
    subject.trim().length > 0 &&
    messageBody.trim().length >= 40 &&
    evidenceIds.length > 0;

  return (
    <section className="instantly-panel surface" aria-labelledby="instantly-panel-title">
      <div className="surface-header">
        <div>
          <span className="meta-label">Human-approved delivery</span>
          <h2 id="instantly-panel-title">Send through Instantly</h2>
          <p>
            The final campaign, sender, recipient, subject, message, and evidence
            are reviewed together before submission.
          </p>
        </div>
        <button
          className="button button--secondary"
          type="button"
          onClick={sync}
          disabled={syncing}
        >
          <RefreshCw
            aria-hidden="true"
            className={syncing ? "is-spinning" : ""}
            size={16}
          />
          {syncing ? "Refreshing" : "Refresh activity"}
        </button>
      </div>

      {!outreachReady ? (
        <div className="integration-notice integration-notice--warning">
          <AlertTriangle aria-hidden="true" size={18} />
          <p>
            This lead needs qualified status, a verified or usable stored email,
            a complete message, and personalization evidence before it can be
            submitted.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="integration-notice integration-notice--error" role="alert">
          <AlertTriangle aria-hidden="true" size={18} />
          <p>{error}</p>
        </div>
      ) : null}
      {message ? (
        <div className="integration-notice integration-notice--success" role="status">
          <CheckCircle2 aria-hidden="true" size={18} />
          <p>{message}</p>
        </div>
      ) : null}

      {!reviewing ? (
        <div className="instantly-panel__start">
          <div>
            <ShieldCheck aria-hidden="true" size={20} />
            <p>
              No automatic send occurs. Opening the review does not contact the
              lead.
            </p>
          </div>
          <button
            className="button button--primary"
            type="button"
            onClick={beginReview}
            disabled={!outreachReady || loading}
          >
            {loading ? (
              <LoaderCircle aria-hidden="true" className="is-spinning" size={16} />
            ) : (
              <Send aria-hidden="true" size={16} />
            )}
            Review Instantly submission
          </button>
        </div>
      ) : (
        <div className="send-review">
          <div className="send-review__fields">
            <label className="field">
              <span>Instantly campaign</span>
              <select
                value={campaignId}
                onChange={(event) => {
                  setCampaignId(event.target.value);
                  setConfirmed(false);
                }}
              >
                <option value="">Choose an approved campaign</option>
                {eligibleCampaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="send-review__fact">
              <span>Sending account</span>
              <strong>
                {selectedCampaign?.selectedSender ??
                  "Choose an eligible campaign"}
              </strong>
              <small>
                Only approved, active, healthy accounts above the warmup
                threshold are eligible.
              </small>
            </div>
            <div className="send-review__fact">
              <span>Recipient</span>
              <strong>{recipientEmail}</strong>
              <small>
                {humanize(lead.operations.emailVerificationStatus)} ·{" "}
                {humanize(lead.operations.emailProvenance)}
              </small>
            </div>
          </div>
          {options && eligibleCampaigns.length === 0 ? (
            <div className="integration-notice integration-notice--warning">
              <AlertTriangle aria-hidden="true" size={18} />
              <p>
                No campaign is eligible. Check the server allowlists, campaign
                status, template variables, and sender health in Settings.
              </p>
            </div>
          ) : null}
          <dl className="send-review__message">
            <div>
              <dt>Subject</dt>
              <dd>{subject}</dd>
            </div>
            <div>
              <dt>Final message</dt>
              <dd>{messageBody}</dd>
            </div>
            <div>
              <dt>Research facts used</dt>
              <dd>
                {evidenceIds.length} evidence record
                {evidenceIds.length === 1 ? "" : "s"} attached
              </dd>
            </div>
          </dl>
          <label className="send-confirmation">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              I reviewed the sender, recipient, campaign, subject, body, and
              supporting research and approve this submission.
            </span>
          </label>
          <div className="send-review__actions">
            <button
              className="button button--secondary"
              type="button"
              onClick={() => {
                setReviewing(false);
                setConfirmed(false);
              }}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="button button--primary"
              type="button"
              onClick={submit}
              disabled={
                loading ||
                !confirmed ||
                !selectedCampaign?.selectedSender
              }
            >
              {loading ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="is-spinning"
                  size={16}
                />
              ) : (
                <Send aria-hidden="true" size={16} />
              )}
              Approve and add to Instantly
            </button>
          </div>
        </div>
      )}

      <div className="outreach-history">
        <div>
          <h3>Outreach history</h3>
          <p>
            Local submission, delivery, reply, and error records remain attached
            to this lead.
          </p>
        </div>
        {lead.outreachHistory.length ? (
          <ol>
            {lead.outreachHistory.slice(0, 8).map((action) => (
              <li key={action.id}>
                <div>
                  <StatusBadge tone={actionTone(action.status)}>
                    {humanize(action.status)}
                  </StatusBadge>
                  <time dateTime={action.createdAt}>
                    {formatDateTime(action.createdAt)}
                  </time>
                </div>
                <strong>{action.subject}</strong>
                <p>
                  {action.senderAccount} → {action.recipientEmail}
                </p>
                <small>
                  {action.instantlyCampaignName} · version{" "}
                  {action.messageVersion}
                </small>
                {action.latestResponse ? (
                  <blockquote>{action.latestResponse}</blockquote>
                ) : null}
                {action.errorMessage ? (
                  <p className="field-error">{action.errorMessage}</p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty-copy">No outreach has been submitted for this lead.</p>
        )}
      </div>
    </section>
  );
}
