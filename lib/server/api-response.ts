import "server-only";

import { authorizationErrorResponse } from "@/lib/server/auth";
import { InstantlyApiError } from "@/lib/server/instantly";
import { OutreachSubmissionError } from "@/lib/server/outreach-service";

export function apiErrorResponse(error: unknown) {
  const authorization = authorizationErrorResponse(error);
  if (authorization) return authorization;
  if (error instanceof OutreachSubmissionError) {
    return Response.json(
      {
        error: { code: error.code, message: error.message },
        action: error.action,
      },
      { status: error.status },
    );
  }
  if (error instanceof InstantlyApiError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  if (error instanceof SyntaxError) {
    return Response.json(
      {
        error: {
          code: "invalid_json",
          message: "Request body must be valid JSON.",
        },
      },
      { status: 400 },
    );
  }
  return Response.json(
    {
      error: {
        code: "request_failed",
        message:
          error instanceof Error ? error.message : "The request failed.",
      },
    },
    { status: 400 },
  );
}
