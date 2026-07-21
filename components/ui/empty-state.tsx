import { SearchX, type LucideIcon } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";

export interface EmptyStateProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  secondaryAction?: ReactNode;
}

export function EmptyState({
  title,
  description,
  eyebrow,
  icon: Icon = SearchX,
  action,
  secondaryAction,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      {...props}
      className={["empty-state", className].filter(Boolean).join(" ")}
      data-has-action={action || secondaryAction ? "true" : undefined}
    >
      <span className="empty-state__icon-wrap" aria-hidden="true">
        <Icon className="empty-state__icon" size={24} />
      </span>
      {eyebrow ? <p className="empty-state__eyebrow">{eyebrow}</p> : null}
      <h2 className="empty-state__title">{title}</h2>
      {description ? (
        <p className="empty-state__description">{description}</p>
      ) : null}
      {action || secondaryAction ? (
        <div className="empty-state__actions">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
