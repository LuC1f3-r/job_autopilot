# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 2 — Profile Page
**Last completed:** 07 AI Profile Extraction from Resume
**Next:** 08 Resume PDF Generation from Profile. 03 PostHog Initialization is still partially built (see note below) and remains open.

---

## Progress

### Phase 1 — Foundation

- [x] 01 Homepage
- [x] 02 Auth
- [ ] 03 PostHog Initialization (partial — see note)
- [x] 04 Database Schema

### Phase 2 — Profile Page

- [x] 05 Profile Page — Full UI
- [x] 06 Profile Save Logic
- [x] 07 AI Profile Extraction from Resume
- [ ] 08 Resume PDF Generation from Profile

### Phase 3 — Find Jobs Page

- [ ] 09 Find Jobs Page — Full UI
- [ ] 10 Adzuna Job Discovery
- [ ] 11 Filter + Sort + Pagination

### Phase 4 — Job Details Page

- [ ] 12 Job Details Page — Full UI
- [ ] 13 Company Research Agent

### Phase 5 — Dashboard

- [ ] 14 Dashboard Page — Full UI
- [ ] 15 Stats Bar — Real Data
- [ ] 16 Recent Activity — Real Data
- [ ] 17 Analytics Charts — PostHog Data

---

## Decisions Made During Build

