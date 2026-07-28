const baseUrl = (
  process.env.QUE_MEDIA_BASE_URL || "http://localhost:3001"
).replace(/\/$/, "");
const adminToken = process.env.QMI_TEST_ADMIN_TOKEN;
const timeoutMs = 30_000;

if (!adminToken) {
  throw new Error(
    "Set QMI_TEST_ADMIN_TOKEN to the same temporary value used by Q_INTELLIGENCE_ADMIN_TOKEN on the test server.",
  );
}

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    signal: AbortSignal.timeout(timeoutMs),
    ...options,
  });
}

const failures = [];
const login = await request("/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    actorId: "runtime-verifier",
    token: adminToken,
  }),
});
const setCookie = login.headers.get("set-cookie") ?? "";
const cookie = setCookie.split(";")[0];
if (login.status !== 200 || !cookie.startsWith("qmi_session=")) {
  throw new Error(
    `Workspace login failed with HTTP ${login.status}. Verify the test server auth environment.`,
  );
}

const authHeaders = {
  cookie,
  origin: baseUrl,
};

const dashboard = await request("/api/dashboard");
const dashboardPayload = await dashboard.json().catch(() => null);
if (
  dashboard.status !== 200 ||
  dashboardPayload?.data?.target !== 10 ||
  dashboardPayload?.data?.newBusinessesContactedToday !== 0 ||
  dashboardPayload?.data?.remainingToTarget !== 10
) {
  failures.push({
    check: "dashboard",
    status: dashboard.status,
    issue: "A clean operational store must start at 0/10 confirmed sends.",
  });
}

const options = await request("/api/instantly/options", {
  headers: authHeaders,
});
const optionsText = await options.text();
const optionsPayload = JSON.parse(optionsText);
const forbiddenOptionKey = (() => {
  const pending = [optionsPayload];
  while (pending.length) {
    const value = pending.pop();
    if (!value || typeof value !== "object") continue;
    for (const [key, child] of Object.entries(value)) {
      if (/^(?:apiKey|api_key|authorization|bearerToken|secret)$/i.test(key)) {
        return key;
      }
      pending.push(child);
    }
  }
  return "";
})();
if (
  options.status !== 200 ||
  optionsPayload?.data?.connectionState !== "not-configured" ||
  forbiddenOptionKey
) {
  failures.push({
    check: "instantly-safe-options",
    status: options.status,
    issue:
      "Missing Instantly configuration should be safe and must expose no credential-shaped fields.",
  });
}

const batchResponse = await request("/api/research/batches", {
  method: "POST",
  headers: authHeaders,
});
const batchPayload = await batchResponse.json().catch(() => null);
const batchId = batchPayload?.data?.id;
if (
  batchResponse.status !== 201 ||
  !batchId ||
  batchPayload.data.emailReadyQualifiedCount !== 0
) {
  failures.push({
    check: "research-batch-start",
    status: batchResponse.status,
    issue: "A new batch should start active at zero email-ready leads.",
  });
}

if (batchId) {
  const complete = await request(
    `/api/research/batches/${encodeURIComponent(batchId)}/complete`,
    {
      method: "POST",
      headers: authHeaders,
    },
  );
  const completePayload = await complete.json().catch(() => null);
  if (
    complete.status !== 409 ||
    completePayload?.error?.code !== "email_ready_target_not_met" ||
    completePayload?.data?.remainingEmailReady !== 10
  ) {
    failures.push({
      check: "research-batch-gate",
      status: complete.status,
      issue: "A batch below 10 email-ready qualified leads must be blocked.",
    });
  }
}

const invalidResearch = await request("/api/research/leads", {
  method: "POST",
  headers: {
    ...authHeaders,
    "content-type": "application/json",
  },
  body: "{}",
});
const invalidResearchPayload = await invalidResearch.json().catch(() => null);
if (
  invalidResearch.status !== 422 ||
  invalidResearchPayload?.error?.code !== "research_schema_invalid" ||
  !Array.isArray(invalidResearchPayload?.error?.issues)
) {
  failures.push({
    check: "research-schema",
    status: invalidResearch.status,
    issue: "Invalid agent input must return structured field issues.",
  });
}

const leads = await request("/api/leads");
const leadsPayload = await leads.json();
const emailReadyLead = leadsPayload.data.find((lead) => lead.primaryEmail);
if (!emailReadyLead) {
  failures.push({
    check: "seed-data",
    issue: "No email-ready seed lead was available for safeguards.",
  });
} else {
  const missingReason = await request(`/api/leads/${emailReadyLead.id}`, {
    method: "PATCH",
    headers: {
      ...authHeaders,
      "content-type": "application/json",
    },
    body: "{}",
  });
  if (missingReason.status !== 400) {
    failures.push({
      check: "manual-override-reason",
      status: missingReason.status,
      issue: "Lead overrides without a reason must be blocked.",
    });
  }

  const shortIdempotency = await request(
    `/api/leads/${emailReadyLead.id}/outreach`,
    {
      method: "POST",
      headers: {
        ...authHeaders,
        "content-type": "application/json",
        "idempotency-key": "short",
      },
      body: JSON.stringify({ confirmation: true }),
    },
  );
  const shortPayload = await shortIdempotency.json().catch(() => null);
  if (
    shortIdempotency.status !== 400 ||
    shortPayload?.error?.code !== "idempotency_key_required"
  ) {
    failures.push({
      check: "outreach-idempotency",
      status: shortIdempotency.status,
      issue: "Outreach without a stable idempotency key must be blocked.",
    });
  }
}

const webhook = await request("/api/instantly/webhook", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});
if (webhook.status !== 401) {
  failures.push({
    check: "webhook-auth",
    status: webhook.status,
    issue: "A webhook without the configured shared header must be rejected.",
  });
}

const audit = await request("/api/audit?limit=20", {
  headers: authHeaders,
});
const auditPayload = await audit.json().catch(() => null);
if (audit.status !== 200 || !Array.isArray(auditPayload?.data)) {
  failures.push({
    check: "audit-log",
    status: audit.status,
    issue: "The authorized audit endpoint should return persisted entries.",
  });
}

console.log(
  JSON.stringify({
    baseUrl,
    checks: 9,
    failureCount: failures.length,
    failures,
  }),
);
if (failures.length) process.exitCode = 1;
