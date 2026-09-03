# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 1 — Foundation
**Last completed:** 04 Database Schema
**Next:** 03 PostHog Initialization is partially built (see note below) — finish/verify it, then start Phase 2 (05 Profile Page — Full UI)

---

## Progress

### Phase 1 — Foundation

- [x] 01 Homepage
- [x] 02 Auth
- [ ] 03 PostHog Initialization (partial — see note)
- [x] 04 Database Schema

### Phase 2 — Profile Page

- [ ] 05 Profile Page — Full UI
- [ ] 06 Profile Save Logic
- [ ] 07 AI Profile Extraction from Resume
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

---

## Notes

_Add notes here as the build progresses — workarounds, patterns, anything that differs from the context files._
