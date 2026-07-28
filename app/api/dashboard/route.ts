import { getDailyDashboard } from "@/lib/server/lead-repository";

export function GET() {
  return Response.json({
    data: getDailyDashboard(),
    meta: { asOf: new Date().toISOString() },
  });
}
