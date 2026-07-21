import {
  CheckCircle2,
  CircleDot,
  Clock3,
  Info,
  Sparkles,
  TriangleAlert,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

export type StatusBadgeTone =
  | "positive"
  | "warning"
  | "critical"
  | "info"
  | "accent"
  | "pending"
  | "neutral";

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: StatusBadgeTone;
  icon?: LucideIcon;
  showIcon?: boolean;
}

const toneIcons: Record<StatusBadgeTone, LucideIcon> = {
  positive: CheckCircle2,
  warning: TriangleAlert,
  critical: XCircle,
  info: Info,
  accent: Sparkles,
  pending: Clock3,
  neutral: CircleDot,
};

export function StatusBadge({
  children,
  tone = "neutral",
  icon: IconOverride,
  showIcon = true,
  className,
  ...props
}: StatusBadgeProps) {
  const Icon = IconOverride ?? toneIcons[tone];

  return (
    <span
      {...props}
      className={["status-badge", `status-badge--${tone}`, className]
        .filter(Boolean)
        .join(" ")}
      data-tone={tone}
    >
      {showIcon ? (
        <Icon className="status-badge__icon" size={14} aria-hidden="true" />
      ) : null}
      <span className="status-badge__label">{children}</span>
    </span>
  );
}
