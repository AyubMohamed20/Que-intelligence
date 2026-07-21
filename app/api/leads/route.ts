import { leadSummaries } from "@/lib/runtime-data";

export function GET() {
  return Response.json({
    data: leadSummaries,
    meta: {
      count: leadSummaries.length,
      asOf: new Date().toISOString(),
      dataState: leadSummaries.length ? "verified-snapshot" : "empty",
      outreachCapability: "manual-preparation-only",
    },
  });
}
