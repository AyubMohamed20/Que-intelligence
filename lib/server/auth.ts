import "server-only";

import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import type { ActorType } from "@/lib/operating-types";

export type WorkspaceRole = "admin" | "sender" | "researcher" | "viewer" | "agent";
export type Permission =
  | "lead:read"
  | "lead:update"
  | "research:write"
  | "outreach:send"
  | "integration:manage"
  | "audit:read";

export interface WorkspaceActor {
  id: string;
  name: string;
  role: WorkspaceRole;
  actorType: ActorType;
  authentication: "session" | "bearer" | "local-development";
}

const permissions: Record<WorkspaceRole, Set<Permission>> = {
  admin: new Set([
    "lead:read",
    "lead:update",
    "research:write",
    "outreach:send",
    "integration:manage",
    "audit:read",
  ]),
  sender: new Set(["lead:read", "lead:update", "outreach:send"]),
  researcher: new Set(["lead:read", "lead:update", "research:write"]),
  viewer: new Set(["lead:read"]),
  agent: new Set(["lead:read", "research:write"]),
};

const sessionCookie = "qmi_session";

export class AuthorizationError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 401, code = "unauthorized") {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
    this.code = code;
  }
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function sessionSecret() {
  return process.env.Q_INTELLIGENCE_SESSION_SECRET?.trim();
}

function sign(value: string) {
  const secret = sessionSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function parseCookies(header: string | null) {
  const values = new Map<string, string>();
  for (const pair of (header ?? "").split(";")) {
    const [rawKey, ...rawValue] = pair.trim().split("=");
    if (!rawKey) continue;
    values.set(rawKey, decodeURIComponent(rawValue.join("=")));
  }
  return values;
}

function decodeSession(token: string | undefined): WorkspaceActor | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !sessionSecret()) return null;
  const expected = sign(payload);
  if (!safeEqual(signature, expected)) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as {
      id: string;
      name: string;
      role: WorkspaceRole;
      expiresAt: number;
    };
    if (
      !parsed.id ||
      !parsed.name ||
      !permissions[parsed.role] ||
      parsed.expiresAt <= Date.now()
    ) {
      return null;
    }
    return {
      id: parsed.id,
      name: parsed.name,
      role: parsed.role,
      actorType: "human",
      authentication: "session",
    };
  } catch {
    return null;
  }
}

function checkSameOrigin(request: Request) {
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if (!origin) return;
  const requestUrl = new URL(request.url);
  const originUrl = new URL(origin);
  if (originUrl.host !== requestUrl.host) {
    throw new AuthorizationError(
      "Cross-origin write requests are not permitted.",
      403,
      "csrf_rejected",
    );
  }
}

function bearerActor(request: Request): WorkspaceActor | null {
  const configured = process.env.Q_INTELLIGENCE_INTERNAL_API_TOKEN?.trim();
  const authorization = request.headers.get("authorization");
  if (!configured || !authorization?.startsWith("Bearer ")) return null;
  const supplied = authorization.slice("Bearer ".length).trim();
  if (!safeEqual(supplied, configured)) return null;
  const requestedActor =
    request.headers.get("x-q-intelligence-actor-id")?.trim() || "approved-agent";
  const actorId = requestedActor.replace(/[^a-zA-Z0-9_.:@-]/g, "").slice(0, 100);
  const requestedType = request.headers
    .get("x-q-intelligence-actor-type")
    ?.trim()
    .toLowerCase();
  const actorType: ActorType =
    requestedType === "codex"
      ? "codex"
      : requestedType === "claude-code"
        ? "claude-code"
        : "research-agent";
  return {
    id: actorId || "approved-agent",
    name: actorId || "Approved research agent",
    role: "agent",
    actorType,
    authentication: "bearer",
  };
}

function localDevelopmentActor(request: Request): WorkspaceActor | null {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.Q_INTELLIGENCE_AUTH_MODE === "required"
  ) {
    return null;
  }
  const hostname = new URL(request.url).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) return null;
  return {
    id: "local-admin",
    name: "Local development admin",
    role: "admin",
    actorType: "human",
    authentication: "local-development",
  };
}

export function authorizeRequest(
  request: Request,
  permission: Permission,
): WorkspaceActor {
  const bearer = bearerActor(request);
  const session = decodeSession(
    parseCookies(request.headers.get("cookie")).get(sessionCookie),
  );
  const actor = bearer ?? session ?? localDevelopmentActor(request);
  if (!actor) {
    throw new AuthorizationError(
      process.env.NODE_ENV === "production" && !sessionSecret()
        ? "Workspace authentication is not configured. Writes are disabled."
        : "Sign in to continue.",
      process.env.NODE_ENV === "production" && !sessionSecret() ? 503 : 401,
      process.env.NODE_ENV === "production" && !sessionSecret()
        ? "security_not_configured"
        : "unauthorized",
    );
  }
  if (!permissions[actor.role].has(permission)) {
    throw new AuthorizationError(
      `The ${actor.role} role cannot perform this action.`,
      403,
      "forbidden",
    );
  }
  if (actor.authentication === "session") checkSameOrigin(request);
  return actor;
}

function configuredLogin(
  suppliedToken: string,
): { role: WorkspaceRole; name: string } | null {
  const candidates: Array<{
    value: string | undefined;
    role: WorkspaceRole;
    name: string;
  }> = [
    {
      value: process.env.Q_INTELLIGENCE_ADMIN_TOKEN,
      role: "admin",
      name: "Q Intelligence administrator",
    },
    {
      value: process.env.Q_INTELLIGENCE_SENDER_TOKEN,
      role: "sender",
      name: "Q Media outreach operator",
    },
    {
      value: process.env.Q_INTELLIGENCE_RESEARCHER_TOKEN,
      role: "researcher",
      name: "Q Media researcher",
    },
    {
      value: process.env.Q_INTELLIGENCE_VIEWER_TOKEN,
      role: "viewer",
      name: "Q Intelligence viewer",
    },
  ];
  for (const candidate of candidates) {
    const value = candidate.value?.trim();
    if (value && safeEqual(value, suppliedToken)) {
      return { role: candidate.role, name: candidate.name };
    }
  }
  return null;
}

export function createSessionCookie(
  suppliedToken: string,
  actorId: string,
): string | null {
  const login = configuredLogin(suppliedToken);
  if (!login || !sessionSecret()) return null;
  const payload = Buffer.from(
    JSON.stringify({
      id: actorId.replace(/[^a-zA-Z0-9_.:@-]/g, "").slice(0, 100) || login.role,
      name: login.name,
      role: login.role,
      expiresAt: Date.now() + 12 * 60 * 60 * 1000,
    }),
  ).toString("base64url");
  return [
    `${sessionCookie}=${encodeURIComponent(`${payload}.${sign(payload)}`)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Strict",
    "Max-Age=43200",
    process.env.NODE_ENV === "production" ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearSessionCookie() {
  return `${sessionCookie}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

export function authorizationErrorResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  return null;
}
