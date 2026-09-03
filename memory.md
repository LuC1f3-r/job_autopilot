# Memory — PostHog Event Tracking (built on Feature 02 Auth)

Last updated: 2026-09-02

## What was built

PostHog was already initialized before this session via the PostHog Wizard — `instrumentation-client.ts` at the project root calls `posthog.init()` with `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` / `NEXT_PUBLIC_POSTHOG_HOST`, and `posthog.identify()`/`posthog.reset()` were already wired into `PostHogIdentify` (in `components/auth/SignOutButton.tsx`, rendered from `app/layout.tsx`) and `SignOutButton`. This session added the actual `posthog.capture()` event instrumentation on top of that:

- `components/ui/button.tsx` — converted to a client component (`"use client"`); added optional `event?: string` / `eventProps?: Record<string, unknown>` props that fire `posthog.capture()` on click. Used by Navbar's "Start for free", Hero's two CTAs (`location: "hero"`), and the footer CTA section (`location: "footer_cta"`) — all firing `cta_clicked` with `{ location, label }`.
- `components/auth/OAuthSubmitButton.tsx` — now takes a `provider` prop and fires `oauth_sign_in_started` with `{ provider }` on click.
- `components/auth/OAuthButtons.tsx` — passes `provider` through to `OAuthSubmitButton`.
- `components/auth/SignOutButton.tsx` — fires `user_signed_out` (no properties) immediately before `posthog.reset()`.
- `components/auth/AuthErrorTracker.tsx` (new) — client component, fires `auth_error_shown` with `{ error }` in a `useEffect`; rendered from `app/(auth)/login/page.tsx` only when an OAuth error is present in the URL.
- `context/code-standards.md` — the PostHog Events table was a closed list of exactly 4 events (`job_search_started`, `job_found`, `profile_completed`, `company_researched`) tied to unbuilt job-search features, with an explicit "never invent new event names without adding them here first" rule. Added the 4 new events (`cta_clicked`, `oauth_sign_in_started`, `user_signed_out`, `auth_error_shown`) to that table so the code complies with the project's own governance rule.

## Decisions made

- Chose to retroactively register the new event names in `code-standards.md` rather than roll them back to the original 4 — the new events are real, already-verified user-action tracking (auth funnel + CTA attribution) and more useful right now than the four planned-but-unbuilt job-search events.
- `components/ui/button.tsx` had to become a client component to attach `onClick` — the only way to fire `posthog.capture()` from what was a pure server-rendered `Link` wrapper. Accepted tradeoff: moves every CTA button on the homepage/navbar into the client bundle.
- Post-login redirect changed from `/dashboard` → `/` (in `app/(auth)/callback/route.ts`) and the homepage's signed-in CTA href changed the same way (in `app/page.tsx`) — both marked with `TODO` comments to flip back once `/dashboard` exists. This deviates from `context/build-plan.md`'s "After login → redirect to /dashboard" line, done deliberately (user-approved) to unblock testing since the dashboard route doesn't exist yet.
- Also fixed (unrelated, found via `/recover`): `instrumentation-client.ts`'s dev-mode `capture_exceptions` guard was throwing/logging noisily when PostHog's remote script failed to load (browser tracking-protection blocking `us.i.posthog.com`) — this was cosmetic PostHog-internal logging, not a real app crash; confirmed via a live Playwright repro of the full OAuth click → redirect flow (0 errors, worked end to end).

## Problems solved

- User initially thought PostHog console noise (`[ExceptionAutocapture] failed to load script`, `TypeError: Load failed`) was breaking login — traced via `/recover` to non-fatal PostHog SDK logging (blocked by browser tracking protection, e.g. Safari ITP), not an app error. Confirmed by direct Playwright reproduction of the login flow succeeding.
- The *actual* reported issue ("after logging in I just see 404") was that `/callback/route.ts` redirects to `/dashboard`, which was never built (confirmed via `find app -iname "*dashboard*"` returning nothing). Not an auth bug — auth completes correctly; the destination page is simply missing. Fixed by redirecting to `/` for now (see Decisions).
- `/review` surfaced that this session's 4 new event names weren't in `code-standards.md`'s explicit closed list — fixed by adding them to the table (see What was built).

## Current state

- PostHog event tracking is live for the full auth funnel (`oauth_sign_in_started` → `auth_error_shown` on failure, `user_signed_out` on logout) and CTA attribution (`cta_clicked` with location/label) across the homepage and navbar.
- `tsc --noEmit` and `eslint` both clean.
- Login → OAuth redirect → (would-be callback) → `/` verified working end to end via Playwright, except the real provider callback exchange itself still hasn't been exercised with live credentials (same open item as Feature 02).
- `context/code-standards.md`'s PostHog Events table now lists 8 events total (4 original + 4 added this session) and is back in sync with the code.
- `/dashboard` still does not exist as a route — `context/architecture.md` describes it but it was never built. Multiple places still link to `/dashboard` and will 404 if clicked: the "Dashboard" nav item in `components/layout/Navbar.tsx` and `components/layout/Footer.tsx` (left untouched, out of scope — only the *post-login default* was redirected away from `/dashboard`, not these explicit nav links).
- `context/architecture.md` / `context/build-plan.md` describe a `lib/posthog-client.ts` + `lib/posthog-server.ts` (with `posthog-node`) architecture that doesn't exist — the actual setup (from the PostHog Wizard) is the single `instrumentation-client.ts` file, client-only. Flagged in `/review` as doc/reality drift, not fixed this session (out of scope of what was asked).
- `context/code-standards.md` also documents the env var as `NEXT_PUBLIC_POSTHOG_KEY`; the real one in `.env.local` and code is `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`. Also flagged, also not fixed this session.

## Next session starts with

Building the actual `/dashboard` route (per `context/build-plan.md`'s next un-started feature after Auth) — once it exists, flip the two `TODO`-marked redirects in `app/(auth)/callback/route.ts` and `app/page.tsx` back from `/` to `/dashboard`.

## Open questions

- Should `context/architecture.md`/`build-plan.md` be updated to describe the actual wizard-generated `instrumentation-client.ts` PostHog setup (client-only, no `posthog-node`), or should the code be migrated to match the originally-planned `lib/posthog-client.ts`/`lib/posthog-server.ts` split? Not decided — surfaced in review, left as-is.
- Should the env var name mismatch (`NEXT_PUBLIC_POSTHOG_KEY` in docs vs `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` in reality) be reconciled by renaming the code or the doc? Not decided.
- Should the "Dashboard" nav links in Navbar/Footer be changed too (they still point at the nonexistent `/dashboard` and will 404 if clicked), or left alone since the real fix is building the dashboard page?
