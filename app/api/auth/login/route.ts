import { createSessionCookie } from "@/lib/server/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    token?: string;
    actorId?: string;
  };
  if (!body.token || !body.actorId) {
    return Response.json(
      {
        error: {
          code: "credentials_required",
          message: "Workspace token and actor id are required.",
        },
      },
      { status: 400 },
    );
  }
  const cookie = createSessionCookie(body.token, body.actorId);
  if (!cookie) {
    return Response.json(
      {
        error: {
          code: "invalid_credentials",
          message: "Workspace sign-in failed.",
        },
      },
      { status: 401 },
    );
  }
  return Response.json(
    { data: { authenticated: true } },
    { headers: { "Set-Cookie": cookie } },
  );
}
