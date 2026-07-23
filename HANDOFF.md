# Objective and scope

Add Rockin Johnny's Diner's new Merivale location to the Que Intelligence lead dataset, perform in-depth ownership/opening research, expose the verified ownership detail in the product, and update/verify all generated lead artifacts and documentation.

# User requirements and constraints

- User asked to add Rockin Johnny's Diner and deeply research the owner and recently opened Merivale location.
- Follow the workspace AGENTS.md instructions supplied in the conversation.
- Preserve the distinction between publicly documented business roles and unverified legal ownership.
- Use sub-agents for bounded research and codebase inspection; both assigned sub-agents have completed.
- The `parallel-deep-research` skill was selected because the user explicitly requested in-depth research, but its external service is unavailable without `PARALLEL_API_KEY`.
- The `ponytail` skill was selected for the coding work; implementation should remain small and native to the current data pipeline.

# Decisions and assumptions

- Canonical business spelling is **Rockin Johnny's Diner**, not “Dinner.”
- New location: 1651 Merivale Road, Ottawa, Ontario.
- Public role wording:
  - Enzo Mastromattei: franchise owner and original founder.
  - Anthony Joseph: owner/operator who bought the former Westgate location in 2005 and participated in selecting the Merivale site.
- Do not describe either person as the sole legal owner of the current Merivale entity; Ontario corporate/registry ownership has not been verified.
- Treat July 15, 2026 as a community-reported opening date, not an official date. The Ottawa Business Journal confirmed the planned reopening on July 10, 2026.
- The official website is stale and its HTTPS certificate currently has a hostname mismatch. Its HTTP endpoint is reachable.
- No direct Merivale phone or email has been verified. The only complete public email on the official site is the Kanata address, so any use of it must be identified as a brand/Kanata route rather than a direct Merivale contact.
- Extend the raw lead record with optional `ownership`, `foundedYear`, and `locationCount` fields so the UI can show verified ownership without changing existing records.

# Completed work

- Updated `lib/verified-lead-factory.ts`
  - Added optional raw fields: `foundedYear`, `ownership`, and `locationCount`.
  - Maps those fields into `identity`; existing leads retain the `"Unavailable"` ownership fallback.
  - Added optional `emailLabel` support so a public contact route can disclose location/routing caveats.
- Updated `research/hospitality-leads.json`
  - Added `rockin-johnnys-diner` with Merivale address, documented ownership roles, direct-contact caveats, observations, scores, concepts, outreach notes, and four research sources.
- Updated `research/hospitality-leads.md`
  - Expanded the set from seven to eight businesses.
  - Added a full Rockin' Johnny's dossier and corrected the priority table's existing overall-score alignment.
- Added research artifacts:
  - `research/rockin-johnnys-diner-merivale-owner-research.md`
  - `research/rockin-johnnys-diner-merivale-owner-research.json`
- Updated count-sensitive runtime/docs:
  - `README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/QA.md`
  - `scripts/verify-runtime.mjs`
- Updated `scripts/build-outreach-index.mjs`
  - Removed the hard-coded 20-lead language.
  - Changed the generated artifact to count-agnostic `research/outreach-ready.md`.
  - Includes an optional email routing label in the generated contact brief.
- Regenerated `research/verified-leads-audit.json` for all 22 records after the Sukkar House extension.
- Generated `research/outreach-ready.md` and removed stale `research/outreach-ready-20.md`.
- Installed lockfile-defined Node dependencies with `npm ci`; `package-lock.json` was not changed.

# Commands and tests with results

- `parallel-cli research run ... --processor pro-fast --no-wait --json`
  - Blocked: `PARALLEL_API_KEY` is absent.
- `parallel-cli login --no-browser --json`
  - Timed out; no run ID, interaction ID, monitor URL, or poll command was created.
- Fallback primary-source web research completed using the Ottawa Business Journal, the official Rockin' Johnny's site, Kitchissippi Times, public property/trademark context, and clearly labelled community opening reports.
- JSON validation:
  - `research/hospitality-leads.json`: valid, 8 records.
  - `research/rockin-johnnys-diner-merivale-owner-research.json`: valid.
- `npm ci`: passed; installed 48 packages. NPM reported 3 existing dependency audit findings (1 moderate, 2 high); no automatic remediation was applied.
- `npm run typecheck`: passed.
- `npm run verify:leads`: passed with 22 records, 22 outreach-ready, 22 reachable websites or primary public surfaces, and zero validation, duplicate, or current-client failures.
- `npm run prepare:lead-index`: passed; wrote 22 records to `research/outreach-ready.md`.
- `npm run build`: passed; Next.js generated 56 static pages, including 22 company profiles and 22 reports.
- `QUE_MEDIA_BASE_URL=http://localhost:3001 npm run verify:runtime`: passed with 66 valid route checks, 3 invalid-route checks, and 0 failures.
- Static output inspection:
  - Rockin' Johnny's company HTML contains Enzo Mastromattei, Anthony Joseph, and the current-legal-entity caveat.
  - Rockin' Johnny's report HTML contains both named people.
- `git diff --check`: passed. Git emitted only line-ending normalization warnings.
- The temporary production server on port 3001 was stopped. Its two small stdout/stderr files remain in the OS temp directory because the execution policy rejected their removal; they are outside the repository.

# Current workspace and git state

- Branch: `master`
- Starting commit: `8de2423 Add verified business logos and app branding`
- Modified:
  - `README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/QA.md`
  - `lib/verified-lead-factory.ts`
  - `research/hospitality-leads.json`
  - `research/hospitality-leads.md`
  - `research/verified-leads-audit.json`
  - `scripts/build-outreach-index.mjs`
  - `scripts/verify-runtime.mjs`
- Deleted:
  - `research/outreach-ready-20.md`
- Untracked:
  - `HANDOFF.md`
  - `research/outreach-ready.md`
  - `research/rockin-johnnys-diner-merivale-owner-research.md`
  - `research/rockin-johnnys-diner-merivale-owner-research.json`
- `node_modules/` and `.next/` are ignored build/install outputs.

# Remaining work

- Commit and push the verified implementation at the user's request.
- Optional future research: obtain an Ontario Business Registry profile and direct confirmation from the Merivale restaurant.

# Blockers and risks

- The Parallel deep-research service is unavailable without authentication, so there is no Parallel interaction ID. Fallback research artifacts document this explicitly.
- Exact current legal ownership/operator entity is not established without Ontario registry records.
- No verified direct Merivale phone/email is public yet.
- Official website data is stale and HTTPS is currently misconfigured; verification must use the reachable HTTP endpoint and record the weakness honestly.
- `npm ci` reported three dependency audit findings unrelated to this lead addition. They were not automatically changed because dependency remediation is outside the request.
- Next.js reports a second `package-lock.json` at `C:\Users\AyubM\package-lock.json` and infers the broader workspace root. The build still passes.

# Exact next action

Stage the known Rockin' Johnny's implementation and research files, commit them on `master`, push to `origin/master`, and confirm the remote commit.
