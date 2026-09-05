# Memory — Feature 07 AI Profile Extraction, Complete + Multi-Provider AI Support

Last updated: 2026-09-05 17:05 IST

## What was built

This session picked up Feature 07 from "code complete, pending API key" and took it to fully working, verified end-to-end, plus added a reusable multi-provider AI client along the way.

- **Fixed a real pdf-parse/Turbopack incompatibility.** `lib/pdf-worker-setup.ts` (new) statically imports pdfjs-dist's worker module and assigns it to `globalThis.pdfjsWorker` before any PDF parsing — this is pdfjs-dist's documented escape hatch for Node/bundler environments where its own dynamic `import()` of the worker script can't resolve. Needed a manual ambient module declaration, `lib/pdf-worker.d.ts` (the raw worker entry ships no types).
- **Built a provider-agnostic AI extraction layer:**
  - `lib/anthropic.ts` (new) — Anthropic SDK client factory, mirrors `lib/openrouter.ts`'s shape (`isAnthropicConfigured()`/`getAnthropicClient()`/`AnthropicNotConfiguredError`).
  - `lib/ai-extraction.ts` (new) — exports `extractStructuredData()`, the single function `actions/profile.ts` now calls instead of talking to a provider SDK directly. Picks Anthropic first (forced tool-use via `tool_choice`, since Anthropic has no `json_schema` response-format mode; model `claude-sonnet-5`) if `ANTHROPIC_API_KEY` is set, else falls back to OpenRouter (`response_format: json_schema`). Selection is presence-based only, checked once per call — no runtime failover between providers.
  - OpenRouter side now tries a list of free-tier models in order — `OPENROUTER_MODELS` in `lib/ai-extraction.ts`: `z-ai/glm-5.2:free` → `nvidia/nemotron-3-super-120b-a12b:free` → `dots-studio/dots-3-note-preview:free` — catching `429`s (`isRateLimitError`, checks the OpenAI SDK's `APIError.status`) and falling through, since free models share a rate-limited upstream pool.
- `actions/profile.ts`'s `extractProfileFromResume()` updated to call `extractStructuredData()` and to call `ensurePdfWorkerConfigured()` before parsing.
- `context/code-standards.md` — added `ANTHROPIC_API_KEY` env var row and a note describing the provider-selection contract for future AI features.
- Installed `pdf-parse`, `openai`, `@anthropic-ai/sdk`.
- Fixed `.env.local`: the user's key was originally stored under the wrong variable name (`OPENROUTER_API_KEY`) while actually being an Anthropic key, and wrapped in literal single quotes Next.js doesn't strip (corrupting the Bearer header once sent as an HTTP auth token). Renamed to `ANTHROPIC_API_KEY`, quotes removed. That key turned out to have no funded credits (real Anthropic account billing state). User then supplied a genuine OpenRouter key; Anthropic's line is now commented out in `.env.local` (not deleted) so re-enabling later needs no code change — just uncomment.

## Decisions made

- **Multi-provider over single-provider**: user explicitly asked to support both Anthropic and OpenRouter rather than just fixing the one broken key, since they hold working keys for both providers at different times. Went through a full `/architect` session to align on this before building — see `progress-tracker.md`'s Feature 07 entry for the complete decision log (structured-output mechanism per provider, abstraction shape, fallback priority).
- **Presence-based provider selection, no runtime failover**: if Anthropic is configured but its API call fails (e.g. no credits), the whole extraction fails rather than silently retrying via OpenRouter. To force OpenRouter, comment out `ANTHROPIC_API_KEY`. This was a deliberate, discussed choice — revisit only if the user asks for automatic failover later.
- **Free-tier OpenRouter model choice**: verified via OpenRouter's own `/models` API which free (`:free`-suffixed) models actually support `structured_outputs`/`response_format` (most free models don't) before picking the fallback list — not a guess.

## Problems solved

- **pdf-parse "Setting up fake worker failed" under Next.js/Turbopack** — root-caused properly (not guessed): pdfjs-dist's worker loader uses a dynamic `import()` marked `webpackIgnore: true`, intended to bypass bundler interception and resolve via Node's own loader at runtime — but Turbopack doesn't honor that hint and rewrites the import target into its own virtual module scheme regardless of the path given, so neither the default relative path nor a `require.resolve`'d absolute path ever worked. Confirmed by reading pdfjs-dist's actual compiled Turbopack chunk. Real fix: pre-empt pdfjs's loader entirely by statically importing the worker ourselves and setting `globalThis.pdfjsWorker` (pdfjs's own documented pattern for this exact situation) — the loader checks that global first and skips the broken import path if already set.
- **`.env.local` quoting bug** — every value in this file was wrapped in single quotes by convention; harmless for most values but corrupts anything sent as a raw Bearer token. Root-caused via direct byte-level inspection of the file (not assumption).
- **Wrong provider key under the wrong variable name** — the value under `OPENROUTER_API_KEY` was actually an `sk-ant-...` (Anthropic) key. Diagnosed by checking the key's own prefix, not just assuming a typo.
- **OpenRouter free-model rate limiting** — `z-ai/glm-5.2:free` returned live `429`s from a shared upstream pool under load; fixed with an ordered fallback across 3 structured-output-capable free models rather than just retrying the same one.

## Current state

- **Feature 07 is complete and verified end-to-end via a live server log** (not just typecheck): a real extraction request succeeded (~19.3s, consistent with at least one model fallback), produced correctly-shaped extracted data (e.g. `experienceLevel: "lead"`, populated education fields), which then flowed cleanly into a subsequent real `saveProfile()` call.
- `progress-tracker.md` updated: Feature 07 marked `[x]` complete, "Last completed" bumped to 07, "Next" now points at Feature 08. Full decision log for the pdf-worker fix and multi-provider work appended to the Feature 07 entry.
- Ran the project's `/review` (or equivalent `.agents/skills/review/SKILL.md`) 3-layer check — passed Layer 1 (plan alignment) and Layer 2 (system integrity, `tsc`/`eslint` clean) cleanly. Layer 3 flagged one minor, non-blocking gap: the OpenRouter model-fallback loop doesn't log which model actually served a successful request — worth adding opportunistically for future debugging of free-model reliability, not urgent.
- `tsc --noEmit`, `eslint`, and `next build` all pass clean as of the last check this session.
- Dev server is currently running in the background (port 3000) with the working config: Anthropic key commented out, OpenRouter key active with the free-model fallback list.
- Feature 03 (PostHog Initialization) remains open/partial from an earlier session — untouched this session, still flagged in `progress-tracker.md`.

## Next session starts with

Move to **Feature 08 — Resume PDF Generation from Profile**: `POST /api/resume/generate` reads current profile data, calls the same `lib/ai-extraction.ts` provider abstraction (or a similar structured/free-form call) to generate polished resume content (professional summary, polished bullet points), renders it via `@react-pdf/renderer`'s `renderToBuffer()`, uploads to `resumes/{user_id}/resume.pdf` (upsert), updates `resume_pdf_url`. Reuse the existing Anthropic/OpenRouter provider pattern rather than hardcoding a single provider again.

Optional, non-blocking cleanup if there's spare time before 08: add a debug log in `lib/ai-extraction.ts`'s OpenRouter retry loop noting which model actually succeeded, to make future free-tier reliability issues easier to diagnose.

## Open questions

- None blocking Feature 08. Feature 03 (PostHog init) still flagged as unfinished from a prior session.
- If the user's Anthropic account gets funded with credits later, they just need to uncomment the `ANTHROPIC_API_KEY` line in `.env.local` — no code changes required, since Anthropic already wins by default when present.
