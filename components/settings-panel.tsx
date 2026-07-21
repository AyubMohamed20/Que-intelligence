"use client";

import { CheckCircle2, LockKeyhole, Save, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge } from "@/components/ui";

const initialWeights = {
  "Que Media fit": 28,
  Opportunity: 22,
  Timing: 20,
  Reachability: 12,
  "Evidence confidence": 12,
  "Effort penalty": 6,
};

const initialSettings = {
  evidence: true,
  contradictions: true,
  lowConfidence: true,
  publicContext: true,
  weeklyDigest: true,
  signalAlerts: true,
};

const sessionStorageKey = "que-media-intelligence-settings";

export function SettingsPanel() {
  const [weights, setWeights] = useState(initialWeights);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [settings, setSettings] = useState(initialSettings);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const total = useMemo(() => Object.values(weights).reduce((sum, value) => sum + value, 0), [weights]);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(sessionStorageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { weights?: typeof initialWeights; settings?: typeof initialSettings };
      if (parsed.weights && Object.values(parsed.weights).every((value) => typeof value === "number")) {
        setWeights({ ...initialWeights, ...parsed.weights });
      }
      if (parsed.settings && Object.values(parsed.settings).every((value) => typeof value === "boolean")) {
        setSettings({ ...initialSettings, ...parsed.settings });
      }
    } catch {
      // Storage can be unavailable in strict privacy modes. Defaults remain active.
    }
  }, []);

  const updateWeight = (key: keyof typeof weights, value: number) => {
    setWeights((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setSaveError(false);
  };

  const toggle = (key: keyof typeof settings) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
    setSaved(false);
    setSaveError(false);
  };

  const save = () => {
    setSaved(false);
    setSaveError(false);
    try {
      window.sessionStorage.setItem(sessionStorageKey, JSON.stringify({ weights, settings }));
    } catch {
      setSaveError(true);
      return;
    }
    setSaved(true);
  };

  return (
    <div className="settings-layout">
      {saved ? <div className="inline-notice" role="status"><CheckCircle2 aria-hidden="true" size={18} /><span>Local preferences saved for this browser session.</span><button type="button" onClick={() => { setSaved(false); window.requestAnimationFrame(() => saveButtonRef.current?.focus()); }}>Dismiss</button></div> : null}
      {saveError ? <p className="field-error" role="alert">Session storage is unavailable. These settings remain in the current view only.</p> : null}

      <section className="settings-section surface" aria-labelledby="priority-model-title">
        <div className="surface-header">
          <div><h2 id="priority-model-title">Priority model preferences</h2><p>Define the weighting Que Media intends to use when a research worker is connected.</p></div>
          <StatusBadge tone={total === 100 ? "positive" : "warning"}>{total}% allocated</StatusBadge>
        </div>
        <div className="settings-section__body weight-settings">
          {Object.entries(weights).map(([label, value]) => (
            <label className="weight-control" key={label}>
              <span><strong>{label}</strong><small>{label === "Effort penalty" ? "Reduces priority when research or access cost is high." : "Contribution to the priority equation."}</small></span>
              <input
                name={`weight-${label.toLowerCase().replaceAll(" ", "-")}`}
                type="range"
                min="0"
                max="40"
                step="1"
                value={value}
                onChange={(event) => updateWeight(label as keyof typeof weights, Number(event.target.value))}
                aria-valuetext={`${value} percent`}
              />
              <output>{value}%</output>
            </label>
          ))}
          {total !== 100 ? <p className="field-error" role="alert">Weights must total 100% before the model can be saved.</p> : null}
        </div>
      </section>

      <section className="settings-section surface" aria-labelledby="research-guardrails-title">
        <div className="surface-header">
          <div><h2 id="research-guardrails-title">Research guardrail preferences</h2><p>Save the evidence rules intended for a future research worker.</p></div>
          <ShieldCheck aria-hidden="true" size={20} className="section-icon" />
        </div>
        <div className="settings-section__body toggle-list">
          <ToggleRow label="Expose supporting evidence" detail="Every score, pain point, and recommendation keeps its source trail." checked={settings.evidence} onChange={() => toggle("evidence")} />
          <ToggleRow label="Preserve contradictions" detail="Conflicting source values stay visible until a person resolves them." checked={settings.contradictions} onChange={() => toggle("contradictions")} />
          <ToggleRow label="Hold low-confidence claims" detail="Anything below the evidence threshold cannot enter a report or outreach draft." checked={settings.lowConfidence} onChange={() => toggle("lowConfidence")} />
          <ToggleRow label="Allow professional public context" detail="Decision-maker context is limited to public, professionally relevant information." checked={settings.publicContext} onChange={() => toggle("publicContext")} />
        </div>
      </section>

      <section className="settings-section surface" aria-labelledby="notifications-title">
        <div className="surface-header"><div><h2 id="notifications-title">Notification preferences</h2><p>Choose which notifications should be enabled after a notification service is connected.</p></div></div>
        <div className="settings-section__body toggle-list">
          <ToggleRow label="Weekly opportunity briefing" detail="One ranked summary every Monday morning." checked={settings.weeklyDigest} onChange={() => toggle("weeklyDigest")} />
          <ToggleRow label="Strong Why Now signals" detail="Notify only when a high-fit company receives a strong, time-bounded trigger." checked={settings.signalAlerts} onChange={() => toggle("signalAlerts")} />
        </div>
      </section>

      <section className="settings-section outreach-boundary surface" aria-labelledby="outreach-boundary-title">
        <div className="outreach-boundary__icon" aria-hidden="true"><LockKeyhole size={22} /></div>
        <div>
          <span className="meta-label">Capability boundary</span>
          <h2 id="outreach-boundary-title">Outreach stays manual</h2>
          <p>This workspace can research, recommend, draft, and copy. It has no email provider, social posting token, sequence engine, or send action.</p>
        </div>
        <StatusBadge tone="positive">Enforced</StatusBadge>
      </section>

      <div className="settings-savebar">
        <div><SlidersHorizontal aria-hidden="true" size={18} /><span>Preferences stay in this browser session. No research or notification worker is connected.</span></div>
        <button ref={saveButtonRef} className="button button--primary" type="button" onClick={save} disabled={total !== 100}>
          <Save aria-hidden="true" size={16} /> Save local preferences
        </button>
      </div>
    </div>
  );
}

function ToggleRow({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="toggle-row">
      <span><strong>{label}</strong><small>{detail}</small></span>
      <input name={`setting-${label.toLowerCase().replaceAll(" ", "-")}`} type="checkbox" checked={checked} onChange={onChange} />
      <span className="toggle" aria-hidden="true"><span /></span>
    </label>
  );
}
