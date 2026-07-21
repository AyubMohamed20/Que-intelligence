import { FileSearch, type LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface EvidenceButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label?: ReactNode;
  count?: number;
  icon?: LucideIcon;
  size?: "default" | "compact";
}

export function EvidenceButton({
  label = "View evidence",
  count,
  icon: Icon = FileSearch,
  size = "default",
  className,
  type = "button",
  "aria-label": ariaLabel,
  ...props
}: EvidenceButtonProps) {
  const safeCount = Number.isFinite(count) ? Math.max(0, count ?? 0) : undefined;
  const countText = safeCount === 1 ? "1 source" : `${safeCount} sources`;
  const accessibleLabel =
    ariaLabel ??
    (typeof label === "string" && safeCount !== undefined
      ? `${label}, ${countText}`
      : typeof label === "string"
        ? label
        : undefined);

  return (
    <button
      {...props}
      type={type}
      className={[
        "evidence-button",
        `evidence-button--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={accessibleLabel}
      data-count={safeCount}
    >
      <Icon className="evidence-button__icon" size={16} aria-hidden="true" />
      <span className="evidence-button__label">{label}</span>
      {safeCount !== undefined ? (
        <span className="evidence-button__count" aria-hidden="true">
          {safeCount}
        </span>
      ) : null}
    </button>
  );
}
