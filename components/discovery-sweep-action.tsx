import { Cable } from "lucide-react";
import Link from "next/link";

export function DiscoverySweepAction() {
  return (
    <div className="discovery-sweep-action">
      <Link className="button button--primary" href="/sources" aria-describedby="discovery-sweep-status">
        <Cable aria-hidden="true" size={16} /> Configure sources
      </Link>
      <span id="discovery-sweep-status" className="discovery-sweep-status">
        Discovery requires at least one authorized research source.
      </span>
    </div>
  );
}