- Homepage CTAs use two hand-picked dark tokens sampled directly from `context/designs/landing-page.png` pixels (`--color-text-slate` for navbar CTA, `--color-text-darker` for Hero/CTA buttons), not the app's purple `--color-accent` primary button from ui-rules.md. The purple primary button stays reserved for in-app actions built in later features.
- No shadcn/ui CLI init yet — hand-rolled `components/ui/button.tsx` since the homepage only needed link-styled buttons. Real shadcn primitives (inputs, dropdowns, etc.) will be introduced when Feature 05 (Profile form) needs them.
- Installed `lucide-react` (already an approved dependency) for the small "play" triangle icon in the Get Started buttons.
- All homepage CTAs ("Get Started", "Start for free", "Find Your First Match") link to `/login` unconditionally — the logged-in → `/dashboard` branch from build-plan.md needs Feature 02 (Auth) to exist first.
- `public/images/dashboard-demo.png`, `jobs-lists.png`, `agnet-log.png`, and `user-icon.png` are used as-is (pre-rendered, shadows baked in) rather than rebuilt in HTML/CSS — they're pixel-exact crops of the design already.
- Replaced the create-next-app boilerplate `app/layout.tsx` (Geist font, "Create Next App" title) with Inter via `next/font/google` and real JobPilot metadata, per ui-rules.md.
- Added `.bg-hero-gradient` utility in globals.css (soft radial mesh built only from existing `--color-accent-light` / `--color-info-light` / `--color-accent-muted` tokens) for the Hero and CTA gradient cards — no new hardcoded hex introduced.
- **Auth is SSR-driven, not client-driven.** `architecture.md`'s original client pattern referenced a nonexistent `@insforge/ssr` package — the real SSR helpers ship as a subpath of the main SDK: `@insforge/sdk/ssr` (full client) and `@insforge/sdk/ssr/middleware` (lightweight, for proxy files). Corrected in architecture.md.
- OAuth sign-in, code exchange, and sign-out all run **server-side only** (`actions/auth.ts`, `app/(auth)/callback/route.ts`) via `createAuthActions()` — the browser InsForge client (`lib/insforge-client.ts`, `createBrowserClient()`) is intentionally read-only (`getCurrentUser`/`getProfile`/`getPublicAuthConfig`), per the SDK's own design. Login buttons are plain `<form action={serverAction}>` submits, no client component needed.
- PKCE `codeVerifier` from `signInWithOAuth` is stored in a short-lived (5 min) httpOnly `insforge_code_verifier` cookie between the redirect to the provider and the `/callback` exchange.
- Route protection lives in `proxy.ts`, not `middleware.ts` — Next.js 16 renamed the convention (same `matcher` API, function renamed `proxy`). It calls `updateSession()` to refresh the access-token cookie on every request, then gates `/dashboard`, `/profile`, `/find-jobs` on that cookie's presence.
- Verified live end-to-end with Playwright: clicking "Continue with Google" on `/login` correctly redirects to the real Google OAuth consent screen with a valid InsForge-issued `state`/PKCE `redirect_uri`. Full callback → dashboard redirect wasn't exercised (needs real provider credentials), but the request chain up to the provider is confirmed working.
- Per the deferred note above, the homepage's three CTAs ("Get Started", "Start for free", "Find Your First Match") and Navbar now resolve to `/dashboard` when a session cookie is present and `/login` otherwise, via `getSessionUser()` in `app/page.tsx` and `Navbar.tsx`. Navbar also swaps to a "Sign out" button when authenticated. **Note:** this went beyond Feature 02's stated build-plan scope — flagged in review, kept deliberately since it directly completes a requirement Feature 01 had already deferred to this feature.
- Post-review fixes: `actions/auth.ts`, `app/(auth)/callback/route.ts`, `app/api/auth/refresh/route.ts`, and `proxy.ts` now all wrap their InsForge/SDK calls in try/catch with `console.error("[context]", error)` logging, per code-standards.md. `signInWithOAuthAction`/`signOutAction` use `unstable_rethrow()` from `next/navigation` so Next's own `redirect()` control-flow errors pass through untouched instead of being swallowed by the catch block. `signOutAction` also force-clears auth cookies locally (`clearAuthCookies`) if the remote sign-out call fails, so a user is never stuck "logged in" after an API error.
- `getOrigin()` in `actions/auth.ts` now defaults to `https` (not `http`) in production when `x-forwarded-proto` is absent, to avoid constructing a wrong-scheme OAuth `redirectTo` on hosts that don't set that header.
- Added `components/auth/OAuthSubmitButton.tsx` — a small client subcomponent using `useFormStatus` — so the login buttons show a "Redirecting…" pending state during the server round-trip, restoring the affordance the first (client-driven) implementation had.
- Fixed remaining stale `@insforge/ssr` references in `context/library-docs.md` and `context/code-standards.md`'s approved-dependencies list (both now point to `@insforge/sdk` + its `/ssr` subpaths). `architecture.md`'s folder tree now lists `actions/auth.ts`, `components/auth/`, `app/api/auth/refresh/route.ts`, and `proxy.ts`, which were missing after the initial pass.
- **04 built out of build-plan order, ahead of a fully-finished 03.** `instrumentation-client.ts` (PostHog browser init, Next.js 16's client-instrumentation convention) and `posthog.identify()` wiring in `SignOutButton.tsx`/layout already exist from earlier work, but `lib/posthog-server.ts` (server client, `flushAt: 1`/`flushInterval: 0`) was never created and `posthog.reset()` on logout hasn't been confirmed. Treat 03 as unfinished until that's verified — it doesn't block 04 (no dependency between them) but should be closed out before Phase 2 features start firing server-side events.
- **Schema created directly via InsForge `run-raw-sql`/`create-bucket` MCP tools** (no separate migration-file system in this project) — all four tables (`profiles`, `agent_runs`, `jobs`, `agent_logs`) written idempotently (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`), so re-running the same SQL is safe.
- **`profiles.id` is the FK to `auth.users.id` directly** — no surrogate key. A `handle_new_user()` trigger function on `auth.users` (AFTER INSERT) auto-creates an empty `profiles` row on signup, so app code (Feature 06) only ever `update`s — it never needs to check whether a profile row exists yet. Confirmed InsForge exposes `auth.uid()`/`auth.jwt()` (Supabase-style) for RLS.
- **RLS enabled on all four tables**, policies scoped to `auth.uid() = user_id` (`= id` on `profiles`) for select/insert/update/delete — verified via `get-table-schema` after creation.
- **`ON DELETE CASCADE`** from `profiles` down through `agent_runs`/`jobs`/`agent_logs` (no account-deletion feature exists yet, but FK behavior had to be picked). `jobs.run_id` is nullable with `ON DELETE SET NULL` (URL-sourced jobs have no run) and `agent_logs.job_id` is nullable with `ON DELETE SET NULL` (per build-plan: "optional — related job").
- Added a `set_updated_at()` trigger on `profiles` (BEFORE UPDATE) since PostgREST/InsForge `update()` calls won't touch `updated_at` themselves — not explicitly specified in build-plan, added as a standard safety default.
- CHECK constraints added on the enum-like text columns build-plan calls out: `agent_runs.status`, `jobs.source`, `jobs.match_score` (0–100), `agent_logs.level`.
- Indexes added on every `user_id` FK column plus `jobs.run_id`/`agent_logs.run_id`, anticipating the query patterns Phase 3 (Find Jobs list/filter) and Phase 5 (Dashboard stats) will need.
- `resumes` storage bucket created with `isPublic: false` — InsForge bucket access is an all-or-nothing flag, not per-path RLS, so "own files only" (`resumes/{user_id}/resume.pdf`) is an app-level convention enforced by Feature 06's upload code, not the DB.
- **Backfilled `profiles` rows for 3 pre-existing `auth.users`** (test accounts created during Feature 02's OAuth verification, before this trigger existed) — otherwise their next login would hit a missing profile row.
- **05 Profile Page built as static UI only, per build-plan scope** — no DB reads/writes yet (that's 06). First real form primitives added (`components/ui/{input,select,textarea,tag-input,form-button,field-label,progress-ring}.tsx`) since the existing `Button` is link-only; registered in `ui-registry.md`. All fields except `email` (real session user, read-only) are static mock values matching `context/designs/profile.png`; skills/industries tags and Work Experience rows (capped at 3, per build-plan) are locally interactive via `useState` in `ProfileForm` but nothing persists. Completion percent (70%) and missing-field pills (Phone/Location/Education) are hardcoded to match the mock — Feature 06 will compute these for real. Resume dropzone, "Generate Resume from Profile", and "Save Profile" are visual/inert in this pass. Verified against the design image via a temporary, fully-reverted `proxy.ts` edit (unguarding `/profile` for one Playwright screenshot, since exercising real Google OAuth login wasn't in scope) — `proxy.ts` itself has no net change.
- **06 Profile Save Logic wired to InsForge DB and Storage** — Server Actions created in `actions/profile.ts`: `uploadResume(formData)` validates PDF format + 5MB size limit and uploads directly to `resumes/{user_id}/resume.pdf` with immediate preview, unblocking Feature 07's AI extraction; `saveProfile(payload)` persists all form fields (personal, professional, work experience JSON up to 3 roles, education JSON, job preferences) to the `profiles` table. Added `lib/profile-types.ts` defining TypeScript interfaces and `calculateProfileCompletion()` covering 11 core attributes (including resume upload). `app/profile/page.tsx` pre-fetches the profile via `createInsforgeServer()` and passes real completion data and `initialData` into `ProfileForm` and `ProfileAttentionBanner`, with optimistic UI feedback and client-side PostHog `profile_completed` capture when `is_complete` is reached for the first time. Updated `components/ui/form-button.tsx` to support custom button `type` (e.g. `submit`).
- **07 AI Profile Extraction from Resume — complete, verified end-to-end.** Added `lib/openrouter.ts` (OpenAI SDK client pointed at OpenRouter's `baseURL`) and `lib/resume-extraction-schema.ts` — JSON schema (`response_format: json_schema`, strict mode) covering only resume-derivable `ProfileFormData` fields (personal info, current title, experience level/years, skills, industries, up to 3 work experience roles, education); preference-only fields are deliberately excluded since a resume can't express them. `extractProfileFromResume()` added to `actions/profile.ts`: re-downloads the already-uploaded PDF from InsForge Storage (no re-upload from client), extracts text via `pdf-parse` v2's `PDFParse` class API, returns the spec'd error on short/empty text. Added `components/profile/ProfileEditor.tsx` as a client wrapper bridging `ResumeUpload` (owns the button, fires extraction) and `ProfileForm` (uncontrolled inputs, remounted via `key` bump) — guards against silent data loss by tracking form dirtiness and confirming via `window.confirm` before an extraction overwrites unsaved edits. Extracted `workExperience` capped at `MAX_WORK_EXPERIENCE_ROLES` (promoted to a shared export in `lib/profile-types.ts`). Added `resume_extracted` as the 9th PostHog event with a `countPopulatedFields()` helper. Multiple `/code-review` passes found and fixed: a data-loss bug (unsaved edits silently discarded on extraction), a metric-corrupting bug (fieldsPopulated miscounting empty `education`, later also miscounting a legitimate `yearsExperience: 0`), a resource leak (`parser.destroy()` skipped on parse failure), a work-experience cap bypass, and a stale-`resume_pdf_url`-in-parent-state bug — one flagged item (missing `userId` on the PostHog event) was correctly ruled out as a false positive (PostHog's `identify()` auto-attaches it as `distinct_id`).
  - **Bug fix — pdf-parse worker under Next.js/Turbopack.** `pdf-parse`/`pdfjs-dist` loads its worker via a runtime dynamic `import()` marked `webpackIgnore: true` (meant to bypass bundler interception entirely and resolve via Node's own loader at request time) — Turbopack does not honor that hint and rewrites the import target into its own virtual `[project]/...` module scheme regardless of what path string is passed, so no `workerSrc` value (relative, or a `require.resolve`'d absolute path) ever resolves. Root-caused via reading pdfjs-dist's compiled Turbopack output directly. Fixed properly in `lib/pdf-worker-setup.ts` by statically `import`-ing the worker module ourselves (a normal import Turbopack bundles correctly) and assigning it to `globalThis.pdfjsWorker` — pdfjs's loader checks that global first and skips its broken dynamic import entirely if already set. This is pdfjs-dist's own documented Node/bundler escape hatch. Required a manual ambient module declaration (`lib/pdf-worker.d.ts`) since the raw worker entry ships no types.
  - **Multi-provider AI client (Anthropic + OpenRouter).** User's initial `.env.local` value under the `OPENROUTER_API_KEY` name was actually an Anthropic key (`sk-ant-...`), and wrapped in literal single quotes that Next.js does not strip — corrupting the Bearer header. Rather than just renaming the var, extended to genuinely support both providers per user request: added `lib/anthropic.ts` (mirrors `lib/openrouter.ts`'s client-factory shape) and `lib/ai-extraction.ts` exporting `extractStructuredData()` — a provider-agnostic function `actions/profile.ts` calls instead of a provider SDK directly. Selection is presence-based (checked once per call, no runtime failover): Anthropic first via forced tool-use (`tool_choice: {type: "tool", ...}`, `claude-sonnet-5`, since Anthropic has no `json_schema` response-format equivalent), OpenRouter as fallback (`response_format: json_schema`). Documented in `code-standards.md` so future AI features reuse this instead of hardcoding a provider. Added `ANTHROPIC_API_KEY` to the env var table.
  - **Free-tier model selection + rate-limit fallback.** User's Anthropic key turned out to have no funded credits (a real account-billing state, not a bug); user then supplied a genuine OpenRouter key and asked to use a free-tier model. Queried OpenRouter's `/models` endpoint directly to find free (`:free` suffix) models that actually support `structured_outputs`/`response_format` (most don't). `OPENROUTER_MODELS` in `lib/ai-extraction.ts` now tries `z-ai/glm-5.2:free` → `nvidia/nemotron-3-super-120b-a12b:free` → `dots-studio/dots-3-note-preview:free` in order, catching `429` (`isRateLimitError`, checks the OpenAI SDK's `APIError.status`) and falling through to the next model — free models share a rate-limited upstream pool and individually 429 under load. Verified working live via server log: a real extraction request succeeded (19.3s, consistent with at least one fallback attempt) and produced correct extracted data that flowed into a subsequent `saveProfile` call.
  - Known minor gap: the per-model retry loop doesn't log which model actually served a successful request — fine for now, would help future debugging of free-model reliability.

---

## Notes

_Add notes here as the build progresses — workarounds, patterns, anything that differs from the context files._
