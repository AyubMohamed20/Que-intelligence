"use client";

import { CheckCircle2, Clock3, ExternalLink, FileSearch, ShieldCheck, X } from "lucide-react";
import { useId, useMemo, useRef } from "react";
import type { Evidence, Source } from "@/lib/types";
import { EvidenceButton, StatusBadge } from "@/components/ui";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getAccessibleSourceUrl(source: Source) {
  if (!source.accessible) return null;

  try {
    const url = new URL(source.url);
    if (!(url.protocol === "http:" || url.protocol === "https:")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function EvidenceDrawer({
  evidenceIds,
  evidence,
  sources,
  label = "View evidence",
  title = "Evidence behind this insight",
  compact = false,
}: {
  evidenceIds: string[];
  evidence: Evidence[];
  sources: Source[];
  label?: string;
  title?: string;
  compact?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const observationsId = `${titleId}-observations`;
  const sourcesId = `${titleId}-sources`;
  const selectedEvidence = useMemo(
    () => evidence.filter((item) => evidenceIds.includes(item.id)),
    [evidence, evidenceIds],
  );
  const selectedSourceIds = new Set(selectedEvidence.flatMap((item) => item.sourceIds));
  const selectedSources = sources.filter((source) => selectedSourceIds.has(source.id));

  return (
    <>
      <EvidenceButton
        label={label}
        count={selectedSources.length}
        size={compact ? "compact" : "default"}
        onClick={() => dialogRef.current?.showModal()}
      />
      <dialog ref={dialogRef} className="evidence-drawer" aria-labelledby={titleId}>
        <div className="evidence-drawer__header">
          <div>
            <span className="evidence-drawer__icon" aria-hidden="true"><FileSearch size={19} /></span>
            <div>
              <h2 id={titleId}>{title}</h2>
              <p>{selectedEvidence.length} observations from {selectedSources.length} sources</p>
            </div>
          </div>
          <button className="icon-button" type="button" onClick={() => dialogRef.current?.close()} aria-label="Close evidence">
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <div className="evidence-drawer__body">
          <div className="evidence-standard">
            <ShieldCheck aria-hidden="true" size={20} />
            <div>
              <strong>Evidence standard</strong>
              <p>Claims remain separate from observations. Dates, access level, confidence, and contradictions stay visible.</p>
            </div>
          </div>

          <section aria-labelledby={observationsId}>
            <div className="evidence-section-heading">
              <h3 id={observationsId}>Supporting observations</h3>
              <span>Newest first</span>
            </div>
            <div className="evidence-list">
              {selectedEvidence.map((item) => (
                <article className="evidence-item" key={item.id}>
                  <div className="evidence-item__meta">
                    <StatusBadge tone={item.confidence === "high" ? "positive" : item.confidence === "medium" ? "warning" : "neutral"}>
                      {item.confidence} confidence
                    </StatusBadge>
                    <span><Clock3 aria-hidden="true" size={14} />{item.freshnessLabel}</span>
                  </div>
                  <h4>{item.claim}</h4>
                  <p>{item.detail}</p>
                  <div className="evidence-item__sources">
                    {item.sourceIds.map((sourceId) => {
                      const source = sources.find((entry) => entry.id === sourceId);
                      if (!source) return null;
                      const sourceUrl = getAccessibleSourceUrl(source);
                      return sourceUrl ? (
                        <a key={source.id} href={sourceUrl} target="_blank" rel="noreferrer">
                          <ExternalLink aria-hidden="true" size={12} />
                          {source.label}
                        </a>
                      ) : (
                        <span key={source.id}>{source.label} (unavailable)</span>
                      );
                    })}
                  </div>
                  <div className="evidence-item__foot">
                    <span><CheckCircle2 aria-hidden="true" size={14} />Observed {formatDate(item.observedAt)}</span>
                    <div>{item.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby={sourcesId}>
            <div className="evidence-section-heading">
              <h3 id={sourcesId}>Source record</h3>
              <span>{selectedSources.length} linked</span>
            </div>
            <div className="source-records">
              {selectedSources.map((source) => {
                const sourceUrl = getAccessibleSourceUrl(source);
                return (
                  <div className="source-record" key={source.id}>
                    <div>
                      {sourceUrl ? (
                        <a className="source-record__link" href={sourceUrl} target="_blank" rel="noreferrer">
                          <strong>{source.label}</strong>
                        </a>
                      ) : (
                        <strong>{source.label}</strong>
                      )}
                      <span>{source.publisher} · Captured {formatDate(source.capturedAt)}</span>
                    </div>
                    <StatusBadge tone={sourceUrl ? "positive" : "warning"}>
                      {sourceUrl ? "Accessible" : "Unavailable"}
                    </StatusBadge>
                    {sourceUrl ? (
                      <a href={sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open ${source.label}`}>
                        <ExternalLink aria-hidden="true" size={16} />
                      </a>
                    ) : (
                      <span className="source-record__unavailable" aria-label={`${source.label} is unavailable`}>
                        <span aria-hidden="true">·</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </dialog>
    </>
  );
}
