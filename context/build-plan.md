# Build Plan

## Core Principle

Full page UI built with mock data first — verified visually before any logic is written. Then functionality is built and wired to the UI step by step. Every feature must be visible and testable before moving to the next. No invisible backend phases.

---

## Phase 1 — Foundation

### 01 Homepage

Build the complete homepage UI.

**UI:**

- Navbar — logo, Dashboard, Find Jobs, Profile links, Start for free button
- Hero section — headline, subheadline, Get Started CTA and Find Your First Match CTA
- Dashboard preview screenshot embedded below hero
- Features section — three value props with descriptions
- Testimonial section
- Bottom CTA section
- Footer

**Logic:**

- Get Started and Start for free → /login if not authenticated, /dashboard if authenticated

---

### 02 Auth

InsForge authentication — Google and GitHub OAuth.

**UI:**

- Login page — Google OAuth button, GitHub OAuth button

**Logic:**

- Google OAuth via InsForge
- GitHub OAuth via InsForge
- OAuth callback handler
- Session management
- Middleware protecting /dashboard, /profile, /find-jobs, /find-jobs/[id]
- After login → redirect to /dashboard

---

### 03 PostHog Initialization

Set up PostHog before any events fire. Must be done before any agent features.

**Logic:**

- Create lib/posthog-client.ts — PostHog browser client, initialized with NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST
- Create lib/posthog-server.ts — PostHog server client with flushAt: 1 and flushInterval: 0
- Initialize PostHog in root app layout — wraps entire app
- posthog.identify() called after successful login with user ID
- posthog.reset() called on logout

---

### 04 Database Schema

All InsForge tables and storage bucket created before any data is written.

**Logic:**

- Create `profiles` table with all columns from architecture.md
- Create `agent_runs` table
- Create `jobs` table with all columns including:
  - tailored fields
  - company_research jsonb column
  - source values: 'search' | 'url'
- Create `agent_logs` table
- Create `resumes` storage bucket with authenticated access only
- Row level security policies on all four tables — always filter by user_id

---

## Phase 2 — Profile Page

### 05 Profile Page — Full UI

Build the complete profile page UI with mock data. No save logic yet.

**UI:**

- Profile needs attention banner at top — completion percentage ring, missing field tags highlighted (e.g. PHONE, LOCATION, EDUCATION)
- Resume section — drag and drop upload area, "Click to upload or drag and drop" text, PDF only note, Select Resume button, Generate Resume from Profile button below
- Profile Information form with clearly labeled sections:
  - Personal Info — Full Name, Email (pre-filled, not editable), Phone Number, Location, LinkedIn URL, Portfolio/GitHub, Work Authorization dropdown
  - Professional Info — Current Job Title, Experience Level dropdown, Years of Experience, Skills tag input with Add button, Industries tag input with Add button
  - Work Experience — up to 3 roles, each with Company Name, Job Title, Start Date, End Date, Currently working here checkbox, Key Responsibilities textarea. Add role button.
  - Education — Highest Degree dropdown, Field of Study, Institution Name, Graduation Year
  - Job Preferences — Job Titles Seeking, Remote Preference dropdown, Salary Expectation, Preferred Locations, Cover Letter Tone dropdown
- Save Profile button at bottom

---

### 06 Profile Save Logic

Wire profile form to InsForge DB.

**Logic:**

- Server Action in actions/profile.ts saves all form fields to profiles table
- Resume PDF uploaded to InsForge Storage at resumes/{user_id}/resume.pdf with upsert: true
- resume_pdf_url saved to profiles table after upload
- is_complete set to true when all required fields are filled
- Completion percentage and missing fields calculated and saved
- Form pre-fills with existing data on return visits
- revalidatePath('/profile') called after save

---

### 07 AI Profile Extraction from Resume

Extract from Resume button — GPT-4o reads uploaded PDF and auto-fills profile form fields.

**UI:**

- Extract from Resume button appears after resume is uploaded
- Loading state while processing
- Form fields populate automatically after extraction
- User reviews and edits if needed before saving

**Logic:**

- pdf-parse extracts raw text from uploaded PDF buffer
- If extracted text is empty or too short — return error: "Could not extract text from this PDF. Please try a different file."
- GPT-4o reads extracted text and returns structured JSON matching all profile field names
- Form fields populated with extracted data
- User saves manually after reviewing

