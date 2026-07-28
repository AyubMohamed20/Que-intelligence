import { apiErrorResponse } from "@/lib/server/api-response";
import { authorizeRequest } from "@/lib/server/auth";
import {
  getResearchBatch,
  startResearchBatch,
} from "@/lib/server/lead-repository";

export async function GET(request: Request) {
  try {
    authorizeRequest(request, "lead:read");
    const id = new URL(request.url).searchParams.get("id");
    if (!id) {
      return Response.json(
        {
          error: {
            code: "batch_id_required",
            message: "Provide a research batch id.",
          },
        },
        { status: 400 },
      );
    }
    const batch = getResearchBatch(id);
    if (!batch) {
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
    return Response.json({ data: batch });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = authorizeRequest(request, "research:write");
    return Response.json({ data: startResearchBatch(actor) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
