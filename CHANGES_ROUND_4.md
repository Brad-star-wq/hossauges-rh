# CHANGES — Round 4 (flavor detail view + multiple photos + FIX dashboard saving)

Read CLAUDE.md and SPEC.md fully before starting. Keep the existing design system (colors, fonts, Drop Board / batch card styling). Work top to bottom.

**Two hard rules for this round:**
1. This round adds a **migration (004)** for multiple photos per flavor. Write it, then PAUSE and tell me to apply it in Supabase (same as 001–003) before relying on it.
2. **Do NOT git commit or push when finished.** Stop, run `npm run build`, give me a summary, and let me test locally first.

---

## 0. CRITICAL BUG — the dashboard isn't saving anything
Right now, edits made in `/admin` do not persist. This must be diagnosed and fixed before anything else in this round. Investigate the full write path and fix the real cause. Check, in order:
- Are the admin write **server actions** actually being called and awaited, or failing silently? Add proper error surfacing so a failed save shows an error in the UI instead of looking like it worked.
- Is the **service-role Supabase client** being used for writes (not the anon client, which RLS will block)? Confirm `SUPABASE_SERVICE_ROLE_KEY` is read server-side and present in the deployed environment.
- Are writes blocked by **RLS**? Service-role writes should bypass RLS; confirm the client is correct.
- Is the save succeeding but the change not showing because of **caching/revalidation**? If so, revalidate the affected paths (`revalidatePath`) after a successful write so the public site and dashboard reflect changes immediately.
- After fixing: prove it. Editing a flavor name, toggling sold-out, adding a flavor, and adding a merch item must each persist across a page reload AND show on the public site. Document what the root cause was in your summary.

## 1. Flavors page — show the current menu with photos
- At the top of the Flavors page, add a "THIS WEEK" section showing the current batch's flavors as cards: photo, name, meat-type chip, price or SOLD OUT.
- Each card links to that flavor's **detail view** (#2).
- Keep the existing all-time archive (the contained box from Round 3) below this section.

## 2. New sausage detail view
- Route: `/flavors/[id]` (one flavor per page).
- Shows everything about that flavor: all its photos (gallery, #3), name, meat-type chip, full description, price per 3-pack, and sold-out stamp if applicable.
- **Order/reserve right on this page:** the same reserve flow as the batch page (name, contact, quantity), pre-selected to this flavor. On submit it writes an `interest_submission` and emails the owners, exactly like the main reserve form. Reuse the existing reserve action/component — do not fork the logic.
- Sold-out flavors: show the stamp and disable the reserve action with a clear "Sold out" state.
- Back link to Flavors.

## 3. Multiple photos per flavor + swipeable gallery
- A flavor can have several photos.
- On the detail view, render photos as a **swipeable gallery on mobile** (touch/drag to move between photos) with dots or arrows; on desktop use arrows/dots. One photo = show it cleanly with no dead controls.
- Lazy-load; no layout shift; respect reduced motion.
- The flavor card thumbnails (home menu, flavors page) use the first photo.

## 4. Migration 004 — flavor photos
- Add `supabase/migrations/004_flavor_photos.sql`. Pick the cleaner of:
  - a `flavor_photos (id uuid pk, flavor_id uuid fk -> drop_flavors on delete cascade, url text, sort int default 0, created_at timestamptz default now())` table, OR
  - a `photo_urls text[]` column on `drop_flavors`.
  Prefer the **table** approach (easier ordering + delete). Migrate the existing single `photo_url` into it so current flavors keep their photo.
- RLS: public SELECT, writes via service role only.
- Update `lib/queries.ts` / admin queries to read/write the new structure. Keep `photo_url` working as "first photo" if anything still references it, or update all references.

## 5. Dashboard — manage multiple photos per flavor
- In the flavor editor (inside the Batch/Drop tab), let owners **upload multiple photos** per flavor, **reorder** them, and **delete** individual photos (confirm on delete). Show thumbnail previews.
- Same image compression as elsewhere. Phone-first, plain labels.
- This must actually persist (see #0).

---

## Acceptance
- [ ] **Root cause of the saving bug identified and fixed**; editing a flavor, toggling sold-out, adding/removing a flavor, and adding merch all persist across reload and appear on the public site. Failed saves show a visible error.
- [ ] Flavors page shows the current menu with photos, each linking to a detail view.
- [ ] `/flavors/[id]` detail view shows all info + photos and can reserve/order, reusing the existing reserve flow.
- [ ] Multiple photos per flavor; swipeable on mobile, clean on desktop; single-photo case looks right.
- [ ] Migration 004 written and (after I apply it) working; existing flavor photos preserved.
- [ ] Dashboard can add/reorder/delete multiple photos per flavor, and it persists.
- [ ] `npm run build` clean. **No commit, no push — stopped for my local review.**
