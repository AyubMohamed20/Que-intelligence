"use client";

import {
  ArrowRight,
  CheckCircle2,
  Clipboard,
  MailCheck,
  Play,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ResearchBatch } from "@/lib/operating-types";
import { StatusBadge } from "@/components/ui";

export function ResearchCyclePanel({
  initialBatch,
}: {
  initialBatch?: ResearchBatch;
}) {
  const [batch, setBatch] = useState(initialBatch);
  const [state, setState] = useState<"idle" | "working" | "error" | "copied">("idle");
  const [message, setMessage] = useState("");

  async function startCycle() {
    setState("working");
    setMessage("");
    try {
      const response = await fetch("/api/research/batches", {
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: ResearchBatch;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error?.message || "Could not start the research cycle.");
      }
      setBatch(payload.data);
      setState("idle");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not start the research cycle.");
      setState("error");
    }
  }

  async function completeCycle() {
    if (!batch) return;
    setState("working");
    setMessage("");
    try {
      const response = await fetch(`/api/research/batches/${batch.id}/complete`, {
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: ResearchBatch;
        error?: { message?: string };
      };
      if (!response.ok) {
        setMessage(payload.error?.message || "The cycle cannot be completed yet.");
        const refresh = await fetch(`/api/research/batches?id=${encodeURIComponent(batch.id)}`);
        const refreshed = (await refresh.json()) as { data?: ResearchBatch };
        if (refreshed.data) setBatch(refreshed.data);
        setState("error");
        return;
      }
      if (payload.data) setBatch(payload.data);
      setState("idle");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete the cycle.");
      setState("error");
    }
  }

  async function copyBatchId() {
    if (!batch) return;
    try {
      await navigator.clipboard.writeText(batch.id);
      setState("copied");
      window.setTimeout(() => setState("idle"), 1400);
    } catch {
      setMessage("Copy was unavailable. Select the batch id manually.");
      setState("error");
    }
  }

  const active = batch?.status === "active";
  const progress = batch
    ? Math.min(
        100,
        Math.round(
          (batch.emailReadyQualifiedCount / batch.targetEmailReady) * 100,
        ),
      )
    : 0;

  return (
    <section className="surface research-cycle" aria-labelledby="research-cycle-title">
      <div className="research-cycle__intro">
        <span className="research-cycle__icon"><MailCheck aria-hidden="true" size={20} /></span>
        <div>
          <span className="meta-label">Enforced research gate</span>
          <h2 id="research-cycle-title">10 qualified, email-ready leads per cycle</h2>
          <p>
            Add every strong commercial opportunity. The cycle closes only when
            at least 10 newly added qualified records have a verified or usable
            business email.
          </p>
        </div>
      </div>

      {batch ? (
        <div className="research-cycle__status">
          <div className="research-cycle__status-header">
            <div>
              <StatusBadge tone={active ? "info" : batch.status === "complete" ? "positive" : "warning"}>
                {batch.status}
              </StatusBadge>
              <strong>{batch.emailReadyQualifiedCount} / {batch.targetEmailReady} email-ready</strong>
            </div>
            <button className="text-button" type="button" onClick={copyBatchId}>
              <Clipboard aria-hidden="true" size={14} />
              {state === "copied" ? "Copied" : "Copy batch id"}
            </button>
          </div>
          <code>{batch.id}</code>
          <div
            className="research-cycle__progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={batch.targetEmailReady}
            aria-valuenow={batch.emailReadyQualifiedCount}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
          <dl>
            <div><dt>Total added</dt><dd>{batch.totalAdded}</dd></div>
            <div><dt>Qualified</dt><dd>{batch.qualifiedCount}</dd></div>
            <div><dt>Email-ready</dt><dd>{batch.emailReadyQualifiedCount}</dd></div>
            <div><dt>Still required</dt><dd>{batch.remainingEmailReady}</dd></div>
          </dl>
          {active ? (
            <button className="button button--secondary" type="button" onClick={completeCycle} disabled={state === "working"}>
              <CheckCircle2 aria-hidden="true" size={16} />
              {state === "working" ? "Checking…" : "Complete cycle"}
            </button>
          ) : (
            <button className="button button--secondary" type="button" onClick={startCycle} disabled={state === "working"}>
              <Play aria-hidden="true" size={16} /> Start next cycle
            </button>
          )}
        </div>
      ) : (
        <div className="research-cycle__empty">
          <ShieldAlert aria-hidden="true" size={19} />
          <div>
            <strong>No research cycle has been started.</strong>
            <p>Start one before an agent submits a daily batch.</p>
          </div>
          <button className="button button--primary" type="button" onClick={startCycle} disabled={state === "working"}>
            <Play aria-hidden="true" size={16} />
            {state === "working" ? "Starting…" : "Start research cycle"}
          </button>
        </div>
      )}

      <div className="research-cycle__footer">
        <span>Agent records enter through <code>POST /api/research/leads</code>.</span>
        <Link className="text-button" href="/docs/research">
          Open research guidelines <ArrowRight aria-hidden="true" size={14} />
        </Link>
      </div>
      <p className={state === "error" ? "form-status form-status--error" : "sr-only"} role="status" aria-live="polite">
        {message}
      </p>
    </section>
  );
}
