import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const researchFiles = [
  "research/hospitality-leads.json",
  "research/wellness-leads.json",
  "research/visual-service-leads.json",
];
const outputDirectory = path.join(root, "public", "business-logos");
const manifestPath = path.join(root, "research", "business-logos.json");
const userAgent = "Mozilla/5.0 (compatible; QueMediaIntelligence/1.0; +https://quemedia.ca/)";
const timeoutMs = 18_000;
const darkSurfaceLogoIds = new Set(["arro-wellness", "iron-north-studio"]);
const officialLogoOverrides = new Map([
  [
    "iron-north-studio",
    "https://static.wixstatic.com/media/809240_6a26de2d48ad469fa1b84cbf277408a7~mv2.png",
  ],
  [
    "apartmint-hair-studio",
    "https://static.wixstatic.com/media/e24f37_7288671bae7044788250d9809f625269~mv2.png",
  ],
]);

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .trim();
}

function attributes(tag) {
  const result = new Map();
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result.set(match[1].toLowerCase(), decodeHtml(match[2] ?? match[3] ?? match[4] ?? ""));
  }
  return result;
}

function absoluteUrl(value, baseUrl) {
  if (!value || value.startsWith("data:") || value.startsWith("blob:")) return null;
  const firstSrcsetValue = value.split(",")[0]?.trim().split(/\s+/)[0];
  try {
    const url = new URL(firstSrcsetValue, baseUrl);
    if (!/^https?:$/.test(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function addCandidate(candidates, value, baseUrl, score, kind, context = "") {
  const url = absoluteUrl(value, baseUrl);
  if (!url) return;
  const lower = `${url} ${context}`.toLowerCase();
  let adjustedScore = score;
  if (/logo|brand|wordmark/.test(lower)) adjustedScore += 70;
  if (/header|navbar|site-identity/.test(lower)) adjustedScore += 20;
  if (/\.svg(?:\?|$)/.test(url)) adjustedScore += 18;
  if (/sprite|loader|spinner|pixel|tracking|payment|search|cart|account|pfavico/.test(lower)) adjustedScore -= 100;
  const existing = candidates.get(url);
  if (!existing || adjustedScore > existing.score) candidates.set(url, { url, score: adjustedScore, kind });
}

function extractCandidates(html, baseUrl) {
  const candidates = new Map();
  const base = new URL(baseUrl);
  const isInstagramProfile = base.hostname.endsWith("instagram.com")
    && base.pathname.split("/").filter(Boolean).length === 1;

  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const script = match[1];
    for (const logoMatch of script.matchAll(/["']logo["']\s*:\s*(?:["']([^"']+)["']|\{[\s\S]{0,500}?["'](?:url|contentUrl)["']\s*:\s*["']([^"']+)["'])/gi)) {
      addCandidate(candidates, logoMatch[1] ?? logoMatch[2], baseUrl, 130, "structured-data-logo", script.slice(0, 240));
    }
  }

  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    const attrs = attributes(tag[0]);
    const context = [...attrs.values()].join(" ");
    const likelyLogo = /logo|brand|wordmark|site-identity|custom-logo/i.test(context);
    const source = attrs.get("src") || attrs.get("data-src") || attrs.get("data-lazy-src") || attrs.get("srcset") || attrs.get("data-srcset");
    addCandidate(candidates, source, baseUrl, likelyLogo ? 100 : 5, likelyLogo ? "page-logo" : "page-image", context);
  }

  for (const tag of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = attributes(tag[0]);
    const rel = (attrs.get("rel") ?? "").toLowerCase();
    if (!rel.includes("icon")) continue;
    const score = rel.includes("apple-touch") ? 42 : rel.includes("mask-icon") ? 38 : 30;
    addCandidate(candidates, attrs.get("href"), baseUrl, score, "site-icon", `${rel} ${attrs.get("sizes") ?? ""}`);
  }

  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = attributes(tag[0]);
    const property = (attrs.get("property") ?? attrs.get("name") ?? "").toLowerCase();
    if (property === "og:logo") addCandidate(candidates, attrs.get("content"), baseUrl, 120, "open-graph-logo");
    if (property === "og:image") {
      addCandidate(
        candidates,
        attrs.get("content"),
        baseUrl,
        isInstagramProfile ? 90 : 12,
        isInstagramProfile ? "official-profile-image" : "open-graph-image",
      );
    }
  }

  return [...candidates.values()].sort((a, b) => b.score - a.score);
}

async function fetchWithTimeout(url, options = {}) {
  return fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    ...options,
    headers: {
      "user-agent": userAgent,
      accept: options.accept ?? "*/*",
      ...(options.headers ?? {}),
    },
  });
}

function detectExtension(buffer, contentType, sourceUrl) {
  const type = contentType.split(";")[0].trim().toLowerCase();
  if (type === "image/svg+xml" || buffer.subarray(0, 500).toString("utf8").match(/<svg[\s>]/i)) return "svg";
  if (type === "image/png" || buffer.subarray(1, 4).toString("ascii") === "PNG") return "png";
  if (type === "image/webp" || buffer.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  if (type === "image/jpeg" || (buffer[0] === 0xff && buffer[1] === 0xd8)) return "jpg";
  if (type === "image/gif" || buffer.subarray(0, 3).toString("ascii") === "GIF") return "gif";
  if (type === "image/x-icon" || type === "image/vnd.microsoft.icon" || (buffer[0] === 0 && buffer[1] === 0 && buffer[2] === 1)) return "ico";
  const extension = new URL(sourceUrl).pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  return ["svg", "png", "webp", "jpg", "jpeg", "gif", "ico"].includes(extension) ? extension.replace("jpeg", "jpg") : null;
}

async function downloadCandidate(candidate, referer) {
  const response = await fetchWithTimeout(candidate.url, {
    accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    headers: { referer },
  });
  if (!response.ok) throw new Error(`asset HTTP ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength < 80 || arrayBuffer.byteLength > 5_000_000) throw new Error("asset size outside accepted range");
  const buffer = Buffer.from(arrayBuffer);
  const extension = detectExtension(buffer, response.headers.get("content-type") ?? "", response.url);
  if (!extension) throw new Error("response is not a supported image");
  return { buffer, extension, finalUrl: response.url };
}

async function persistAsset(id, extension, buffer) {
  const filename = `${id}.${extension}`;
  await writeFile(path.join(outputDirectory, filename), buffer);
  const siblingAssets = (await readdir(outputDirectory)).filter(
    (entry) => entry.startsWith(`${id}.`) && entry !== filename,
  );
  await Promise.all(siblingAssets.map((entry) => unlink(path.join(outputDirectory, entry))));
  return filename;
}

async function downloadLogo(lead) {
  const officialOverride = officialLogoOverrides.get(lead.id);
  if (officialOverride) {
    const asset = await downloadCandidate({ url: officialOverride }, lead.website);
    const filename = await persistAsset(lead.id, asset.extension, asset.buffer);
    return {
      id: lead.id,
      name: lead.name,
      website: lead.website,
      assetPath: `/business-logos/${filename}`,
      sourceUrl: asset.finalUrl,
      sourceKind: "official-page-logo",
      displaySurface: darkSurfaceLogoIds.has(lead.id) ? "dark" : "light",
      capturedAt: new Date().toISOString(),
    };
  }

  const homepage = await fetchWithTimeout(lead.website, { accept: "text/html,application/xhtml+xml" });
  if (!homepage.ok) throw new Error(`homepage HTTP ${homepage.status}`);
  const html = await homepage.text();
  const candidates = extractCandidates(html, homepage.url);
  if (candidates.length === 0) throw new Error("no logo candidates found");

  const errors = [];
  for (const candidate of candidates.slice(0, 18)) {
    try {
      const asset = await downloadCandidate(candidate, homepage.url);
      const filename = await persistAsset(lead.id, asset.extension, asset.buffer);
      return {
        id: lead.id,
        name: lead.name,
        website: lead.website,
        assetPath: `/business-logos/${filename}`,
        sourceUrl: asset.finalUrl,
        sourceKind: candidate.kind,
        displaySurface: darkSurfaceLogoIds.has(lead.id) ? "dark" : "light",
        capturedAt: new Date().toISOString(),
      };
    } catch (error) {
      errors.push(`${candidate.url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(errors.slice(0, 3).join("; "));
}

async function mapConcurrent(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

const leadGroups = await Promise.all(researchFiles.map(async (file) => JSON.parse(await readFile(path.join(root, file), "utf8"))));
const leads = leadGroups.flat().map(({ id, name, website }) => ({ id, name, website }));
await mkdir(outputDirectory, { recursive: true });

const results = await mapConcurrent(leads, 4, async (lead) => {
  try {
    const record = await downloadLogo(lead);
    process.stdout.write(`✓ ${lead.name} → ${record.assetPath} (${record.sourceKind})\n`);
    return record;
  } catch (error) {
    process.stderr.write(`✗ ${lead.name}: ${error instanceof Error ? error.message : String(error)}\n`);
    return null;
  }
});

const logos = results.filter(Boolean);
await writeFile(manifestPath, `${JSON.stringify(logos, null, 2)}\n`);
process.stdout.write(`Downloaded ${logos.length}/${leads.length} business logos. Manifest: ${path.relative(root, manifestPath)}\n`);
if (logos.length !== leads.length) process.exitCode = 1;
