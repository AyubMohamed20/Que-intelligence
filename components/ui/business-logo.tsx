"use client";

import { useEffect, useState } from "react";
import type { BusinessLogoSurface } from "@/lib/business-logo-data";

export interface BusinessLogoProps {
  name: string;
  initials: string;
  logoPath?: string;
  logoSurface?: BusinessLogoSurface;
  tone?: string;
  className?: string;
}

export function BusinessLogo({
  name,
  initials,
  logoPath,
  logoSurface = "light",
  tone = "steel",
  className = "",
}: BusinessLogoProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [logoPath]);

  const hasLogo = Boolean(logoPath) && !failed;
  const classes = [
    "company-avatar",
    hasLogo ? "company-avatar--logo" : `company-avatar--${tone}`,
    hasLogo ? `company-avatar--logo-${logoSurface}` : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <span className={classes} aria-hidden="true" title={name}>
      {hasLogo ? (
        <img
          src={logoPath}
          alt=""
          width={64}
          height={64}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : initials}
    </span>
  );
}