---

### 08 Resume PDF Generation from Profile

Generate a clean professional PDF resume from current profile data, following the layout in `public/2025-template_bullet.docx` (Harvard OCS-style template). Reuses the existing `lib/ai-extraction.ts` provider abstraction (Anthropic-first, OpenRouter-fallback, free-tier model rotation) — no new provider code, no hardcoded single model.

**Template layout (`public/2025-template_bullet.docx`) — the exact structure `ResumePdfDocument.tsx` must reproduce:**

- **Header** — centered: Full Name (bold, larger) → Street Address • City, State Zip • Email • Phone, all on one line
- **Section headers** (bold, centered, with a bottom rule beneath): `Education`, `Experience`, `Leadership & Activities`, `Skills & Interests` — in that order. Our data has no leadership/activities source, so that section is omitted entirely rather than rendered empty (see Decisions below)
- **Per-entry row structure**, repeated for each Education and Experience item:
  - Line 1: **Org/School name** (bold, left-aligned) with the City/State right-aligned on the same line (tab-aligned in the template; a flex row with `justifyContent: space-between` in React-PDF)
  - Line 2: *Degree/Position title* (italic or bold per template, left-aligned) with the date range right-aligned on the same line
  - Bullet points beneath (Experience only) — one line per bullet, no personal pronouns, phrase not full sentence, action-verb-led
- **Skills & Interests section** — labeled sub-lines, not bare tags: `Technical:`, `Language:`, `Laboratory:`, `Interests:` each followed by a comma-separated list. Our profile data only populates `Technical` (from `skillsSummary`) — the other three labels are omitted when we have nothing to put after them, not printed with empty values
- No photos, icons, or colored blocks — matches the template's plain black-text-on-white, single-column, single-page layout

**UI:**

- "Generate Resume from Profile" button already exists on the profile page (Feature 05), directly under the resume upload area — currently inert, this feature wires it up
- Disabled with a tooltip ("Complete your profile first") until `is_complete` is true — the AI has nothing to write a resume from otherwise
- Loading state on click ("Generating…") while the request is in flight
- On success: resume preview link updates to the newly generated PDF, success toast/message shown
- On failure: inline error message, button re-enabled, existing resume (if any) is left untouched

**Logic:**

- `POST /api/resume/generate` (route handler, not a Server Action — returns a binary-backed URL and benefits from being callable independently of form submission)
- Load current profile row from `profiles` table for the authenticated user (session via InsForge server client, same pattern as every other authenticated route)
- Guard: if `is_complete` is false, or required fields (`full_name`, `current_title`, `work_experience`) are missing — return 400 with a clear error, do not call the AI or touch storage
- **Content generation** — calls `extractStructuredData()` from `lib/ai-extraction.ts` (same function Feature 07 uses), passing:
  - A system prompt instructing the model to act as a professional resume writer following the Harvard OCS bullet-point convention shown in the template: rewrite the candidate's raw profile data into polished, concise, ATS-friendly resume bullets — action-verb-led, quantified where possible, no personal pronouns, phrase not full sentence — no invented facts, no new employers/dates/skills, only rephrasing and tightening what's given. No professional-summary paragraph is generated — the template has no such section
  - A user prompt containing the full profile: name, contact info, current title, years of experience, skills, industries, work experience (company/title/dates/responsibilities per role), education, job preferences
  - A JSON schema (new file: `lib/resume-generation-schema.ts`, mirrors the shape of `lib/resume-extraction-schema.ts`) describing the expected output:
    ```json
    {
      "workExperience": [
        {
          "companyName": "string",
          "jobTitle": "string",
          "location": "string",
          "dateRange": "string",
          "bullets": ["string", "string", "..."]
        }
      ],
      "skillsSummary": ["string"]
    }
    ```
  - `workExperience` entries map 1:1 to the profile's existing `work_experience` array in the same order — the AI polishes language per role, it does not add or remove roles. `location` on each entry is carried through from the profile's `location` field (single field on our profile schema, not per-role) unless we decide to leave the City/State slot blank for work entries — see Assumptions
  - Temperature kept low (0.3–0.4) — this is rewriting existing facts, not creative generation
