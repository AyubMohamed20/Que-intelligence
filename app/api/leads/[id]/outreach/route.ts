import type { OutreachSubmission } from "@/lib/operating-types";
import { apiErrorResponse } from "@/lib/server/api-response";
import { authorizeRequest } from "@/lib/server/auth";
import { getOperatingLeadProfile } from "@/lib/server/lead-repository";
import { submitOutreach } from "@/lib/server/outreach-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    authorizeRequest(request, "lead:read");
    const { id } = await params;
    const lead = await getOperatingLeadProfile(id);
    if (!lead) {
      return Response.json(
        { error: { code: "lead_not_found", message: "Lead not found." } },
        { status: 404 },
      );
    }
    return Response.json({ data: lead.outreachHistory });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = authorizeRequest(request, "outreach:send");
    const { id } = await params;
    const submission = (await request.json()) as OutreachSubmission;
    const idempotencyKey = request.headers.get("idempotency-key") ?? "";
    const result = await submitOutreach(
      id,
      submission,
      actor,
      idempotencyKey,
    );
    return Response.json(
      { data: result.action, meta: { replayed: result.replayed } },
      { status: result.replayed ? 200 : 202 },
    );
  } catch (error) {
    return apiErrorResponse(error);
  }
}
