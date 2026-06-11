# CHANGES — Round 2 (mobile fixes + gallery + editable content)

Read CLAUDE.md and SPEC.md first. These changes keep the existing design system (colors, fonts, Drop Board signature) — they fix mobile problems and add dashboard-editable content. Work top to bottom. End with `npm run build` clean and a summary.

IMPORTANT: this round adds a database migration (`003_*.sql`). It must be applied to Supabase the same way 001/002 were — pause and tell me when it’s ready to run.

-----

## 1. Mobile nav menu — CRITICAL BUG

The open mobile menu overlay is transparent, so nav links render on top of the page content and overlap each other (the hero text bleeds through the links). Fix:

- Give the open menu a **fully opaque** background (`--navy-deep`), covering the entire screen (full viewport height/width, fixed position, high z-index above all content).
- Reduce the nav link font size so links don’t collide — they’re far too large. Use a sensible mobile size with clear vertical spacing between each link (comfortable tap targets, but not screen-filling).
- Ensure the page body behind the menu does not scroll or show through.
- Keep the staggered reveal animation, but it must animate over the solid background, not transparent.
- Verify at 375px: open menu → only the menu is visible, links readable and evenly spaced, nothing underneath shows through.

## 2. Remove duplicate “Get drop alerts”

The notify-me / “Get drop alerts” form currently appears twice (a large standalone section AND inside the footer). Remove the standalone section entirely. Keep it **only** in the footer.

## 3. Global rename: “The Drop” → “This Week’s Batch”

Replace the customer-facing wording everywhere:

- Nav link “DROP” → “BATCH”
- Page heading “THE DROP” → “THIS WEEK’S BATCH”
- Drop Board header “THE DROP BOARD” → “THIS WEEK’S BATCH”
- Home condensed section + any hero CTA (“See this week’s drop” → “See this week’s batch”)
- Footer link too
- **Keep the URL `/drop` unchanged** (only the visible words change). Keep internal code names as-is.

## 4. Home — shrink “How it works”

Replace the big 3-card “HOW IT WORKS” section with one small, compact component: a single slim row reading **We post · You reserve · You pick up** (with the one-line detail kept very short or as small subtext). It should take a fraction of the vertical space it does now. Mobile-first.

## 5. Home — condensed Drop Board is too big

On the home page, make the condensed batch board much smaller — styled like a compact menu/summary (flavor names + meat type + price, tight). Add a button **“See the full batch”** that goes to `/drop` (the full board with photos and descriptions). The full board on `/drop` stays as-is (just renamed per #3).

## 6. About page — rework

- Rename the eyebrow/section currently called “HOW IT’S MADE” / “GRIND TO PACK” to **“THE GALLERY”** (heading “THE GALLERY”).
- Remove the fixed GRIND / STUFF / SMOKE / PACK step labels and the 4-fixed-slot layout.
- That section becomes a **gallery** that renders whatever photos/videos are in the gallery (managed from the dashboard, see #7). Grid of media, mobile-first, lazy-loaded, lightbox optional but not required.
- The **About hero photo** (“ABOUT PHOTO” block) becomes dashboard-editable (see #7).
- The **About story paragraph** (“Two friends, a smoker…” text) becomes dashboard-editable (see #7).

## 7. Dashboard — new “Gallery & Content” tab

Add a new tab to `/admin` called **Gallery** (or “Gallery & Content”). It manages all editable site media + text:

- **Home hero photo** — upload/replace (the big homepage hero image).
- **About hero photo** — upload/replace.
- **About story paragraph** — editable text box (saves the About page paragraph).
- **Gallery items** — add / delete / reorder photos AND videos that show on the About page gallery. Support image uploads and video uploads (mp4/mov; compress images as elsewhere; videos store in Supabase Storage). Show thumbnails/previews. Reorder via a sort field.
- Same brand styling, phone-first, plain labels, confirm on delete, helpful empty states (“No gallery items yet — add your first photo or video.”).

## 8. Database — migration 003

Add `supabase/migrations/003_content_gallery.sql`:

```sql
-- key/value store for editable single fields
site_content (
  key text primary key,        -- 'home_hero_url', 'about_hero_url', 'about_paragraph'
  value text,
  updated_at timestamptz default now()
)
-- gallery media for the About page
gallery_items (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('photo','video')),
  url text not null,
  sort int default 0,
  created_at timestamptz default now()
)
```

- RLS: public SELECT on both; writes via service role only.
- Seed `site_content` with sensible defaults (empty string or current placeholder) so pages render before content is added.
- Public pages read these: home hero image from `home_hero_url` (fall back to placeholder if empty), about hero from `about_hero_url`, about paragraph from `about_paragraph`, gallery from `gallery_items` ordered by sort.
- If a media field is empty, fall back to the existing styled placeholder (no broken images, no layout shift).

-----

## Acceptance

- [ ] Mobile menu (375px): solid navy background, readable evenly-spaced links, nothing showing through. THIS IS THE KEY FIX.
- [ ] Only one notify-me form on the page (footer).
- [ ] “This Week’s Batch” everywhere customer-facing; `/drop` URL still works.
- [ ] “How it works” is now one small compact row.
- [ ] Home batch board is compact with a working “See the full batch” button.
- [ ] About page shows “THE GALLERY” pulling from gallery_items; hero + paragraph come from the DB.
- [ ] Dashboard Gallery tab: can upload home hero, about hero, edit the about paragraph, and add/delete/reorder photos + videos — all from a phone.
- [ ] Migration 003 applied; empty fields fall back to placeholders with no layout shift.
- [ ] `npm run build` clean.