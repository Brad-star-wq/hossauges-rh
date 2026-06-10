# HOSSAUGES.COM — Product Spec (Rev. 1)

Custom sausage company in Columbia, SC (est. 2024). Two non-technical owners. ~100 lbs/week, two flavors per weekly drop, sold in packs of 3. Sausage drops are **interest-based** (reserve form), merch is **purchased** (Square checkout links). The site must look like it was built by a senior studio: animated, modern Americana, maximum polish.

---

## 1. Tech stack (locked)

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) + TypeScript |
| Styling | Tailwind CSS |
| Animation | Framer Motion (scroll reveals, page transitions, micro-interactions) |
| Database | Supabase (Postgres + Storage + RLS) |
| Email | Resend (free tier) → notification to hossaugessc@outlook.com |
| Payments | Square checkout links (merch only, pasted into dashboard — no Square API code) |
| Hosting | Vercel, custom domain (already owned) |
| Admin auth | Shared password (env var `ADMIN_PASSWORD`) → signed httpOnly cookie session |

---

## 2. Design system — "Modern Americana Butcher"

The brand is locked by the logo: navy badge, orange-red stripes, star, cream. The site should feel like a craft butcher shop with a serious design budget — NOT a patriotic template and NOT a generic SaaS landing page.

### Color tokens
```
--cream:        #F7F3EA   (page background)
--paper:        #FFFDF7   (cards / raised surfaces)
--navy:         #2C4A66   (primary — pulled from logo badge)
--navy-deep:    #1E3349   (footers, dark sections, hero overlay)
--ember:        #E2552C   (accent — logo orange-red; CTAs, hovers, ticker)
--smoke:        #6B7280   (secondary text)
--char:         #20242B   (body text on cream)
--sage-wash:    #E8EBE4   (alt section background, subtle)
```
Rule: ember is rationed. CTAs, sold-out stamps, ticker, hover states only. Most of the page is cream/navy.

### Typography
- **Display:** Big Shoulders Display (700/800, condensed, all-caps with wide tracking for eyebrows) — echoes the logo's condensed badge type without copying it.
- **Body:** Archivo (400/500/600) — sturdy grotesque, reads "workshop," not "startup."
- **Utility/labels:** JetBrains Mono (500, small caps usage for prices, dates, pack counts — the "meat label" voice).
- Type scale: hero clamp(3rem→6.5rem); section heads clamp(2rem→3.5rem); generous line-height on body (1.7).

### Signature element — **The Drop Board**
The current week's drop is rendered as a large butcher-counter board: a paper-textured card styled after their real vacuum-pack labels (mono type, date stamp, flavor name in display caps), with two flavor "tags" hanging off it. Sold-out flavors get an angled rubber-stamp `SOLD OUT` overlay in ember with a stamp-in animation. This board appears on Home (condensed) and the Drop page (full). It is the one loud thing; everything else stays disciplined.

### Texture & detail
- Subtle paper grain on cream sections (CSS noise, ~3% opacity).
- 1px navy hairline borders on cards; 2px on the Drop Board.
- Star + stripe motifs used sparingly as dividers (pulled from logo, redrawn as SVG).
- Footer: navy-deep with the badge logo, mono small print "EST. 2024 — COLUMBIA, SC".

### Motion (Framer Motion)
- Page-load: hero headline rises in staggered words; Drop Board "thuds" in with slight rotation settle.
- Scroll: section reveals (fade + 24px rise, once), flavor cards stagger.
- Marquee ticker of all-time flavors (pure CSS animation, pauses on hover).
- Hover: flavor cards lift 4px + border goes ember; merch cards zoom photo 1.03.
- `prefers-reduced-motion`: all of the above collapse to simple fades.
- Performance rule: no scroll-jacking, no heavy parallax libraries, 60fps or cut it.

---

## 3. Public pages

### `/` Home
1. **Hero** — full-bleed photo (placeholder: dark grill image), navy-deep overlay, staggered headline: "SMALL-BATCH SAUSAGE. COLUMBIA, SC." Sub: one line. CTA: "See This Week's Drop" (ember).
2. **Drop Board (condensed)** — current drop, 2 flavor tags, sold-out stamps, link to full drop page.
3. **Flavor ticker** — marquee of every flavor ever made.
4. **How it works** — 3 steps in mono-labeled cards: "We post the drop / You reserve / You pick up." Brief.
5. **Merch teaser** — 3 items, link to shop.
6. **Story teaser** — one short paragraph + photo, link to About.
7. **Notify-me strip** — single email field: "Get drop alerts." (writes to email_list).

