# UI Registry

Living document. Updated after every component is built. Read this before building any new component — match existing patterns exactly before inventing new ones.

---

## How to Use

Before building any component:

1. Check if a similar component already exists here
2. If yes — match its exact classes
3. If no — build it following ui-rules.md and ui-tokens.md, then add it here

After building any component — update this file with the component name, file path, and exact classes used.

---

## Components

### Button

`components/ui/button.tsx`

Renders a `next/link` styled as a button. Not a shadcn/ui primitive — hand-rolled because the homepage only needed link-buttons. Revisit once a feature needs a real `<button>` (disabled/loading states, form submit).

Props: `href`, `variant: "dark" | "dark-outline" | "slate"`, `size?: "sm" | "md"` (default `"md"`), `icon?`.

- `dark` — `bg-text-darker text-white hover:bg-text-darkest` — marketing primary CTA (Hero, CTA sections). Matches sampled design pixel `#36394A`, not the app's `--color-accent` purple.
- `dark-outline` — `bg-surface/90 backdrop-blur-sm border border-border text-text-primary hover:bg-surface-secondary` — marketing secondary CTA.
- `slate` — `bg-text-slate text-white hover:bg-text-darkest` — navbar CTA. Matches sampled design pixel `#272835`.
- `size="md"` — `px-6 py-3 text-base rounded-lg` (Hero/CTA buttons).
- `size="sm"` — `px-4 py-2 text-sm rounded-md` (Navbar button).

### Navbar

`components/layout/Navbar.tsx`

`h-16 w-full bg-surface px-6 flex items-center justify-between`. Logo via `next/image` (`/logo.png`, `h-9 w-auto`). Nav links `text-sm font-medium text-text-dark hover:text-accent`. CTA uses `Button` `variant="slate" size="sm"`.

### Footer

`components/layout/Footer.tsx`

`w-full border-t border-border bg-surface px-6 py-8`, content capped `max-w-[1440px] mx-auto`. Same logo treatment as Navbar. Links `text-sm font-medium text-text-secondary hover:text-accent`.

### Hero

`components/homepage/Hero.tsx`

Gradient card: `bg-hero-gradient w-full rounded-2xl border border-border px-6 py-20 text-center` (see `.bg-hero-gradient` in globals.css — layered `radial-gradient`s built only from existing color tokens, no new hex). Headline `text-4xl md:text-5xl font-bold text-text-primary`. Subhead `text-base text-text-secondary max-w-xl mx-auto`. Two `Button`s (`dark` with `lucide-react` `Play` icon, `dark-outline`). Dashboard preview: `/images/dashboard-demo.png` inside `rounded-2xl border border-border bg-surface p-6`.

### HowItWorks

`components/homepage/HowItWorks.tsx`

First alternating feature block ("Manage Your Job Search With Ease"). Two-column grid, text left / image right. Stacked feature items with a left border rail; the active item gets `border-l-2 border-l-accent-dark` (sampled `#5E4CFF`, matches `--color-accent-dark` exactly), inactive items `border-l border-l-border-light`. Image: `/images/jobs-lists.png` inside `rounded-2xl bg-surface-muted p-6`.

### Features

`components/homepage/Features.tsx`

Second alternating feature block ("Apply With More Confidence, Every Time"). Same item pattern as HowItWorks but mirrored (image left / text right via `order-*` classes) and the active item uses `border-l-2 border-l-success-dark` (sampled `#1D7C51`, closest existing token `--color-success-dark`). Image: `/images/agnet-log.png`.

### Testimonial

`components/homepage/Testimonial.tsx`

Centered quote block. Eyebrow label `text-xs font-semibold tracking-wide text-accent uppercase`. Quote `text-2xl font-medium text-text-primary max-w-3xl`. Avatar `/images/user-icon.png` at `40x40 rounded-lg`.

### CTA

`components/homepage/CTA.tsx`

Bottom banner — same `bg-hero-gradient` card treatment and same `Button` pair as Hero, shorter copy.

---

### Form primitives (Input / Select / Textarea / TagInput / FormButton / FieldLabel / ProgressRing)

`components/ui/{input,select,textarea,tag-input,form-button,field-label,progress-ring}.tsx`

First real form components in the app — `Button` (above) is link-only, these are actual `<input>`/`<select>`/`<button>` elements for the Profile page and beyond.

- `FieldLabel` — shared label wrapper: `mb-1.5 block text-xs font-medium tracking-wide text-text-secondary uppercase`. Every labeled field uses this, don't reinvent it inline.
- `Input` / `Select` / `Textarea` — same field chrome: `border border-border bg-surface rounded-md px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent`. `disabled:` gets `bg-surface-secondary text-text-muted cursor-not-allowed` (used for the read-only Email field). `Select` adds a `lucide-react` `ChevronDown` absolutely positioned at `right-3`, native `<select>` underneath with `appearance-none`.
- `TagInput` — text field + `Add` `FormButton` inline, pills below as `rounded-full bg-surface-secondary px-3 py-1 text-sm font-medium` with an `X` icon button to remove. Client component, controlled via `tags`/`onChange` props — parent owns the array state (see `ProfileForm`).
- `FormButton` — real `<button type="button">`, variants `primary` (`bg-accent text-accent-foreground hover:bg-accent-dark`), `secondary` (`bg-surface border border-border hover:bg-surface-secondary`), `ghost`. Use this (not `Button`) for any non-navigation action — Save, Add, Select Resume, Generate, etc.
- `ProgressRing` — SVG circular progress, `stroke-linecap: round`, track at 15% opacity of the fill color. Fill color scales green (`--color-success`, ≥80%) / red (`--color-error`, ≥50%) / orange (`--color-warning`, <50%). Percent label centered via absolutely-positioned `<span>`.

### Profile page sections

`components/profile/{ProfileAttentionBanner,ResumeUpload,ProfileForm}.tsx`, route `app/profile/page.tsx`

- `ProfileAttentionBanner` — card with `AlertCircle` (lucide) + heading, missing-field pills as `rounded-full bg-error/10 text-error text-xs uppercase`, `ProgressRing` right-aligned. Take `completionPercent`/`missingFields` as props — currently hardcoded mock values in the page (Feature 06 will compute real ones).
- `ResumeUpload` — dashed dropzone card (`border-dashed border-border-muted bg-surface-secondary`), visual only — no upload wiring yet.
- `ProfileForm` — single client component owning all form state (skills/industries tags, work-experience rows). Sections separated by `border-t border-border-light pt-6` inside one card, each with a `text-sm font-semibold` sub-heading. Work Experience caps at 3 roles (build-plan spec) via `MAX_WORK_EXPERIENCE_ROLES`; "Currently working here" checkbox disables the End Date input and clears it. All fields pre-filled with static mock values except `email`, which comes from the real session user and is read-only.
- Reuse this "card containing multiple `border-t`-separated sub-sections" shape for any future long-form settings/profile-style page before inventing a new layout.

---

## Shared Patterns

- `.bg-hero-gradient` (globals.css) — soft multi-tone radial mesh built from `--color-accent-light`, `--color-info-light`, `--color-accent-muted` over `--color-surface`. Used by Hero and CTA only.
- Feature-item "active rail" pattern: `border-t border-border-light` wrapper, each item `border-b border-border-light py-6 pl-6` plus a 2px left accent border on the highlighted item only. Reuse this shape for any future "stacked value prop" list before inventing a new one.
