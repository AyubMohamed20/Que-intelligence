import { getLeadProfile, getLeadSummary } from "@/lib/runtime-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const summary = getLeadSummary(id);
  const profile = getLeadProfile(id);

  if (!summary) {
    return Response.json(
      {
        error: "Lead not found",
        meta: {
          asOf: new Date().toISOString(),
          dataState: "empty",
          outreachCapability: "manual-preparation-only",
        },
      },
      { status: 404 },
    );
  }

  return Response.json({
    data: profile ?? summary,
    meta: {
      asOf: new Date().toISOString(),
      dataState: "verified-snapshot",
      profileStatus: profile ? "complete" : "research-in-progress",
      outreachCapability: "manual-preparation-only",
    },
  });
}