### `/drop` This Week's Drop
- Full Drop Board: week label (e.g., "WEEK OF JUNE 9"), each flavor with photo, meat type tag (100% PORK / BEEF & PORK), brief description, price per 3-pack, sold-out stamp when toggled.
- **Reserve form** per drop: name, phone or email, flavor (select), quantity (packs). Submits → Supabase + Resend email to owners. Success state: "You're on the list — we'll text/email you to confirm pickup."
- Sold-out flavors are not selectable in the form.
- If no active drop: empty state — "Next drop is in the works." + notify-me field.

### `/flavors` Flavor Archive
- Every flavor ever made, grouped 100% Pork vs Beef & Pork Mix, as animated cards (auto-built from all archived + active drop flavors, deduped, with "made × N times" mono badge).
- "Want it back?" — each card has a small vote button (count stored, visible in dashboard; no login, localStorage de-dupe is fine).

### `/merch` Merch
- Grid of merch cards from DB: photo, name, price, sizes note. "Buy" button → opens the item's Square checkout link in new tab.
- Out-of-stock handled by Square; dashboard has an active/hidden toggle as backup.

### `/about` About
- Brief story (est. 2024, two friends, ~100 lbs a week), process strip (grind → stuff → smoke → pack day) with photo placeholders, Instagram link.

### Footer (global)
- Badge logo, nav links, email, Instagram, mono legal line. Notify-me field repeated.

Copy rule: **brief everywhere.** No paragraph over ~3 sentences.

---

## 4. Admin dashboard `/admin`

Login: single shared password → cookie session (7 days). All pages mobile-first — owners will use phones.

### Tabs
1. **Drop** — edit current drop: week label, per-flavor fields (name, meat type, description, price, photo upload, sold-out toggle). Buttons: "Publish new drop" (archives the current one automatically and starts a fresh one) and "Save changes". Big, obvious, labeled in plain words.
2. **Merch** — list with add/edit/delete: name, price, sizes note, photo upload, Square link (paste), active toggle.
3. **Submissions** — table of reserve-form entries, newest first, filter by drop, shows name/contact/flavor/qty/date. Mark-as-contacted checkbox. Below it: the notify-me email list with copy-all button.

### Dashboard rules
- Every destructive action confirms first.
- Photo upload: direct to Supabase Storage, auto-compressed client-side (browser-image-compression), preview shown.
- Empty states explain what to do ("No merch yet — add your first item.").
- Zero jargon. "Sold out" not "inventory status".

---

## 5. Database schema (Supabase)

```sql
drops (
  id uuid pk, week_label text, status text check in ('active','archived'),
  published_at timestamptz, created_at timestamptz default now()
)
drop_flavors (
  id uuid pk, drop_id uuid fk -> drops, name text, meat_type text check in ('pork','beef_pork'),
  description text, price_cents int, sold_out bool default false,
  photo_url text, votes int default 0, created_at timestamptz
)
merch_items (
  id uuid pk, name text, price_cents int, sizes_note text,
  photo_url text, square_link text, active bool default true,
  sort int default 0, created_at timestamptz
)
interest_submissions (
  id uuid pk, drop_id uuid fk, flavor_id uuid fk, name text,
  contact text, quantity int, contacted bool default false, created_at timestamptz
)
email_list ( id uuid pk, email text unique, created_at timestamptz )
```
- RLS: public read on drops/drop_flavors/merch_items (active only); inserts allowed on interest_submissions/email_list; all writes otherwise via service role from server actions behind admin auth.
- Storage bucket `photos`, public read.
- Exactly one drop has status `active` at a time (enforced in the publish server action).

---

## 6. Integrations

- **Resend:** on each reserve submission, send a clean email to hossaugessc@outlook.com (flavor, name, contact, qty, drop). From a verified domain address once DNS is set; sandbox sender until then.
- **Square:** no code. Owners create items in the free Square app → copy checkout link → paste into Merch dashboard. Full owner instructions in `SQUARE_SETUP.md`.
- Email blasts to the notify list: **out of scope for v1** (list is collected now; blasts later).

## 7. Quality floor (non-negotiable)
- Mobile-first, flawless at 375px.
- Lighthouse: 90+ performance, 100 accessibility/SEO targets.
- next/image everywhere; fonts via next/font; OG image with the badge.
- Visible focus states; reduced motion respected.
- Placeholder images: solid navy/cream blocks with mono labels ("HERO PHOTO", "FLAVOR PHOTO") sized to final aspect ratios so real photos drop in with zero layout shift.

## 8. Out of scope (v1)
Email blasts, Square API/embedded checkout, customer accounts, online sausage payment, blog.