- **PDF rendering** — `@react-pdf/renderer`'s `renderToBuffer()` (new dependency, not yet installed — add alongside this feature) renders a new React-PDF document component (new file: `components/resume/ResumePdfDocument.tsx`) matching the template layout above:
  - Header: full name (bold, centered) → address/location, email, phone, LinkedIn/portfolio on one centered line (from profile, untouched by AI)
  - Education section: institution name + graduation year (right-aligned), degree + field of study on the next line — single entry, since our profile only stores one education record (template supports multiple; we render what we have)
  - Experience section: one block per `work_experience` role — company name + location (right-aligned), job title + date range (right-aligned) on the next line, AI-polished bullets beneath
  - Skills & Interests section: `Technical:` line listing the AI's `skillsSummary`; `Language:`, `Laboratory:`, `Interests:` lines omitted (no profile data source for them)
  - Leadership & Activities section omitted entirely — no profile data source
  - Single page, clean typography (Calibri or closest available React-PDF-safe font), no photos/icons — output must be ATS-parseable (real text layer, not an image)
- Rendered buffer uploaded to InsForge Storage at `resumes/{user_id}/resume.pdf` with `upsert: true` — **this overwrites whatever the user last uploaded or generated at that path**, consistent with the one-active-resume-per-user convention from Feature 06; the UI must make this overwrite expectation clear (e.g. confirm-before-generate if a user-uploaded resume already exists and hasn't been used for extraction)
- `resume_pdf_url` updated on the `profiles` table row to point at the new file (same URL shape as Feature 06's upload path, since it's the same storage key)
- `revalidatePath('/profile')` after the DB update so the profile page reflects the new resume link immediately

**PostHog event:** `resume_generated` — `{ userId, hadExistingResume: boolean }`

---

## Phase 3 — Find Jobs Page

### 09 Find Jobs Page — Full UI

Build the complete Find Jobs page UI with mock data. No logic yet.

**UI:**

- Search controls card at top:
  - JOB TITLE label + input with search icon placeholder "Frontend Engineer"
  - LOCATION label + input placeholder "Remote, New York..."
  - Find Jobs button with search icon
  - Success message area below controls — green banner: "Found 8 jobs and saved 4 strong matches."
- Job list section below:
  - Filter bar: text search input "Filter by company or role...", All Matches dropdown, Match Score sort dropdown
  - Jobs table with columns: COMPANY, ROLE, MATCH SCORE (color coded progress bar + percentage), SALARY EST., SOURCE (Search/URL badge), DATE FOUND
  - Pagination — "Showing 1 to 6 of 24 results", Previous, page numbers, Next

---

### 10 Adzuna Job Discovery

Agent calls Adzuna API to find jobs matching user's search criteria, scores them against user profile, saves to DB.

**Logic:**

- POST /api/agent/find receives jobTitle and location from client
- Call Adzuna API:
  - GET https://api.adzuna.com/v1/api/jobs/{country}/search/1
  - params: what={jobTitle}, where={location}, results_per_page=10, app_id, app_key
  - Detect country from location input — default to 'us'
- For each job returned:
  - Extract title, company, location, salary, description snippet, redirect_url
  - GPT-4o scores job against user profile:
    - matchScore — integer 0-100
    - matchReason — one paragraph explanation
    - matchedSkills — skills user has that job requires
    - missingSkills — skills job requires that user lacks
  - Save complete record to jobs table:
    - source: 'search'
    - run_id from agent_runs record
    - All structured fields saved
- Create agent_run record in DB
- After all jobs saved — update agent_run with total count, return success message to frontend

**PostHog events:** `job_search_started`, `job_found`

---

### 11 Filter + Sort + Pagination

Wire filter tabs, sort dropdown, text search, and pagination to real InsForge DB data.

**Logic:**

- All Matches tab — all jobs for current user
- High Match filter — jobs with match_score >= 70
- Low Match filter — jobs with match_score < 70
- Sort by Match Score — order by match_score descending
- Sort by Newest — order by found_at descending
- Sort by Oldest — order by found_at ascending
- Text search — filter by company name or job title (case insensitive)
- Pagination — 20 jobs per page, total count shown

---

## Phase 4 — Job Details Page

### 12 Job Details Page — Full UI

Build the complete job details page UI. Job data from DB is already available from Phase 3 — wire real data for all job info and match sections immediately. Company research section shows empty state only.

**UI:**

- Back to Jobs link
- Job header — company logo placeholder, job title, company name, match score badge with percentage, View Job Post button (links to redirect_url)
- Info cards row — Salary Est., Location, Job Type, Date Found
- AI Match Reasoning section — match reason paragraph from GPT-4o
- Required Skills vs Your Profile — matched skills as green badges, missing skills as red/orange badges
- Job Description section — description content from Adzuna
- Company Research card — empty state with Research Company button. After research: structured dossier with company overview, tech stack, culture, why this role, interview prep
- Apply Now button (links to redirect_url, opens in new tab)

---

# Feature 13 — Company Research Agent (Updated)

Agent researches the company using their public website and builds a structured dossier using a single Browserbase session. Three data sources fused together: company website content, job description from DB, user profile from DB.

**Logic:**

- POST /api/agent/research receives jobId
- Load job data from DB — extract company_name, job description, matched_skills, missing_skills
- Load user profile from DB — skills, experience, work history
- Derive company homepage URL by following the Adzuna redirect with server-side fetch() — no browser needed for this step:
  - fetch(redirect_url, { redirect: "follow" }) follows HTTP redirects natively before the browser opens
  - Use response.url as the real employer job page URL
  - Strip subdomain from response.url hostname (e.g. jobs.stripe.com → stripe.com)
  - Construct homepage URL as https://{rootDomain}
  - If response.url still contains "adzuna.com" or fetch throws — fall back to https://www.{company}.com (company name from DB)
  - If Stagehand gets no meaningful content (oneLiner and productSummary empty) — skip browser research entirely, proceed to GPT-4o synthesis with job description and profile only
- Open single Browserbase session with Stagehand
  **Stagehand homepage extraction:**

```typescript
const homepage = await stagehand.extract({
  instruction:
    "This is a company's homepage. Capture what the company actually does, who it's for, and any concrete signals (funding, customers, scale, mission, recent launches). Then find the internal links most worth visiting to research them as an employer.",
  schema: z.object({
    oneLiner: z.string().describe("What the company does in one sentence"),
    productSummary: z
      .string()
      .describe("What they build/sell and who it's for"),
    signals: z
      .array(z.string())
      .describe("Funding, notable customers, scale, mission, recent news"),
    pageLinks: z
      .array(
        z.object({
          url: z.string(),
          kind: z.enum([
            "about",
            "careers",
            "blog",
            "engineering",
            "product",
            "team",
            "other",
          ]),
        }),
      )
      .describe("Internal links worth visiting"),
  }),
});
```

If oneLiner and productSummary are empty — bail to synthesis with job description and profile only.

**Stagehand sub-page extraction (max 3 pages — prefer about/blog/engineering/product over careers):**

```typescript
const page = await stagehand.extract({
  instruction:
    "Extract substance that helps a candidate understand this company before applying: what they do, their values and how they work, the specific technologies and tools they use, notable projects or customers, and how the team operates. Ignore nav, footers, cookie banners, and generic marketing copy.",
  schema: z.object({
    keyPoints: z.array(z.string()),
    technologies: z
      .array(z.string())
      .describe("Specific languages, frameworks, tools, platforms"),
    valuesOrCulture: z
      .array(z.string())
      .describe("Stated values, working style, team norms"),
    notable: z
      .array(z.string())
      .describe("Customers, funding, scale, projects, awards"),
  }),
});
```

- Close Browserbase session after homepage + max 3 sub-pages
  **GPT-4o synthesis (runs after browser closes):**

System prompt:

```
You are a sharp career strategist preparing a candidate to apply for a specific role.
You are given (a) research collected from the company's own website, (b) the job posting,
and (c) the candidate's profile. Produce a concise, concrete briefing that gives this
specific candidate an edge for this specific role.

Rules:
- Ground every company claim in the provided research or job posting. Never invent
  funding, customers, headcount, or facts. If research was thin, infer carefully from
  the job posting and say what's inferred.
- Be specific to THIS candidate. Connect their actual skills and past work to this
  company's stack, product, and values. No generic advice that would apply to anyone.
- Turn the candidate's missing skills into a strategy: how to frame the gap honestly
  and what adjacent experience to lean on.
- Talking points and questions must reference real things from the research, the kind
  of detail that signals the candidate did their homework.
- Keep every item tight: one or two sentences. No fluff.

Return ONLY valid JSON.
```

User prompt feeds three data sources:

```
COMPANY RESEARCH (from their website): {companyResearch}
JOB POSTING: title, company, description, matched_skills, missing_skills
CANDIDATE PROFILE: current_title, years_experience, experience_level, skills, work_experience
```

Temperature: 0.4

**Dossier shape saved to jobs.company_research jsonb:**

```json
{
  "companyOverview": "string",
  "techStack": ["string"],
  "culture": ["string"],
  "whyThisRole": "string",
  "yourEdge": ["string"],
  "gapsToAddress": ["string"],
  "smartQuestions": ["string"],
  "interviewPrep": ["string"],
  "sources": ["string"]
}
```

- Save complete dossier to jobs.company_research jsonb column
- Always return a dossier — never fail silently. If browser research failed, GPT-4o synthesizes from job description and profile alone.
  **PostHog event:** `company_researched` — { userId, jobId, company }

---

## Job Details UI — Company Research Card (Updated)

The Company Research card on the job details page must render all 9 fields:

- **Company Overview** — paragraph
- **Tech Stack** — tag list
- **Culture** — bullet list
- **Why This Role** — paragraph
- **Your Edge** — bullet list (highlight — specific to this candidate)
- **Gaps to Address** — bullet list (reframed as strategy, not weaknesses)
- **Smart Questions** — bullet list (questions to ask in interview)
- **Interview Prep** — bullet list
- **Sources** — small text, links to pages researched

## Phase 5 — Dashboard

### 14 Dashboard Page — Full UI

Build the complete dashboard UI with mock data.
**UI:**

- Four stat cards: Total Jobs Found, Avg. Match Rate, Companies Researched, Cover Letters Generated — all showing mock numbers with trend indicators
- Recent Activity card — list of 5 activity entries with colored dots and timestamps
- Resume Tailoring Activity — bar chart (mock data, days of week)
- Jobs Found Over Time — line chart (mock data, days of week)
- Match Score Distribution — bar chart (mock data, score ranges 50-60%, 60-70%, 70-80%, 80-90%, 90-100%)
- Incomplete profile banner at top if profile not complete

---

### 15 Stats Bar — Real Data

Wire four stat cards to real InsForge DB data for current user.

**Logic:**

- Total Jobs Found — COUNT of jobs where user_id = current user
- Avg. Match Rate — AVG of match_score across all user jobs
- Companies Researched — COUNT of jobs where company_research IS NOT NULL and user_id = current user
- Jobs This Week — COUNT of jobs found in last 7 days

---

### 16 Recent Activity — Real Data

Wire recent activity list to real InsForge DB data for current user.

**Logic:**

- Query agent_runs table — most recent runs for current user
- Query jobs table — most recent company research entries for current user
- Merge and sort all by created_at descending — take last 5-10 entries
- Format each into human readable string:
  - agent_run completed → "Found X jobs for [jobTitle] — [time ago]"
  - company_research populated → "Researched [company] — [time ago]"
- Color coded dot per entry type — info blue, success green

---

### 17 Analytics Charts — PostHog Data

Wire three dashboard charts to real PostHog event data for current user.

**Logic:**

- Jobs Found Over Time — query PostHog for job_found events where distinctId = current userId, last 30 days, group by day
- Match Score Distribution — query PostHog for job_found events, extract matchScore property, group into ranges: 50-60, 60-70, 70-80, 80-90, 90-100
- Company Research Activity — query PostHog for company_researched events where distinctId = current userId, last 7 days, group by day
- All three charts rendered with recharts
- Empty state shown for each chart when no data exists yet

---

## Feature Count

| Phase                 | Features |
| --------------------- | -------- |
| Phase 1 — Foundation  | 4        |
| Phase 2 — Profile     | 4        |
| Phase 3 — Find Jobs   | 3        |
| Phase 4 — Job Details | 2        |
| Phase 5 — Dashboard   | 4        |
| **Total**             | **17**   |
