"use client";

import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { InstantlyOptions } from "@/lib/operating-types";
import { StatusBadge } from "@/components/ui";

function humanize(value: string) {
  return value.replaceAll("-", " ");
}

export function InstantlySettings() {
  const [options, setOptions] = useState<InstantlyOptions>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/instantly/options", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        data?: InstantlyOptions;
        error?: { message?: string };
      };
      if (!response.ok || !payload.data) {
        throw new Error(
          payload.error?.message ?? "Instantly status could not be loaded.",
        );
      }
      setOptions(payload.data);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Instantly status could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const eligibleAccounts =
    options?.accounts.filter((account) => account.eligible).length ?? 0;
  const eligibleCampaigns =
    options?.campaigns.filter((campaign) => campaign.eligible).length ?? 0;

  return (
    <section className="settings-section instantly-settings surface" aria-labelledby="instantly-settings-title">
      <div className="surface-header">
        <div>
          <span className="meta-label">Server-side integration</span>
          <h2 id="instantly-settings-title">Instantly connection</h2>
          <p>
            This screen exposes eligibility metadata only. The API key is never
            returned to the browser.
          </p>
        </div>
        <button
          className="button button--secondary"
          type="button"
          onClick={load}
          disabled={loading}
        >
          {loading ? (
            <LoaderCircle aria-hidden="true" className="is-spinning" size={16} />
          ) : (
            <RefreshCw aria-hidden="true" size={16} />
          )}
          Check connection
        </button>
      </div>

      {error ? (
        <div className="integration-notice integration-notice--error" role="alert">
          <AlertTriangle aria-hidden="true" size={18} />
          <p>{error}</p>
        </div>
      ) : null}

      {options ? (
        <>
          <div className="integration-status-grid">
            <article>
              <KeyRound aria-hidden="true" size={19} />
              <span>Connection</span>
              <strong>{humanize(options.connectionState)}</strong>
              <StatusBadge
                tone={
                  options.connectionState === "connected"
                    ? "positive"
                    : "warning"
                }
              >
                {options.configured ? "Server configured" : "Action required"}
              </StatusBadge>
            </article>
            <article>
              <ShieldCheck aria-hidden="true" size={19} />
              <span>Eligible senders</span>
              <strong>{eligibleAccounts}</strong>
              <small>{options.accounts.length} visible from Instantly</small>
            </article>
            <article>
              <CheckCircle2 aria-hidden="true" size={19} />
              <span>Eligible campaigns</span>
              <strong>{eligibleCampaigns}</strong>
              <small>{options.campaigns.length} visible from Instantly</small>
            </article>
            <article>
              <RefreshCw aria-hidden="true" size={19} />
              <span>Reply sync</span>
              <strong>
                {options.webhookConfigured ? "Webhook ready" : "Polling only"}
              </strong>
              <small>
                Checked{" "}
                {new Intl.DateTimeFormat("en-CA", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(options.lastCheckedAt))}
              </small>
            </article>
          </div>

          {options.message ? (
            <div className="integration-notice integration-notice--warning">
              <AlertTriangle aria-hidden="true" size={18} />
              <p>{options.message}</p>
            </div>
          ) : null}

          <div className="integration-lists">
            <div>
              <h3>Approved sending accounts</h3>
              {options.accounts.length ? (
                <ul>
                  {options.accounts.map((account) => (
                    <li key={account.email}>
                      <div>
                        <strong>{account.email}</strong>
                        <small>
                          {account.statusLabel} · warmup{" "}
                          {account.warmupScore ?? "not reported"}
                        </small>
                      </div>
                      <StatusBadge tone={account.eligible ? "positive" : "warning"}>
                        {account.eligible ? "Eligible" : "Blocked"}
                      </StatusBadge>
                      {!account.eligible ? (
                        <p>{account.eligibilityReasons.join(" ")}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No accounts are available.</p>
              )}
            </div>
            <div>
              <h3>Approved campaigns</h3>
              {options.campaigns.length ? (
                <ul>
                  {options.campaigns.map((campaign) => (
                    <li key={campaign.id}>
                      <div>
                        <strong>{campaign.name}</strong>
                        <small>
                          {campaign.statusLabel} · sender{" "}
                          {campaign.selectedSender ?? "not resolved"}
                        </small>
                      </div>
                      <StatusBadge tone={campaign.eligible ? "positive" : "warning"}>
                        {campaign.eligible ? "Eligible" : "Blocked"}
                      </StatusBadge>
                      {!campaign.eligible ? (
                        <p>{campaign.eligibilityReasons.join(" ")}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No campaigns are available.</p>
              )}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
