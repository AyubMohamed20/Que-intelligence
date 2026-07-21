import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div className="page-heading__copy">
        {eyebrow ? <p className="page-heading__eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="page-heading__description">{description}</p> : null}
      </div>
      {actions ? <div className="page-heading__actions">{actions}</div> : null}
    </header>
  );
}
