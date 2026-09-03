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

## Shared Patterns

- `.bg-hero-gradient` (globals.css) — soft multi-tone radial mesh built from `--color-accent-light`, `--color-info-light`, `--color-accent-muted` over `--color-surface`. Used by Hero and CTA only.
- Feature-item "active rail" pattern: `border-t border-border-light` wrapper, each item `border-b border-border-light py-6 pl-6` plus a 2px left accent border on the highlighted item only. Reuse this shape for any future "stacked value prop" list before inventing a new one.
