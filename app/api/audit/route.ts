import { apiErrorResponse } from "@/lib/server/api-response";
import { authorizeRequest } from "@/lib/server/auth";
import { listAuditLog } from "@/lib/server/lead-repository";

export async function GET(request: Request) {
  try {
    authorizeRequest(request, "audit:read");
    const requested = Number(new URL(request.url).searchParams.get("limit") ?? 100);
    return Response.json({ data: await listAuditLog(requested) });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
