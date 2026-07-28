import { listOperatingLeadSummaries } from "@/lib/server/lead-repository";

export function GET() {
  const leadSummaries = listOperatingLeadSummaries();
  return Response.json({
    data: leadSummaries,
    meta: {
      count: leadSummaries.length,
      asOf: new Date().toISOString(),
      dataState: leadSummaries.length ? "operational-system-of-record" : "empty",
      outreachCapability: "human-approved-instantly",
    },
  });
}
