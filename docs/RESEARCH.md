# Que Media Intelligence Research Brief

Date: 2026-07-20

## Product patterns worth reusing

### Research as a structured workspace

Clay's strongest idea is not bulk outreach. It is the table as an observable research graph. Sources create records, enrichments add typed fields, AI agents handle judgment-heavy columns, and each step can be rerun or inspected. Clay also centralizes agent definitions and versions them, which prevents prompt drift across workflows. Que Media Intelligence should reuse the observable pipeline, reusable agent definitions, run history, and source-first model without inheriting campaign sending. Sources: [Clay sources](https://university.clay.com/docs/sources), [Claygent Builder](https://university.clay.com/docs/claygent-builder), [AI in Clay](https://university.clay.com/docs/ai-in-clay).

### Signals with context, not just badges

Apollo and Instantly treat intent, company activity, hiring, funding, news, and social activity as filters. The useful pattern is that a signal carries a date, evidence, source, and enough detail to change the next action. Que Media's Why Now engine should rank time-bounded events and show why they matter instead of displaying a generic hot-lead badge. Sources: [Apollo buying intent](https://knowledge.apollo.io/hc/en-us/articles/8047704465933-Buying-Intent-Overview), [Instantly signals](https://help.instantly.ai/en/articles/14818218-signals-filter-in-supersearch).

### Layered enrichment

