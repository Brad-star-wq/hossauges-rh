# CLAUDE.md — Hossauges Website

Read `SPEC.md` fully before any session. Sessions live in `SESSION_1.md` → `SESSION_8.md` and must be done in order. Do not skip ahead or merge sessions.

## What this is
Marketing + light-commerce site for Hossauges, a custom sausage company in Columbia, SC, plus a phone-friendly admin dashboard for two non-technical owners. Sausage = weekly drops with a reserve/interest form (no payment). Merch = Square checkout links.

## Stack
Next.js (App Router, TypeScript), Tailwind, Framer Motion, Supabase (DB + Storage), Resend, Vercel. No other libraries without a reason stated in the session notes.

## Hard rules
1. **Design system in SPEC.md §2 is law.** Colors, fonts (Big Shoulders Display / Archivo / JetBrains Mono via next/font), and the Drop Board signature element are locked. No gradients-on-everything, no generic SaaS look.
2. **Copy is brief.** Nothing over ~3 sentences. Plain words. Owners' voice is friendly and direct.
3. **Mobile-first.** Build every screen at 375px first, then scale up. The admin dashboard will be used almost exclusively on phones.
4. **Animations:** Framer Motion, reveal-once on scroll, respect `prefers-reduced-motion`, never block interaction, never scroll-jack.
5. **Placeholders:** solid navy/cream blocks with JetBrains Mono labels at final aspect ratios (defined in Session 1 tokens). Real photos come later — zero layout shift allowed when swapped.
6. **Admin is idiot-proof.** Plain labels ("Sold out", "Publish new drop"), confirm dialogs on anything destructive, helpful empty states.
7. **Secrets** only in `.env.local` / Vercel env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`. Never commit them.
8. **Server actions** for all writes. Public client touches only RLS-permitted reads + the two public insert paths (reserve form, notify-me).
9. End every session with the checklist in that session file passing, `npm run build` clean, and a 1-paragraph summary of what changed.

## Session map
1. Scaffold + design tokens + shared components (Nav, Footer, Section, Stamp, Ticker)
2. Home page (mock data)
3. Drop page + Flavor archive (mock data)
4. Merch + About (mock data)
5. Supabase: schema, RLS, storage, seed script
6. Wire public site to data + reserve form + notify-me + Resend email
7. Admin dashboard (auth, Drop / Merch / Submissions tabs, photo upload)
8. Polish pass: motion orchestration, SEO/OG, a11y, Lighthouse, **reset-to-empty script for clean handoff**, deploy, OWNER_GUIDE.md

## Mock data (Sessions 2–4)
Use a single `lib/mock.ts`: active drop "WEEK OF JUNE 9" with Jalapeño Pimento Brisket (beef & pork, $— per 3-pack, sold out = true) and Blueberry Gouda (pork, sold out = false); the full all-time flavor list from SPEC notes; 3 merch items (4th of July Tee $30, Dry Sage Hoodie $45, Black Camo Hoodie $50).

## All-time flavor list (for archive + ticker)
100% Pork: Blueberry Gouda, Sweet Italian, Maple Bacon Gouda, Pepperoni Pizza, Peach Cobbler, Hot Honey Apple Brie, Pineapple Al-Pastor.
Beef & Pork Mix: Jalapeño Pimento Brisket, Fajita Brisket, Philly Cheesesteak, Italian, Mexican Street Corn, Rosemary Truffle Parm, French Onion, Korean Beef Bulgogi.
