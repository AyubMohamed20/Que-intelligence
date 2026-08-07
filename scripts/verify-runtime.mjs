const baseUrl = (process.env.QUE_MEDIA_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const timeoutMs = 60_000;

const renderErrorPatterns = [
  /RangeError:\s*Invalid time value/i,
  /data-nextjs-error/i,
  /id=["']__next_error__["']/i,
  /Application error:\s*a client-side exception/i,
  /(?:RangeError|ReferenceError|TypeError):\\?n/i,
];

function escapedName(name) {
  return name.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function hasRenderError(html) {
  return renderErrorPatterns.some((pattern) => pattern.test(html));
}

async function get(path) {
  return fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
}

const listResponse = await get("/api/leads");
if (listResponse.status !== 200) throw new Error(`Lead index returned HTTP ${listResponse.status}`);
const payload = await listResponse.json();
const leads = Array.isArray(payload.data) ? payload.data : [];
const failures = [];

if (leads.length !== 23) failures.push({ path: "/api/leads", issue: `Expected 23 leads, received ${leads.length}` });
if (payload.meta?.dataState !== "operational-system-of-record") failures.push({ path: "/api/leads", issue: `Unexpected data state: ${payload.meta?.dataState}` });
if (payload.meta?.outreachCapability !== "human-approved-instantly") failures.push({ path: "/api/leads", issue: "Human-approved outreach boundary is missing" });

const dashboardResponse = await get("/api/dashboard");
const dashboardPayload = await dashboardResponse.json().catch(() => null);
if (
  dashboardResponse.status !== 200 ||
  dashboardPayload?.data?.target !== 10 ||
  typeof dashboardPayload?.data?.newBusinessesContactedToday !== "number" ||
  dashboardPayload?.data?.remainingToTarget !==
    Math.max(
      dashboardPayload?.data?.target -
        dashboardPayload?.data?.newBusinessesContactedToday,
      0,
    )
) {
  failures.push({
    path: "/api/dashboard",
    issue: "Daily target calculation is missing or inconsistent",
    status: dashboardResponse.status,
  });
}

for (const lead of leads) {
    const paths = [`/api/leads/${lead.id}`, `/companies/${lead.id}`, `/reports/${lead.id}`];
    const apiResponse = await get(paths[0]);
    const companyResponse = await get(paths[1]);
    const reportResponse = await get(paths[2]);
    const api = await apiResponse.json().catch(() => null);
    const companyHtml = await companyResponse.text();
    const reportHtml = await reportResponse.text();
    const expectedNames = [lead.name, escapedName(lead.name)];

    if (
      apiResponse.status !== 200 ||
      api?.data?.id !== lead.id ||
      !api?.data?.operations ||
      !Array.isArray(api?.data?.outreachHistory) ||
      !Array.isArray(api?.data?.operationalTimeline) ||
      api?.data?.reportReady !== true
    ) {
      failures.push({ path: paths[0], issue: "Operational API profile is incomplete", status: apiResponse.status });
    }
    if (api?.meta?.dataState !== "operational-system-of-record" || api?.meta?.outreachCapability !== "human-approved-instantly") {
      failures.push({ path: paths[0], issue: "API truth boundary is incorrect" });
    }
    if (companyResponse.status !== 200 || !expectedNames.some((name) => companyHtml.includes(name)) || hasRenderError(companyHtml)) {
      failures.push({ path: paths[1], issue: hasRenderError(companyHtml) ? "Embedded server-render error" : "Company page failed", status: companyResponse.status });
    }
    if (reportResponse.status !== 200 || !expectedNames.some((name) => reportHtml.includes(name)) || hasRenderError(reportHtml)) {
      failures.push({ path: paths[2], issue: hasRenderError(reportHtml) ? "Embedded server-render error" : "Report page failed", status: reportResponse.status });
    }
}

const [unknownApi, unknownCompany, unknownReport] = await Promise.all([
  get("/api/leads/not-a-real-company"),
  get("/companies/not-a-real-company"),
  get("/reports/not-a-real-company"),
]);

for (const [path, response] of [
  ["/api/leads/not-a-real-company", unknownApi],
  ["/companies/not-a-real-company", unknownCompany],
  ["/reports/not-a-real-company", unknownReport],
]) {
  if (path.startsWith("/api/")) {
    if (response.status !== 404) {
      failures.push({
        path,
        issue: `Expected HTTP 404, received ${response.status}`,
      });
    }
    continue;
  }
  // Next.js streamed notFound responses may commit HTTP 200 before the
  // not-found boundary resolves. Assert the semantic 404 marker and noindex.
  const html = await response.text();
  if (
    !html.includes("NEXT_HTTP_ERROR_FALLBACK;404") ||
    !html.includes('name="robots" content="noindex"')
  ) {
    failures.push({
      path,
      issue: "Expected a semantic not-found boundary with noindex",
      status: response.status,
    });
  }
}

const summary = {
  baseUrl,
  leadCount: leads.length,
  validEndpointChecks: leads.length * 3 + 1,
  invalidRouteChecks: 3,
  failureCount: failures.length,
  failures,
};

console.log(JSON.stringify(summary));
if (failures.length > 0) process.exitCode = 1;
