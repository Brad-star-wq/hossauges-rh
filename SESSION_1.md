# SESSION 1 — Scaffold + Design System

## Goal
A running Next.js app with the full token system, fonts, layout shell, and the shared components every later session reuses.

## Steps
1. `npx create-next-app@latest hossauges` — TypeScript, Tailwind, App Router, src dir off, `@/*` alias.
2. Install: `framer-motion`, `clsx`, `tailwind-merge`. (Supabase/Resend wait until Session 5/6.)
3. Fonts via `next/font/google`: Big Shoulders Display (700, 800), Archivo (400, 500, 600), JetBrains Mono (500). Expose as CSS vars `--font-display`, `--font-body`, `--font-mono`.
4. Tailwind config: add all SPEC §2 color tokens, font families, and a `container` default (max-w-6xl, px-5).
5. Global CSS: cream body, char text, paper-grain utility class (inline SVG noise, 3% opacity), selection color ember/cream, visible focus ring (2px ember offset).
6. Shared components in `components/`:
   - `Nav` — sticky, cream/95 blur, badge wordmark left (text version for now), links: Drop / Flavors / Merch / About. Mobile: full-screen overlay menu with staggered link reveal.
   - `Footer` — navy-deep, logo placeholder, links, mono line `EST. 2024 — COLUMBIA, SC`, notify-me field (visual only this session).
   - `Section` — wrapper handling spacing + scroll-reveal (Framer `whileInView`, once, fade + y:24, honors reduced motion).
   - `Eyebrow` — mono, uppercase, tracked, ember dot prefix.
   - `Stamp` — angled `SOLD OUT` rubber-stamp overlay (ember border + text, slight rotation, stamp-in scale animation).
   - `Ticker` — CSS marquee, accepts string list, pause on hover, duplicated track for seamless loop.
   - `Placeholder` — navy or cream block, mono label, takes aspect ratio prop.
   - `Button` — primary (ember bg, navy on hover), secondary (navy outline). Mono uppercase labels.
7. `app/layout.tsx`: fonts, Nav, Footer, metadata shell (title template `%s — Hossauges`).
8. Stub routes so nav works: `/`, `/drop`, `/flavors`, `/merch`, `/about` each render an `Eyebrow` + heading.

## Acceptance
- [ ] `npm run dev` clean; all 5 routes render with Nav/Footer.
- [ ] Tokens visible: cream bg, navy headings in Big Shoulders, mono eyebrows.
- [ ] Mobile menu works at 375px; focus states visible; reduced motion kills reveals.
- [ ] `npm run build` passes.
