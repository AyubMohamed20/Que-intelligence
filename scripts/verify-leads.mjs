import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputFiles = [
  "research/hospitality-leads.json",
  "research/wellness-leads.json",
  "research/visual-service-leads.json",
];
const outputFile = resolve(workspace, "research/verified-leads-audit.json");
const capturedAt = new Date().toISOString();

function plainText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function collectPhones(html) {
  const matches = html.match(/(?:\+?1[\s.()-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}/g) ?? [];
  return new Set(matches.map(normalizePhone).filter((value) => value.length === 10));
}

function collectEmails(html) {
  const matches = html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  const cloudflareValues = [...html.matchAll(/data-cfemail=["']([a-f0-9]+)["']/gi)]
    .map((match) => match[1])
    .filter((value) => value.length >= 4 && value.length % 2 === 0)
    .map((value) => {
      const key = Number.parseInt(value.slice(0, 2), 16);
      let decoded = "";
      for (let index = 2; index < value.length; index += 2) decoded += String.fromCharCode(Number.parseInt(value.slice(index, index + 2), 16) ^ key);
      return decoded;
    });
  return new Set([...matches, ...cloudflareValues].map((value) => value.toLowerCase()));
}

function collectSocialLinks(html, baseUrl) {
  const platformByHost = [
    ["instagram.com", "instagram"],
    ["tiktok.com", "tiktok"],
    ["facebook.com", "facebook"],
    ["youtube.com", "youtube"],
    ["youtu.be", "youtube"],
    ["linkedin.com", "linkedin"],
    ["x.com", "x"],
    ["twitter.com", "x"],
    ["threads.net", "threads"],
    ["pinterest.com", "pinterest"],
  ];
  const links = [];
  const hrefs = html.matchAll(/href=["']([^"']+)["']/gi);
  for (const match of hrefs) {
    try {
      const url = new URL(match[1].replaceAll("&amp;", "&"), baseUrl);
      const platform = platformByHost.find(([host]) => url.hostname === host || url.hostname.endsWith(`.${host}`))?.[1];
      if (!platform) continue;
      const cleanUrl = `${url.protocol}//${url.host}${url.pathname}`.replace(/\/$/, "");
      if (!links.some((item) => item.platform === platform && item.url === cleanUrl)) links.push({ platform, url: cleanUrl });
    } catch {
      // Invalid hrefs are ignored and remain absent from verified discovery.
    }
  }
  return links;
}

function comparableUrl(value) {
  try {
    const url = new URL(value);
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return String(value ?? "").toLowerCase().replace(/\/$/, "");
  }
}

async function fetchPageOnce(url, timeoutMs = 15000) {
  if (!/^https?:\/\//i.test(String(url ?? ""))) {
    return { ok: false, status: null, finalUrl: null, html: "", error: "Invalid or missing HTTP URL" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "QueMediaIntelligenceVerifier/1.0 (+https://www.quemedia.ca)",
      },
    });
    const contentType = response.headers.get("content-type") ?? "";
    const html = contentType.includes("text/html") ? (await response.text()).slice(0, 2_000_000) : "";
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      html,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      finalUrl: null,
      html: "",
      error: error instanceof Error ? error.message : "Fetch failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchPage(url, timeoutMs = 15000) {
  let result = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    result = await fetchPageOnce(url, timeoutMs);
    const retryable = result.status === 429 || (result.status !== null && result.status >= 500) || result.status === null;
    if (result.ok || !retryable || attempt === 3) return result;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, attempt * 750));
  }
  return result ?? { ok: false, status: null, finalUrl: null, html: "", error: "Fetch failed" };
}

function check(id, label, points, passed, observation) {
  return { id, label, points, passed: Boolean(passed), earned: passed ? points : 0, observation };
}

function isIsoDate(value) {
  return typeof value === "string"
    && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)
    && Number.isFinite(new Date(value).getTime());
}

