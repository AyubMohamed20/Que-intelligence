import { apiErrorResponse } from "@/lib/server/api-response";
import { authorizeRequest } from "@/lib/server/auth";
import { pollInstantlyActivity } from "@/lib/server/instantly-sync";

export async function POST(request: Request) {
  try {
    const actor = authorizeRequest(request, "outreach:send");
    const body = (await request.json().catch(() => ({}))) as {
      leadId?: string;
    };
    return Response.json({
      data: await pollInstantlyActivity(actor, body.leadId),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
