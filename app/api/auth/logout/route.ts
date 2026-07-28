import { clearSessionCookie } from "@/lib/server/auth";

export function POST() {
  return Response.json(
    { data: { authenticated: false } },
    { headers: { "Set-Cookie": clearSessionCookie() } },
  );
}