function validateLead(lead, file) {
  const errors = [];
  const requiredStrings = ["id", "name", "industry", "location", "website"];
  for (const key of requiredStrings) {
    if (typeof lead?.[key] !== "string" || !lead[key].trim()) errors.push(`${key} is required`);
  }
  if (!Array.isArray(lead?.socials)) errors.push("socials must be an array");
  if (!Array.isArray(lead?.observations) || lead.observations.length < 3) errors.push("at least three observations are required");
  if (!Array.isArray(lead?.sources) || lead.sources.length < 2) errors.push("at least two sources are required");
  if (lead?.whyNow?.date !== null && lead?.whyNow?.date !== undefined && !isIsoDate(lead.whyNow.date)) {
    errors.push("whyNow.date must be an ISO date or null");
  }
  for (const [index, source] of (lead?.sources ?? []).entries()) {
    if (!isIsoDate(source.capturedAt)) errors.push(`sources[${index}].capturedAt must be an ISO date`);
    if (source.lastPublishedAt !== null && source.lastPublishedAt !== undefined && !isIsoDate(source.lastPublishedAt)) {
      errors.push(`sources[${index}].lastPublishedAt must be an ISO date or null`);
    }
  }
  for (const score of ["contentFit", "opportunity", "response"]) {
    const value = lead?.scores?.[score];
    if (!Number.isFinite(value) || value < 0 || value > 100) errors.push(`scores.${score} must be between 0 and 100`);
  }
  if (!lead?.outreach?.body || !lead?.outreach?.callToAction) errors.push("a complete outreach draft is required");
  return { file, errors };
}

