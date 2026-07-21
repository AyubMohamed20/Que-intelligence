import {
  BadgeCheck,
  ExternalLink,
  Globe2,
  type LucideIcon,
} from "lucide-react";
import type {
  AnchorHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";

export interface SourceChipProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children"> {
  label: ReactNode;
  domain?: string;
  verified?: boolean;
  icon?: LucideIcon;
}

function sourceDomain(href?: string) {
  if (!href) {
    return undefined;
  }

  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export function SourceChip({
  label,
  domain,
  verified = false,
  icon: Icon = Globe2,
  href,
  target,
  rel,
  className,
  ...props
}: SourceChipProps) {
  const resolvedDomain = domain ?? sourceDomain(href);
  const classes = [
    "source-chip",
    href ? "source-chip--link" : "source-chip--static",
    verified ? "source-chip--verified" : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      <Icon className="source-chip__icon" size={14} aria-hidden="true" />
      <span className="source-chip__label">{label}</span>
      {resolvedDomain ? (
        <span className="source-chip__domain">{resolvedDomain}</span>
      ) : null}
      {verified ? (
        <BadgeCheck
          className="source-chip__verified"
          size={14}
          role="img"
          aria-label="Verified source"
        />
      ) : null}
      {href ? (
        <ExternalLink
          className="source-chip__external"
          size={13}
          aria-hidden="true"
        />
      ) : null}
    </>
  );

  if (href) {
    const safeRel = target === "_blank" ? rel ?? "noopener noreferrer" : rel;

    return (
      <a
        {...props}
        className={classes}
        href={href}
        target={target}
        rel={safeRel}
        data-verified={verified ? "true" : undefined}
      >
        {content}
      </a>
    );
  }

  const {
    download: _download,
    hrefLang: _hrefLang,
    media: _media,
    ping: _ping,
    referrerPolicy: _referrerPolicy,
    type: _type,
    ...spanProps
  } = props;

  return (
    <span
      {...(spanProps as HTMLAttributes<HTMLSpanElement>)}
      className={classes}
      data-verified={verified ? "true" : undefined}
    >
      {content}
    </span>
  );
}