FullEnrich demonstrates the reliability benefit of waterfall enrichment across multiple providers. Que Media should apply the same pattern to facts, not only contact details: normalize an entity, query approved sources in order, stop when confidence is sufficient, retain conflicting values, and record which source supplied the accepted fact. Source: [FullEnrich waterfall enrichment](https://fullenrich.com/blog/waterfall-enrichment).

### One intelligence view per company

HubSpot's Intelligence tab combines company enrichment, buyer intent, and record context inside the company view. The transferable idea is a single intelligence workspace that explains the business without forcing users to jump between tools. Que Media's version must go deeper on website, local SEO, social content, competitors, and strategy while avoiding CRM deal-stage clutter. Source: [HubSpot Intelligence tab](https://knowledge.hubspot.com/records/use-the-intelligence-tab).

### Search that shows its work

Perplexity's useful product pattern is a researched answer with source citations and a fast-to-deep research spectrum. Que Media should offer quick refreshes for volatile facts and deeper multi-step investigations for qualification and client reports. Source: [Perplexity API platform](https://www.perplexity.ai/help-center/en/articles/10354842-what-is-the-perplexity-api-platform).

### Monitors that survive normal page changes

Browse AI combines structured extraction, scheduled checks, change detection, retries, and adaptation. Que Media should model every monitor as a named source adapter with a schedule, health status, last successful run, change threshold, and manual repair path. Significant structural changes must still surface for review. Sources: [Browse AI overview](https://help.browse.ai/en/articles/10486821-what-does-browse-ai-do), [change monitoring](https://help.browse.ai/en/articles/12271136-does-browse-ai-support-websites-that-change-frequently).

## Patterns to reject

- Do not inherit campaign sequences, mailbox warmup, auto-send, deliverability dashboards, or volume goals from Instantly, Apollo, or Clay.
- Do not reduce qualification to one unexplained score. The score is an index into evidence, not a substitute for it.
- Do not treat missing API access as a zero metric.
- Do not present model confidence as factual certainty.
- Do not hide stale data. Every fact and derived claim needs an observed-at timestamp and refresh policy.
- Do not build a universal scraper that ignores source terms, robots policies, rate limits, or platform authorization boundaries.

## Recommended modular agent system

The system should separate deterministic collection from model judgment. Each agent receives typed inputs, returns schema-validated outputs, and cannot contact a prospect.

1. Discovery Scout finds candidate businesses from approved geographic, directory, news, event, hiring, and business sources.
2. Entity Resolver normalizes names, domains, addresses, phones, place identifiers, and social handles, then merges duplicates while retaining source records.
3. Profile Researcher builds the public company and leadership profile.
4. Website Auditor runs deterministic crawl, performance, accessibility, SEO, conversion, and UX checks.
5. Local Visibility Analyst evaluates Google and directory presence, reviews, NAP consistency, and local search visibility.
6. Social Observer inventories accounts and public content, then measures cadence, visible engagement, formats, and inactive periods.
7. Content Analyst classifies formats, extracts hooks and calls to action, evaluates production choices, and identifies missing content opportunities.
8. Competitor Analyst selects local peers and builds an evidence-backed comparison.
9. Trend and Event Researcher finds relevant industry, seasonal, and Ottawa-specific opportunities.
10. Decision-Maker Researcher collects only public, professionally relevant details with an intrusion-risk check.
11. Fit and Opportunity Scorer calculates transparent subscores and expected return on effort.
12. Why Now Analyst ranks timely triggers and explains their outreach relevance.
13. Strategy Planner turns gaps into Que Media-specific content and growth recommendations.
14. Outreach Writer drafts channel-specific messages from approved evidence and tone rules.
15. Evidence Reviewer challenges unsupported claims, stale observations, weak causal links, generic recommendations, and invasive personalization.
16. Report Composer produces the client-ready narrative and print artifact.
17. Outcome Learner updates feature weights from replies, objections, wins, losses, and explicit feedback without rewriting history.

An orchestrator owns state transitions, retries, budgets, and review gates. Agents never communicate through unstructured prose alone. Shared facts live in a canonical evidence store and agents exchange identifiers plus typed outputs.

## Scoring model

Use separate scores for Business Opportunity, Que Media Content Fit, Why Now, Reachability, Evidence Confidence, and Response Likelihood. The priority score should optimize expected return on effort:

`priority = fit x opportunity x timing x reachability x evidence confidence / estimated effort`

Each score exposes:

- weighted factors and their contribution;
- supporting and contradicting evidence;
- source, observation date, and freshness;
- missing information and confidence penalty;
- model and rubric version;
- a plain-language explanation of what would change the score.

The Que Media Content Fit score should emphasize filmable products or transformations, willing on-camera personalities, educational depth, entertaining formats, recurring customer stories, local community relevance, and a plausible path from content to customer acquisition.

## Acquisition and monitoring stack

Use official APIs and licensed providers first. Google Places Nearby Search can discover establishments and return identifiers, categories, locations, hours, ratings, photos, and selected review data through field masks. Source: [Google Places Nearby Search](https://developers.google.com/maps/documentation/places/web-service/nearby-search).

Google Business Profile APIs are primarily management APIs for authorized accounts. Public competitive local data therefore needs Places data, a licensed local-data provider, or carefully governed observation. DataForSEO exposes local pack, business profile, review, and listings endpoints suited to public competitor research. Sources: [Google Business Profile API](https://developers.google.com/my-business/reference/rest), [DataForSEO Business Data API](https://dataforseo.com/apis/business-data-api).

Use Crawlee with Playwright as the self-controlled crawling backbone. Prefer HTTP crawling and promote only JavaScript-dependent pages to browser execution. Crawlee supplies queues, deduplication, retries, throttling, sessions, and resource-aware concurrency. Sources: [Crawlee introduction](https://crawlee.dev/js/docs/introduction), [PlaywrightCrawler](https://crawlee.dev/js/api/playwright-crawler).

Use Firecrawl Cloud selectively for fast site-to-Markdown or structured extraction. Treat self-hosting as a license decision because the repository is AGPL-3.0, and verify cloud versus self-hosted feature differences before committing. Sources: [Firecrawl documentation](https://docs.firecrawl.dev/introduction), [Firecrawl repository](https://github.com/firecrawl/firecrawl).

Use Stagehand only for exceptional, unfamiliar interactive pages where deterministic selectors are fragile. Cache validated actions and keep explicit Playwright routines as the normal path. Source: [Stagehand repository](https://github.com/browserbase/stagehand).

### Thirty-day freshness research

Use the [`last30days` skill](https://github.com/mvanhorn/last30days-skill) as a planned specialist input for recent Ottawa lead signals, hiring, competitor movement, and public social or community pulse. Its strongest transferable patterns are entity resolution before searching, explicit per-source status, cluster-first synthesis across duplicate coverage, engagement-aware evidence ranking, citations, and a valid empty outcome when nothing meets the evidence floor.

This capability complements, rather than replaces, official APIs, licensed sources, first-party research, and deterministic audits. Every finding must be normalized into cited evidence and reviewed before it can affect a score, report, Why Now claim, or outreach draft. Browser-cookie or credential access requires explicit consent, collection remains public and read-only, and no research path may contact a prospect.

The skill is installed for local Codex use, but no Que Media application connector or worker is currently configured. The implementation contract is in [LAST30DAYS_INTEGRATION.md](LAST30DAYS_INTEGRATION.md).

## Audit and report stack

- Lighthouse for repeatable mobile and desktop lab audits. Run several controlled samples and report median plus variance, not a single magic score. Source: [Lighthouse overview](https://developer.chrome.com/docs/lighthouse/overview).
- axe-core in the same Playwright session for automated accessibility findings. Label them as automated findings because automation cannot prove full conformance. Source: [axe-core](https://github.com/dequelabs/axe-core).
- A deterministic technical SEO crawler for status codes, redirects, titles, descriptions, headings, canonicals, robots directives, sitemaps, structured data, internal links, broken links, images, language tags, and NAP consistency. Base rules on [Google Search crawling and indexing guidance](https://developers.google.com/search/docs/crawling-indexing).
- Render the same semantic React report used in the app and print it through Playwright Chromium. This keeps web and PDF typography, charts, evidence references, and layout aligned. Source: [Playwright PDF generation](https://playwright.dev/docs/api/class-page#page-pdf).

## Agent runtime recommendation

Use LangGraph for the initial research runtime because its durable state, checkpointing, interrupts, and evaluator loops fit long-running evidence workflows with human review. Back checkpoints with PostgreSQL and validate inputs and outputs with Pydantic models. Sources: [LangGraph overview](https://docs.langchain.com/oss/python/langgraph/overview), [persistence](https://docs.langchain.com/oss/python/langgraph/persistence), [interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts).

Add Temporal later when continuous monitoring creates many scheduled, multi-day jobs. Temporal should own schedules, timeouts, retries, idempotency, and worker recovery while LangGraph remains the inner research graph. Sources: [Temporal documentation](https://docs.temporal.io/), [Temporal Python SDK](https://github.com/temporalio/sdk-python).

Do not add several overlapping agent frameworks. PydanticAI and CrewAI contain useful ideas, but running them beside LangGraph would create duplicated abstractions before the core evidence model is proven.

## Social data boundaries

There is no legitimate universal API for deep competitor analytics across every platform. Label each metric as public observed, owner authorized, estimated, or unavailable. Never convert unavailable into zero.

- Instagram official APIs focus on professional accounts and richer owner-authorized insights. Public competitor analysis should emphasize observable content and visible engagement. Source: [Instagram API collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api).
- TikTok Display API requires user authorization, while Research API access is not a commercial competitor-intelligence foundation. Sources: [TikTok Display API](https://developers.tiktok.com/doc/display-api-overview), [Research API eligibility](https://developers.tiktok.com/products/research-api/).
- LinkedIn's useful organization permissions require review and an authorized Page role. Do not base the product on scraping LinkedIn pages. Sources: [LinkedIn API access](https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access), [Community Management review](https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review).
- YouTube public channel and video statistics are available through the Data API. Retention and audience analytics require owner authorization. Sources: [YouTube Data API](https://developers.google.com/youtube/v3/getting-started), [YouTube Analytics authorization](https://developers.google.com/youtube/reporting).
- X public search and metrics use the official paid API. Deeper metrics require user-context authorization. Sources: [X API pricing](https://docs.x.com/x-api/getting-started/pricing), [X metrics](https://docs.x.com/x-api/fundamentals/metrics).

The defensible competitor product is strong public-content observation combined with richer owner-authorized analytics after a prospect becomes a client.

## Non-negotiable safeguards

- No outreach sending credentials or send tools in any research worker.
- Manual approval is a persisted state, not a prompt instruction.
- Minimize personal data and collect only professionally relevant public information.
- Record source terms, collection purpose, retention policy, and deletion controls per adapter.
- Keep raw evidence, extracted facts, derived claims, recommendations, and message drafts as separate layers.
- Version rubrics, prompts, models, reports, and outcomes so learning remains auditable.
- Preserve contradictions and failed lookups. Silence is not evidence.
