import { apiErrorResponse } from "@/lib/server/api-response";
import { authorizeRequest } from "@/lib/server/auth";
import { completeResearchBatch } from "@/lib/server/lead-repository";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = authorizeRequest(request, "research:write");
    const { id } = await params;
    const result = completeResearchBatch(id, actor);
    if (result.status === "not-found") {
      return Response.json(
        {
          error: {
            code: "batch_not_found",
            message: "Research batch not found.",
          },
        },
        { status: 404 },
      );
    }
    if (result.status === "blocked") {
      return Response.json(
        {
          error: {
            code: "email_ready_target_not_met",
            message: `${result.batch.remainingEmailReady} more qualified lead${result.batch.remainingEmailReady === 1 ? "" : "s"} with usable email must be found before this cycle can complete.`,
          },
          data: result.batch,
        },
        { status: 409 },
      );
    }
    return Response.json({ data: result.batch });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