async function auditLead(lead, file) {
  const validation = validateLead(lead, file);
  const website = await fetchPage(lead.website);
  const html = website.html;
  const officialPageUrls = [...new Set([
    lead.website,
    ...(lead.sources ?? [])
      .filter((source) => String(source.kind).toLowerCase().includes("official") && !String(source.kind).toLowerCase().includes("social"))
      .map((source) => source.url),
  ])];
  const officialPages = await Promise.all(officialPageUrls.map(async (url) => ({
    url,
    response: comparableUrl(url) === comparableUrl(lead.website) ? website : await fetchPage(url),
  })));
  const officialHtml = officialPages.map(({ response }) => response.html).join(" ");
  const text = plainText(html);
  const officialText = plainText(officialHtml);
  const lowerHtml = officialHtml.toLowerCase();
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
  const description = html.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i)?.[1]
    ?? html.match(/<meta\b[^>]*content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i)?.[1]
    ?? "";
  const hasViewport = /<meta\b[^>]*name=["']viewport["']/i.test(html);
  const hasH1 = /<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(html);
  const hasContactAction = /href=["'](?:tel:|mailto:|[^"']*(?:contact|book|reserve|appointment|quote))/i.test(html);
  const hasStructuredData = /application\/ld\+json/i.test(html);
  const hasCanonical = /<link\b[^>]*rel=["']canonical["']/i.test(html);
  const hasOpenGraph = /<meta\b[^>]*property=["']og:(?:title|image|description)["']/i.test(html);
  const discoveredSocialLinks = officialPages.flatMap(({ url, response }) => collectSocialLinks(response.html, response.finalUrl ?? url))
    .filter((item, index, all) => all.findIndex((candidate) => candidate.platform === item.platform && comparableUrl(candidate.url) === comparableUrl(item.url)) === index);
  const listedSocials = (lead.socials ?? []).filter((social) => {
    try {
      const socialUrl = new URL(social.url);
      const handle = String(social.handle ?? "").replace(/^@/, "").toLowerCase();
      return lowerHtml.includes(socialUrl.hostname.toLowerCase()) || (handle && lowerHtml.includes(handle));
    } catch {
      return false;
    }
  });

  const checks = [
    check("reachable", "Website returns a successful response", 20, website.ok, website.error ?? `HTTP ${website.status}`),
    check("https", "Website uses HTTPS", 5, String(website.finalUrl ?? lead.website).startsWith("https://"), website.finalUrl ?? lead.website),
    check("title", "Page has a descriptive title", 10, title.length >= 10, title || "No title found"),
    check("description", "Page has a meta description", 10, description.length >= 50, description || "No meta description found"),
    check("viewport", "Page declares a mobile viewport", 10, hasViewport, hasViewport ? "Viewport declaration found" : "Viewport declaration not found"),
    check("h1", "Page has a primary heading", 10, hasH1, hasH1 ? "H1 found" : "H1 not found in fetched HTML"),
    check("contact", "Page exposes a contact or booking action", 15, hasContactAction, hasContactAction ? "Contact action found" : "No clear contact action found"),
    check("social", "Page links to a verified social account", 10, listedSocials.length > 0, listedSocials.length ? `${listedSocials.length} supplied social link(s) found` : "No supplied social link found on the page"),
    check("structured-data", "Page includes structured data", 5, hasStructuredData, hasStructuredData ? "JSON-LD found" : "JSON-LD not found"),
    check("canonical", "Page declares a canonical URL", 3, hasCanonical, hasCanonical ? "Canonical found" : "Canonical not found"),
    check("open-graph", "Page includes Open Graph metadata", 2, hasOpenGraph, hasOpenGraph ? "Open Graph metadata found" : "Open Graph metadata not found"),
  ];
  const websiteScore = checks.reduce((sum, item) => sum + item.earned, 0);

  const phones = collectPhones(`${officialHtml} ${officialText}`);
  const emails = collectEmails(`${officialHtml} ${officialText}`);
  const suppliedPhone = normalizePhone(lead.phone);
  const suppliedEmail = String(lead.email ?? "").toLowerCase();
  const contactVerification = {
    phone: lead.phone
      ? { value: lead.phone, listedOnWebsite: suppliedPhone.length === 10 && phones.has(suppliedPhone) }
      : null,
    email: lead.email
      ? { value: lead.email, listedOnWebsite: emails.has(suppliedEmail) }
      : null,
  };

  const socialChecks = await Promise.all((lead.socials ?? []).map(async (social) => {
    const response = await fetchPage(social.url, 10000);
    return {
      platform: social.platform,
      handle: social.handle,
      url: social.url,
      listedOnWebsite: listedSocials.some((item) => comparableUrl(item.url) === comparableUrl(social.url)),
      reachable: response.ok,
      httpStatus: response.status,
      finalUrl: response.finalUrl,
      error: response.error,
    };
  }));

  const referencedUrls = [...new Set([
    ...(lead.sources ?? []).map((source) => source.url),
    ...(lead.socials ?? []).map((social) => social.url),
    ...(lead.observations ?? []).flatMap((observation) => observation.sourceUrls ?? []),
    ...(lead.whyNow?.sourceUrls ?? []),
    ...(lead.competitors ?? []).map((competitor) => competitor.url),
    ...(lead.outreach?.evidenceUrls ?? []),
    ...(lead.decisionMaker?.sourceUrl ? [lead.decisionMaker.sourceUrl] : []),
  ])];
  const sourceChecks = await Promise.all(referencedUrls.map(async (url) => {
    const source = (lead.sources ?? []).find((candidate) => comparableUrl(candidate.url) === comparableUrl(url));
    const officialPage = officialPages.find((page) => comparableUrl(page.url) === comparableUrl(url));
    const socialCheck = socialChecks.find((social) => comparableUrl(social.url) === comparableUrl(url));
    const response = officialPage?.response ?? (socialCheck ? {
      ok: socialCheck.reachable,
      status: socialCheck.httpStatus,
      finalUrl: socialCheck.finalUrl,
      error: socialCheck.error,
    } : await fetchPage(url));
    return {
      label: source?.label ?? url,
      url,
      reachable: response.ok,
      httpStatus: response.status,
      finalUrl: response.finalUrl,
      error: response.error,
    };
  }));

  const hasVerifiedPublicContact = Boolean(
    contactVerification.phone?.listedOnWebsite
    || contactVerification.email?.listedOnWebsite
    || socialChecks.some((social) => social.listedOnWebsite && ["instagram", "linkedin", "facebook"].includes(String(social.platform).toLowerCase())),
  );
  const hasVerifiedSocial = socialChecks.some((social) => social.listedOnWebsite || social.reachable);
  const rawSourceUrls = new Set((lead.sources ?? []).map((source) => comparableUrl(source.url)));
  const reachableSourceCount = sourceChecks.filter((source) => source.reachable && rawSourceUrls.has(comparableUrl(source.url))).length;
  const outreachReady = validation.errors.length === 0
    && website.ok
    && hasVerifiedPublicContact
    && hasVerifiedSocial
    && reachableSourceCount >= 2;

  return {
    id: lead.id,
    name: lead.name,
    sourceFile: file,
    capturedAt,
    validation,
    website: {
      requestedUrl: lead.website,
      finalUrl: website.finalUrl,
      httpStatus: website.status,
      reachable: website.ok,
      title,
      metaDescription: description,
      score: websiteScore,
      checks,
      discoveredSocialLinks,
      suppliedSocialsMissingFromOfficialSite: (lead.socials ?? [])
        .filter((social) => !listedSocials.some((listed) => comparableUrl(listed.url) === comparableUrl(social.url)))
        .map((social) => ({ platform: social.platform, url: social.url })),
      officialSocialsMissingFromResearch: discoveredSocialLinks.filter(
        (discovered) => !(lead.socials ?? []).some(
          (social) => String(social.platform).toLowerCase() === String(discovered.platform).toLowerCase(),
        ),
      ),
    },
    contactVerification,
    socialChecks,
    sourceChecks,
    reachableSourceCount,
    sourceCount: lead.sources.length,
    outreachReady,
  };
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

const records = [];
for (const relativePath of inputFiles) {
  const fullPath = resolve(workspace, relativePath);
  const parsed = JSON.parse(await readFile(fullPath, "utf8"));
  const leads = Array.isArray(parsed) ? parsed : parsed.leads;
  if (!Array.isArray(leads)) throw new Error(`${relativePath} must contain an array or a { leads: [] } object`);
  for (const lead of leads) records.push({ lead, file: relativePath });
}

const duplicateIds = records
  .map(({ lead }) => lead.id)
  .filter((id, index, all) => all.indexOf(id) !== index);
if (duplicateIds.length) throw new Error(`Duplicate lead IDs: ${[...new Set(duplicateIds)].join(", ")}`);

const duplicateCompanyUrls = records
  .map(({ lead }) => comparableUrl(lead.website))
  .filter((url, index, all) => all.indexOf(url) !== index);
if (duplicateCompanyUrls.length) throw new Error(`Duplicate company URLs: ${[...new Set(duplicateCompanyUrls)].join(", ")}`);

const socialOwners = new Map();
const duplicateSocialUrls = [];
for (const { lead } of records) {
  for (const social of lead.socials ?? []) {
    const key = comparableUrl(social.url);
    const owner = socialOwners.get(key);
    if (owner && owner !== lead.id) duplicateSocialUrls.push(`${social.url} (${owner}, ${lead.id})`);
    socialOwners.set(key, lead.id);
  }
}
if (duplicateSocialUrls.length) throw new Error(`Social URLs reused across businesses: ${duplicateSocialUrls.join(", ")}`);

const excludedCurrentClients = new Set([
  "pho by night",
  "zero latency ottawa",
  "mosaic medical spa",
  "family dental care",
  "skuish",
  "oxygen yoga fitness",
  "ottawa dental care",
]);
const excludedClientMatches = records.filter(({ lead }) => excludedCurrentClients.has(String(lead.name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()));
if (excludedClientMatches.length) throw new Error(`Current Que Media clients cannot enter the prospect cohort: ${excludedClientMatches.map(({ lead }) => lead.name).join(", ")}`);

const audits = await mapWithConcurrency(records, 4, ({ lead, file }) => auditLead(lead, file));
const report = {
  generatedAt: capturedAt,
  inputFiles,
  summary: {
    leadCount: audits.length,
    outreachReadyCount: audits.filter((audit) => audit.outreachReady).length,
    validationErrorCount: audits.reduce((sum, audit) => sum + audit.validation.errors.length, 0),
    reachableWebsiteCount: audits.filter((audit) => audit.website.reachable).length,
    duplicateIdCount: duplicateIds.length,
    duplicateCompanyUrlCount: duplicateCompanyUrls.length,
    duplicateSocialUrlCount: duplicateSocialUrls.length,
    excludedClientMatchCount: excludedClientMatches.length,
  },
  audits,
};

await writeFile(outputFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report.summary)}\n${outputFile}\n`);
