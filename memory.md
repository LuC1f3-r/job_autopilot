# Memory — Feature 10 Adzuna Job Discovery & TinyFish Fallback Integration

Last updated: 2026-09-07 01:43 IST

## What was built

- **Adzuna Job Discovery Integration**: Built `lib/adzuna.ts` with `searchJobs()` calling the Adzuna API (`https://api.adzuna.com/v1/api/jobs/{country}/search/1`) and `detectCountry()` auto-detecting countries (`us`, `gb`, `au`, `ca`).
- **Server Action & Route**: Added `findJobs` in `actions/jobs.ts` and `POST /api/agent/find` in `app/api/agent/find/route.ts`. `findJobs` creates `agent_runs` tracking rows, fetches candidate profiles from InsForge DB, scores returned Adzuna jobs concurrently with `Promise.allSettled`, saves matched records to `jobs`, logs failures to `agent_logs`, and captures PostHog `job_search_started` and `job_found` events via `lib/posthog-server.ts`.
- **Job Match Schema**: Created `lib/job-match-schema.ts` defining `JobMatchResult`, `JOB_MATCH_JSON_SCHEMA`, and `JOB_MATCH_SYSTEM_PROMPT`.
- **Multi-Tier AI Extraction with TinyFish**: Enhanced `lib/ai-extraction.ts` to support a 3-tier cascade: Anthropic Claude Sonnet -> OpenRouter free models -> TinyFish Cloud Web Agent (`extractWithTinyFish`). Added `cleanSchemaForTinyFish` to sanitize strict schema keywords unsupported by TinyFish (e.g. `additionalProperties`). Added unified `isAnyAiConfigured()` helper used across `actions/jobs.ts`, `actions/profile.ts`, and `app/api/resume/generate/route.tsx`.
- **TinyFish SDK Client**: Installed `@tiny-fish/sdk` and built `lib/tinyfish.ts` providing `getTinyFishClient()`, `isTinyFishConfigured()`, `searchWeb()`, and `fetchContents()`.
- **Find Jobs UI Wiring**: Converted `components/find-jobs/SearchControls.tsx` to a `"use client"` component handling user search queries, active loading states, and result banners. Wired `app/find-jobs/page.tsx` and `components/find-jobs/JobsTable.tsx` to load real jobs and runs from InsForge DB.
- **Repository Cleanup & .gitignore**: Removed 16 temporary `.playwright-mcp/` log/yml files and stray `find-jobs.png` screenshot from the root. Updated `.gitignore` to track `.env.example` while safely ignoring actual environment files, build caches (`*.tsbuildinfo`), and test logs.

## Decisions made

- **Action/Route Split**: UI components call `findJobs` directly as a Server Action; `app/api/agent/find/route.ts` wraps it solely for spec parity.
- **Concurrent Scoring**: Job scoring runs in parallel using `Promise.allSettled` to avoid compounding serial AI latencies.
- **Three-Tier AI Fallback**: If Anthropic runs out of credits, OpenRouter free models are tried. If OpenRouter is congested or rate-limited (`429`), TinyFish automatically handles structured extraction.
- **Adzuna Field Handling**: Adzuna provides a description snippet rather than a full JD; JD detail fields (`responsibilities`, `benefits`, etc.) remain `null` on initial insert rather than hallucinated.

## Problems solved

- Corrected Adzuna environment variable naming in `.env.local` (`ADZUNA_APP_KEY`).
- Resolved TinyFish `output_schema` validation error caused by unsupported `additionalProperties` field by adding `cleanSchemaForTinyFish`.
- Fixed `.gitignore` blocking `.env.example` tracking via `!.env.example`.
- Cleaned ephemeral Playwright MCP log clutter from git staging.

## Current state

- Feature 10 (Adzuna Job Discovery) is complete and verified with clean TypeScript compilation (`tsc --noEmit`) and clean production build (`next build`).
- Feature 09 (Find Jobs Page UI) is wired with real DB data.
- Feature 08 (Resume PDF Generation) remains code-complete (`[~]`) awaiting live browser OAuth verification.
- Feature 03 (PostHog Initialization) remains open/partial.

## Next session starts with

- Feature 11 (Filter + Sort + Pagination): Wire filter tabs, sort dropdown, text search, and pagination controls to real InsForge DB query params in `components/find-jobs/JobsTable.tsx` and `app/find-jobs/page.tsx`.

## Open questions

- None blocking for Feature 11.
- Feature 08 still pending live OAuth browser QA to flip from `[~]` to `[x]`.
