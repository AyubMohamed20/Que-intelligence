import { apiErrorResponse } from "@/lib/server/api-response";
import { authorizeRequest } from "@/lib/server/auth";
import { getInstantlyOptions } from "@/lib/server/instantly";

export async function GET(request: Request) {
  try {
    authorizeRequest(request, "outreach:send");
    return Response.json({ data: await getInstantlyOptions() });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
