# CHANGES — Round 5 (Pre-order Pop-up + dashboard section)

Read CLAUDE.md and SPEC.md first. This adds a NEW feature that is separate from the weekly batch: a **pre-order pop-up** that appears when someone opens the homepage, plus a dedicated dashboard area to manage it. Do not entangle this with the batch/drop system — it is its own thing.

**Hard rules:**
1. Adds a **migration (005)**. Write it, then PAUSE and tell me to apply it in Supabase (same as 001–004) before relying on it.
2. **Do NOT commit or push.** Stop when `npm run build` is clean, summarize, and let me test locally.
3. Sequence: do this AFTER Round 4 is merged, or on top of current main — assume the saving path now works.

---

## 1. The Pre-order Pop-up (public, homepage)
- On the homepage, on load (both mobile and desktop, before the user scrolls), show a centered modal pop-up **if** the pre-order pop-up is enabled in the dashboard AND has at least one item. If disabled or empty, show nothing (normal homepage).
- **Contents:**
  - An **editable title** at the top (set in the dashboard, e.g. "Holiday Pre-Order" — owners control the text).
  - A clean, aesthetic menu of the pre-order items: each item shows a **small photo + name only** (no prices/descriptions — keep it minimal and good-looking). **Support 1 to 9 items, and the layout must adapt to the count so the boxes always fill the space — no awkward empty cells.** Use a count-aware column choice: 1→1 col, 2→2, 3→3, 4→2×2, 5–9→ up to 3 across with centered/filled rows. On mobile cap at 2 columns so thumbnails never get tiny. Smaller thumbnails with generous whitespace. Match the approved interactive mockup `preorder-popup-mockup.html` (use its 1/2/5/9 states as the reference for how each count should look). Mobile-first.
  - A bottom call-to-action button: **"Sign up for pre-order"** (see #2).
  - An **X / close** button so visitors can dismiss it and browse the site freely.
- **Behavior:**
  - Show **once per browser session** (use sessionStorage) so it doesn't reappear on every page navigation within a visit. (If you think once-per-day via localStorage is better, leave a clearly commented constant so I can switch it.)
  - Accessible: trap focus while open, close on Esc, lock background scroll while open, return focus on close, respect `prefers-reduced-motion` for the entrance animation.
  - On-brand styling (cream/paper card, navy, ember accent, the established fonts). Aesthetic and minimal — this is a first impression.

## 2. "Sign up for pre-order" action
- Clicking the CTA opens a short pre-order **signup form** (can be a second step inside the same modal, or a dedicated `/preorder` page — pick the cleaner option and note it).
- Fields: name, contact (phone or email), and which item(s) they want (let them pick from the pre-order items; quantity optional).
- On submit: write a `preorder_signups` row AND email the owners (reuse the existing Resend email path; subject like "New pre-order — {name}"). Show a friendly success state.
- This must actually persist and email (verify end-to-end, same standard as the reserve form).

## 3. Dashboard — new "Pre-order Pop-ups" section
Add a new tab in `/admin` called **Pre-order Pop-ups**. Phone-first, plain labels, confirm on delete. It manages:
- **Enable/disable toggle** — turns the homepage pop-up on or off.
- **Editable title** — the pop-up's heading text.
- **Pre-order menu items** — add / edit / delete / reorder items, each with a **name + photo upload** (compress images as elsewhere, thumbnail preview). This is the menu shown in the pop-up. **Cap at 9 items** (stop allowing new ones past 9, with a small note).
- **Pre-order signups** — a list/table of who signed up (name, contact, item(s), date), newest first, with a "contacted" checkbox and a copy-contacts option. Mirror the Submissions tab style.
- Everything here must persist (writes via service-role server actions; revalidate the homepage after changes so the live pop-up updates).

## 4. Migration 005
Add `supabase/migrations/005_preorder.sql`:
```sql
preorder_popup (
  id int primary key default 1,          -- single config row
  enabled boolean default false,
  title text default '',
  updated_at timestamptz default now()
)
preorder_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  sort int default 0,
  created_at timestamptz default now()
)
preorder_signups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  items text,                            -- selected item names / notes
  contacted boolean default false,
  created_at timestamptz default now()
)
```
- RLS: public SELECT on `preorder_popup` + `preorder_items`; public INSERT on `preorder_signups` (no public select); all owner writes via service role.
- Seed one `preorder_popup` row (enabled = false) so the config always exists.

---

## Acceptance
- [ ] Homepage pop-up appears on load (mobile + desktop) only when enabled and non-empty; X dismisses; shows once per session.
- [ ] Pop-up shows the editable title + a clean photo-and-name menu (smaller thumbs, generous whitespace) that **adapts its columns to the item count (1–9) so boxes always fill the space with no empty cells**, matching the approved mockup; capped at 2 columns on mobile.
- [ ] "Sign up for pre-order" collects name/contact/items, persists a `preorder_signups` row, and emails the owners.
- [ ] Dashboard "Pre-order Pop-ups" tab: toggle on/off, edit title, add/reorder/delete items with photos, view signups — all persist and update the live pop-up.
- [ ] Accessible (focus trap, Esc, scroll lock, reduced motion).
- [ ] Migration 005 written and (after I apply it) working.
- [ ] `npm run build` clean. **No commit, no push — stopped for my review.**
