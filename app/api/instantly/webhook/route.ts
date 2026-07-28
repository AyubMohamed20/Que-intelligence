import { timingSafeEqual } from "node:crypto";
import { apiErrorResponse } from "@/lib/server/api-response";
import {
  processInstantlyWebhook,
  type InstantlyWebhookPayload,
} from "@/lib/server/instantly-sync";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export async function POST(request: Request) {
  try {
    const configured = process.env.INSTANTLY_WEBHOOK_SECRET?.trim();
    const supplied = request.headers
      .get("x-q-intelligence-webhook-secret")
      ?.trim();
    if (!configured || !supplied || !safeEqual(configured, supplied)) {
      return Response.json(
        {
          error: {
            code: "webhook_unauthorized",
            message: "Webhook authentication failed.",
          },
        },
        { status: 401 },
      );
    }
    const payload = (await request.json()) as InstantlyWebhookPayload;
    return Response.json({
      data: processInstantlyWebhook(payload),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
