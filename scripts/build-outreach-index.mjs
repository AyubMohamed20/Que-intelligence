import { readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspace = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputFiles = [
  "research/hospitality-leads.json",
  "research/wellness-leads.json",
  "research/visual-service-leads.json",
];
const auditPath = "research/verified-leads-audit.json";

const records = [];
for (const relativePath of inputFiles) {
  const parsed = JSON.parse(await readFile(resolve(workspace, relativePath), "utf8"));
  records.push(...parsed);
}

const audit = JSON.parse(await readFile(resolve(workspace, auditPath), "utf8"));
const auditTime = new Date(audit.generatedAt).getTime();
if (!Number.isFinite(auditTime)) throw new Error("Verification audit has no valid generatedAt timestamp. Run npm run verify:leads first.");
for (const relativePath of inputFiles) {
  const inputStat = await stat(resolve(workspace, relativePath));
  if (inputStat.mtimeMs > auditTime) throw new Error(`${relativePath} changed after the verification audit. Run npm run verify:leads first.`);
}

const auditById = new Map((audit.audits ?? []).map((item) => [item.id, item]));
const duplicateAuditIds = (audit.audits ?? []).filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) !== index);
const notReady = records.filter((record) => !auditById.get(record.id)?.outreachReady);
const orphanAudits = (audit.audits ?? []).filter((item) => !records.some((record) => record.id === item.id));
if (
  audit.summary?.leadCount !== records.length
  || audit.summary?.outreachReadyCount !== records.length
  || audit.summary?.validationErrorCount !== 0
  || audit.summary?.duplicateIdCount !== 0
  || audit.summary?.duplicateCompanyUrlCount !== 0
  || audit.summary?.duplicateSocialUrlCount !== 0
  || audit.summary?.excludedClientMatchCount !== 0
  || duplicateAuditIds.length > 0
  || notReady.length > 0
  || orphanAudits.length > 0
) {
  throw new Error(`Verification audit is not ready for a 20-lead index. Not ready: ${notReady.map((record) => record.id).join(", ") || "none"}. Run npm run verify:leads and resolve every gate.`);
}

records.sort((left, right) => right.scores.opportunity - left.scores.opportunity || right.scores.contentFit - left.scores.contentFit);

const lines = [
  "# Que Media Outreach-Ready Ottawa Market Lead Index",
  "",
  `Generated from the verified research cohort on ${audit.generatedAt.slice(0, 10)}.`,
  "",
  "> This is preparation, not an outreach queue. Recheck current signals and manually review each draft immediately before contacting a business.",
  "",
  "## Ranked shortlist",
  "",
  "| Rank | Business | Content fit | Opportunity | Response estimate | Why Now |",
  "| ---: | --- | ---: | ---: | ---: | --- |",
];

for (const [index, lead] of records.entries()) {
  const whyNow = lead.whyNow?.title ?? "No verified time-bounded trigger";
  lines.push(`| ${index + 1} | [${lead.name}](${lead.website}) | ${lead.scores.contentFit} | ${lead.scores.opportunity} | ${lead.scores.response}% | ${whyNow.replaceAll("|", "\\|")} |`);
}

lines.push("", "## Contact and outreach briefs", "");

for (const [index, lead] of records.entries()) {
  lines.push(`### ${index + 1}. ${lead.name}`, "");
  lines.push(`- Website: ${lead.website}`);
  lines.push(`- Location: ${lead.location}`);
  lines.push(`- Public email: ${lead.email ?? "Unavailable"}`);
  lines.push(`- Public phone: ${lead.phone ?? "Unavailable"}`);
  lines.push(`- Public decision-maker context: ${lead.decisionMaker ? `${lead.decisionMaker.name}, ${lead.decisionMaker.role} (${lead.decisionMaker.sourceUrl})` : "No verified named decision maker"}`);
  lines.push(`- Why Now: ${lead.whyNow ? `${lead.whyNow.title}. ${lead.whyNow.detail}` : "No current time-bounded business-change signal was verified. Use an evergreen, observation-led opening."}`);
  lines.push(`- Best prepared channel: ${lead.outreach.channel}`);
  lines.push(`- Subject: ${lead.outreach.subject || "Not applicable"}`);
  lines.push(`- Opening: ${lead.outreach.opening}`);
  lines.push(`- Call to action: ${lead.outreach.callToAction}`);
  lines.push(`- Concepts: ${lead.concepts.map((concept) => concept.title).join("; ")}`);
  lines.push("- Verified public socials:");
  for (const social of lead.socials) lines.push(`  - ${social.platform}: [${social.handle || `${lead.name} on ${social.platform}`}](${social.url})`);
  lines.push("");
}

lines.push(
  "## Verification boundary",
  "",
  `All ${audit.summary.outreachReadyCount} of ${audit.summary.leadCount} records passed \`npm run verify:leads\` with ${audit.summary.validationErrorCount} validation errors. Missing values remain unavailable. Social activity, engagement, local ranking, Google review metrics, performance speed, and production quality are not scored unless a complete public sample exists.`,
  "",
);

await writeFile(resolve(workspace, "research/outreach-ready-20.md"), `${lines.join("\n")}\n`, "utf8");
process.stdout.write(`Wrote ${records.length} verified leads to research/outreach-ready-20.md\n`);
