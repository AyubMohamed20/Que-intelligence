import { Building2, Home, Search } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <section className="surface route-state" aria-labelledby="not-found-title">
      <h1 className="sr-only" id="not-found-title">Intelligence record not found</h1>
      <EmptyState
        icon={Search}
        eyebrow="Intelligence not found"
        title="This record is outside the current research universe."
        description="The link may be outdated, or this business may not have entered the qualified Ottawa workspace yet. No research data was changed."
        action={
          <Link className="button button--primary" href="/companies">
            <Building2 aria-hidden="true" size={16} /> Browse companies
          </Link>
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
