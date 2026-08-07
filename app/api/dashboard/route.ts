import { getDailyDashboard } from "@/lib/server/lead-repository";

export async function GET() {
  return Response.json({
    data: await getDailyDashboard(),
    meta: { asOf: new Date().toISOString() },
  });
}
