import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export type ScoreRingTone =
  | "accent"
  | "positive"
  | "warning"
  | "critical"
  | "neutral";

export interface ScoreRingProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  value: number;
  max?: number;
  label?: string;
  detail?: string;
  size?: number;
  strokeWidth?: number;
  tone?: ScoreRingTone;
  formatValue?: (value: number, max: number) => ReactNode;
}

export function ScoreRing({
  value,
  max = 100,
  label = "Score",
  detail,
  size = 112,
  strokeWidth = 8,
  tone = "accent",
  formatValue,
  className,
  style,
  "aria-label": ariaLabel,
  ...props
}: ScoreRingProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? value : 0;
  const clampedValue = Math.min(Math.max(safeValue, 0), safeMax);
  const progress = (clampedValue / safeMax) * 100;
  const radius = 50 - strokeWidth / 2;
  const displayValue = formatValue
    ? formatValue(safeValue, safeMax)
    : Math.round(safeValue).toLocaleString();
  const accessibleLabel =
    ariaLabel ?? `${label}: ${Math.round(safeValue)} out of ${safeMax}`;
  const ringStyle = {
    ...style,
    "--score-ring-size": `${size}px`,
  } as CSSProperties;

  return (
    <div
      {...props}
      className={[
        "score-ring",
        `score-ring--${tone}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={ringStyle}
      role="meter"
      aria-label={accessibleLabel}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={clampedValue}
      data-tone={tone}
      data-score={safeValue}
    >
      <svg
        className="score-ring__graphic"
        width={size}
        height={size}
        viewBox="0 0 100 100"
        aria-hidden="true"
        focusable="false"
      >
        <circle
          className="score-ring__track"
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
        />
        <circle
          className="score-ring__value"
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${progress} ${100 - progress}`}
          transform="rotate(-90 50 50)"
        />
      </svg>

      <span className="score-ring__content" aria-hidden="true">
        <span className="score-ring__number">{displayValue}</span>
        <span className="score-ring__label">{label}</span>
        {detail ? <span className="score-ring__detail">{detail}</span> : null}
      </span>
    </div>
  );
}
