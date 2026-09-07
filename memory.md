# Memory — Feature 13 Company Research Agent Complete

Last updated: 2026-09-07 23:40 IST

## What was built

- **Feature 13 (Company Research Agent)**: "Research Company" button on the job details page now runs a real Stagehand browser session against the company's homepage + up to 3 sub-pages, then synthesizes a 9-field dossier via AI and saves it to `jobs.company_research`.
- New files: `actions/research.ts` (`researchCompany(jobId)` Server Action — the real logic), `app/api/agent/research/route.ts` (thin wrapper, spec parity with build-plan, mirrors Feature 10's `find` route pattern), `lib/browserbase.ts` (Browserbase config + the OpenRouter `ClientLLM` adapter that powers Stagehand's own act/extract calls), `lib/company-homepage.ts` (`deriveHomepageUrl` — server-side redirect-follow, no browser needed), `lib/company-research-schema.ts` (dossier JSON schema + synthesis system prompt).
- `components/job-details/JobDetails.tsx` converted to a Client Component; wired the button to `researchCompany`, added loading/error states, and built out full rendering for all 9 dossier fields (Company Overview, Tech Stack, Culture, Why This Role, Your Edge, Gaps to Address, Smart Questions, Interview Prep, Sources) — previously only an empty-state placeholder.
- `lib/job-types.ts`'s `Job.company_research` retyped from `Record<string, unknown>` to the real `CompanyResearchDossier` shape.
- `next.config.ts` gained `serverExternalPackages: ["@browserbasehq/stagehand"]` (Turbopack can't bundle a `new URL("../", import.meta.url)` extension-asset lookup inside Stagehand).
- `zod` pinned to `4.4.3` explicitly (was only transitive before) so it dedupes with Stagehand's own bundled zod — two different installed versions produce incompatible `ZodType`s at the TS level otherwise.
- **Shared-infrastructure fix** (benefits every feature, not just this one): `lib/ai-extraction.ts`'s TinyFish fallback tier (`extractWithTinyFish`) had no timeout and could hang ~10 minutes on a user-facing action; bounded it with `AbortSignal.timeout(PER_MODEL_TIMEOUT_MS)`, same 20s bound OpenRouter's tier already uses.

## Decisions made

- **Stagehand's own LLM binding uses OpenRouter, not Anthropic or OpenAI** — reversed twice during the architecture session. `library-docs.md`'s literal Stagehand/OpenAI example doesn't match the installed `@browserbasehq/stagehand@4.0.2` API at all (different constructor pattern, different `extract()` signature). Stagehand v4's `model.modelName` is a closed provider-string union with no OpenRouter/custom-baseURL support — and this app genuinely has no `ANTHROPIC_API_KEY` configured (confirmed via isolated Node repro: `Stagehand.create()` hard-rejects the config when `apiKey` is empty). Landed on Stagehand's `ClientLLM` escape hatch (`{ generate: fn }`), implemented in `lib/browserbase.ts` as a thin adapter over the existing `getOpenRouterClient()`, typed directly against Stagehand's own exported `ClientLLM` type. This means Stagehand's browser actions and the app's synthesis step now share the same provider and free-model rotation — no new API key was ever needed despite two rounds of "add a key" being considered.
- **Synthesis reuses `lib/ai-extraction.ts`'s existing 3-tier fallback** (`extractStructuredData`) exactly like Feature 10's job matching — no separate AI plumbing for the dossier.
- **`agent_runs` row still created per research call** purely because `agent_logs.run_id` is `NOT NULL` in the schema — not because research is a batch-style run. Feature 16's activity feed will read `jobs.company_research IS NOT NULL` directly per build-plan, not this run row.

## Problems solved

- Relative sub-page URLs (e.g. `/about`) from the model's `pageLinks` crashed `page.goto()` with a CDP "invalid URL" error — fixed by resolving against the homepage origin with `new URL(url, homepageUrl)`.
- TinyFish's unbounded ~10-minute fallback hang (shared file, affects every feature using this AI fallback chain) — fixed with a bounded timeout.
- Two Stagehand API-shape mismatches between `library-docs.md`'s docs and the actually-installed v4.0.2 SDK, discovered by reading the real `.d.ts`/`.mjs` rather than trusting the docs file.
- zod version mismatch between the app's top-level zod and Stagehand's bundled zod causing TS structural-incompatibility errors — fixed by pinning `zod@4.4.3` explicitly so npm dedupes.

## Current state

- Feature 13 (Company Research Agent) — ✅ complete, confirmed working end-to-end via live browser QA on a real account and a real Canva job row (not mocked): full Stagehand session (homepage + 3 sub-pages) succeeded, synthesis produced a genuinely well-grounded, Canva-specific dossier, and the result was confirmed persisted to the DB via a hard page reload.
- `npm run lint` and `npm run build` both clean.
- `context/progress-tracker.md` updated — Phase 4 is now fully complete; Phase 5 (Dashboard) is next.
- Feature 03 (PostHog Initialization) — still open/partial, unchanged, unrelated to this work.

## Next session starts with

- **Feature 14 (Dashboard Page — Full UI)** — per build-plan Phase 5: four stat cards (Total Jobs Found, Avg. Match Rate, Companies Researched, Cover Letters Generated) with mock numbers + trend indicators, a Recent Activity card (5 mock entries with colored dots/timestamps), a Resume Tailoring Activity bar chart, a Jobs Found Over Time line chart, a Match Score Distribution bar chart, and an incomplete-profile banner if the profile isn't complete. All mock data at this stage — Features 15-17 wire it to real DB/PostHog data afterward.

## Open questions

- None blocking. Note for whoever builds Feature 15/16: `agent_runs` rows created by Feature 13's research calls have `job_title_searched`/`location_searched` left null (they don't apply to a single-job research action) — don't assume every `agent_runs` row represents a job search batch when building the stats/activity queries.
