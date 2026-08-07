import type { LeadStatusUpdate } from "@/lib/operating-types";
import { apiErrorResponse } from "@/lib/server/api-response";
import { authorizeRequest } from "@/lib/server/auth";
import {
  getOperatingLeadProfile,
  updateLeadStatus,
} from "@/lib/server/lead-repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const profile = await getOperatingLeadProfile(id);

  if (!profile) {
    return Response.json(
      {
        error: { code: "lead_not_found", message: "Lead not found" },
        meta: {
          asOf: new Date().toISOString(),
          dataState: "empty",
          outreachCapability: "human-approved-instantly",
        },
      },
      { status: 404 },
    );
  }

  return Response.json({
    data: profile,
    meta: {
      asOf: new Date().toISOString(),
      dataState: "operational-system-of-record",
      profileStatus: "complete",
      outreachCapability: "human-approved-instantly",
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = authorizeRequest(request, "lead:update");
    const { id } = await params;
    const body = (await request.json()) as LeadStatusUpdate;
    if (!body.reason?.trim()) {
      return Response.json(
        {
          error: {
            code: "reason_required",
            message: "A reason is required for every manual lead update.",
          },
        },
        { status: 400 },
      );
    }
    const lead = await updateLeadStatus(id, body, actor);
    if (!lead) {
      return Response.json(
        { error: { code: "lead_not_found", message: "Lead not found." } },
        { status: 404 },
      );
    }
    return Response.json({ data: lead });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
