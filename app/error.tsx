"use client";

import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui";

export default function ErrorState({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="surface route-state" role="alert" aria-labelledby="route-error-title">
      <h1 className="sr-only" id="route-error-title">Intelligence view interrupted</h1>
      <EmptyState
        icon={AlertTriangle}
        eyebrow="Workspace interrupted"
        title="This intelligence view could not finish loading."
        description={
          error.digest
            ? `The research data remains unchanged. Reference ${error.digest} if the issue continues.`
            : "The research data remains unchanged. Try the view again or return to the briefing."
        }
        action={
          <button className="button button--primary" type="button" onClick={reset}>
            <RefreshCw aria-hidden="true" size={16} /> Try again
          </button>
        }
        secondaryAction={
          <Link className="button button--secondary" href="/">
            <Home aria-hidden="true" size={16} /> Return to briefing
          </Link>
        }
      />
    </section>
  );
}
