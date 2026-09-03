# Memory — Feature 06 Profile Save Logic (reviewed + hardened)

Last updated: 2026-09-03 17:43 IST

## What was built

Feature 06 (Profile Save Logic) wired the static Feature 05 profile UI to real InsForge DB/Storage:

- `actions/profile.ts` — two Server Actions: `uploadResume(formData)` (validates PDF type + 5MB limit, uploads to `resumes/{user_id}/resume.pdf` via `insforge.storage.from("resumes").upload()`, updates `profiles.resume_pdf_url`) and `saveProfile(payload)` (writes all profile fields, computes `is_complete`, insert-or-update against the `profiles` table).
- `lib/profile-types.ts` — `Profile`, `ProfileFormData`, `WorkExperienceItem`, `EducationDetails` types plus `calculateProfileCompletion()` (11-check completion scorer, includes resume upload as a required field).
- `app/profile/page.tsx` — Server Component, pre-fetches the real profile row via `createInsforgeServer()`, passes real `completionPercent`/`missingFields`/`initialData` into the client components.
- `components/profile/ProfileForm.tsx` — client component owning form state; calls `saveProfile`, fires PostHog `profile_completed` on the false→true transition only (`justCompleted`), success/error toast + inline status banner.
- `components/profile/ResumeUpload.tsx` — drag-and-drop uploader calling `uploadResume`, client + server-side validation.
- `components/ui/select.tsx` — extended to accept `SelectOption = string | {label, value}` so a field can display a friendly label while submitting a different stored value.

## Decisions made

- InsForge SDK's `storage.upload()` has no `upsert` param — it always replaces-by-key (confirmed via SDK `.d.ts`: "Standard PUT semantics: uploading to an existing key replaces the file"). Build-plan's "upsert: true" is describing that behavior, not a literal option — no fix needed there.
- `profiles.id` has no CHECK constraint on the enum-like text columns (unlike `agent_runs.status`/`jobs.source`/`jobs.match_score`/`agent_logs.level`, which do), so casing mismatches don't error at the DB layer — they fail silently downstream instead. This is why the enum-casing review finding mattered even though nothing crashed.

## Problems solved

- **Enum casing mismatch (critical, fixed).** `architecture.md`'s `profiles` schema documents lowercase snake_case enum values (`junior/mid/senior/lead`, `remote/onsite/hybrid/any`, `citizen/permanent_resident/visa_required`, `formal/casual/enthusiastic`) for `experience_level`, `remote_preference`, `work_authorization`, `cover_letter_tone`. The original `ProfileForm.tsx` `<Select>`s used Title Case values identical to their labels (`"Mid"`, `"Any"`, `"Citizen"`, `"Enthusiastic"`) and wrote them straight to the DB unnormalized. Fixed by giving `Select` a `{label, value}` option shape and updating the four enum option arrays in `ProfileForm.tsx` to submit the documented lowercase values while still displaying Title Case labels. This had to be fixed *before* Feature 07 (GPT-4o resume extraction) and Feature 13 (company research synthesis), both of which read `experience_level` etc. expecting the documented lowercase values — would have silently broken string-matching otherwise.
- **Stale Feature-05 mock/demo literals (important, fixed).** `ProfileForm.tsx` still had `"Faizan Ali"`, a `"Vercel"` mock work-experience row, `linkedin.com/in/faizan`, `github.com/jsmastery`, `"Frontend Engineer, React Developer"`, `"Computer Science"` as fallback defaults, and `app/profile/page.tsx` had a `"faizan@jsmastery.pro"` email fallback. These were leftover from Feature 05's static-UI-only pass and never cleaned up when Feature 06 wired real data. All removed — fields now default to real empty state (with placeholder text where useful) instead of demo content. Verified clean with `tsc --noEmit` and `eslint`.
- **Private storage bucket 401 on resume view (fixed).** The `resumes` bucket is private (`public: false`), which caused direct external URLs (`https://...insforge.app/...`) clicked via `<a target="_blank">` to fail with `AUTH_INVALID_CREDENTIALS` (no Bearer token passed on external tab navigation). Fixed by adding an authenticated proxy route at `app/api/resume/view/route.ts` that uses `createInsforgeServer()` + `insforge.storage.from("resumes").download()` to stream the PDF inline, and updating `ResumeUpload.tsx` to link to `/api/resume/view`.

## Current state

- Feature 06 is complete, reviewed (3-layer review via `/review`), and both flagged issues are fixed and verified (typecheck + lint clean).
- `progress-tracker.md` already marks 06 as done — no further update needed there for this session's fixes (they're corrections within the same feature, not scope changes).
- Feature 03 (PostHog Initialization) remains open/partial from an earlier session — not touched this session, still pending before Phase 2 features start firing more server-side events.

## Next session starts with

Feature 07 — AI Profile Extraction from Resume: "Extract from Resume" button appears after upload, GPT-4o reads the parsed PDF text (`pdf-parse`) and returns structured JSON matching profile field names (including the now-corrected lowercase enum values for `experience_level`/`work_authorization`/`remote_preference`/`cover_letter_tone`), auto-fills the form for user review before manual save. Handle empty/short extracted text with the specified error message.

## Open questions

- None blocking. Feature 03 (PostHog init) is still flagged as unfinished from a prior session and should be closed out before Phase 2 features rely heavily on server-side event firing.
