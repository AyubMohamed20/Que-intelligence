import { listOperatingLeadSummaries } from "@/lib/server/lead-repository";

export async function GET() {
  const leadSummaries = await listOperatingLeadSummaries();
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
