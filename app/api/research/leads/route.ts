import { apiErrorResponse } from "@/lib/server/api-response";
import { authorizeRequest } from "@/lib/server/auth";
import {
  ingestResearchLead,
  validateResearchLeadInput,
} from "@/lib/server/research-ingestion";

export async function POST(request: Request) {
  try {
    const actor = authorizeRequest(request, "research:write");
    const value = await request.json();
    const validation = validateResearchLeadInput(value);
    if (!validation.valid || !validation.input) {
      return Response.json(
        {
          error: {
            code: "research_schema_invalid",
            message: "The research record did not pass schema validation.",
            issues: validation.issues,
          },
        },
        { status: 422 },
      );
    }
    const result = await ingestResearchLead(validation.input, actor);
    return Response.json(
      {
        data: {
          operation: result.operation,
          lead: result.lead,
          operations: result.state,
          duplicateSignals: result.duplicateSignals,
          warnings: result.warnings,
        },
      },
      { status: result.operation === "created" ? 201 : 200 },
    );
  } catch (error) {
    const response = apiErrorResponse(error);
    if (
      error instanceof Error &&
      error.name === "AmbiguousDuplicateError"
    ) {
      return Response.json(
        {
          error: {
            code: "ambiguous_duplicate",
            message: error.message,
          },
        },
        { status: 409 },
      );
    }
    return response;
  }
}
