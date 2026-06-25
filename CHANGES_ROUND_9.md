# CHANGES — Round 9 (Multi-flavor reserve + finish editable text & images)

Read CLAUDE.md, SPEC.md, and CHANGES_ROUND_8_SITE_TEXT.md first. Two themes: (A) let customers reserve multiple flavors with a quantity each in one order, and (B) finish making the remaining hero/story text + images editable — including fixing strings that Round 8 was supposed to cover but didn't actually wire.

**Hard rules:**
1. Editable strings/images keep a hardcoded fallback = current content. Empty must never blank or break layout.
2. Writes via service-role server actions; `revalidatePath` after save. Reuse `site_content` (text) and the existing image-upload pattern (Supabase Storage). Add migration 007 only if a new field is truly required; otherwise reuse existing tables.
3. Do NOT commit or push. Stop when `npm run build` is clean and report what was wired and any root causes found.

## 1. Multi-flavor reserve (the order form)
Currently the reserve form is single-flavor + single-quantity. Change it so a customer can order multiple flavors with a per-flavor quantity in ONE submission.
- UI: list the current batch's flavors; each has a quantity control (default 0). The customer sets a quantity on any flavors they want (e.g. 2 of Blueberry Gouda + 4 of Jalapeño Brisket).
- Sold-out flavors: not selectable (quantity locked at 0 / disabled).
- **No quantity cap** for now (min 0, any positive integer; still validate they're integers and at least one flavor has qty > 0).
- Name + contact fields stay as-is.
- **One combined submission:** submit writes a SINGLE order capturing all chosen flavors+quantities, and sends ONE owner email listing every flavor and its quantity (e.g. "Blueberry Gouda ×2, Jalapeño Pimento Brisket ×4"). Do not create separate rows/emails per flavor.
- Data: adapt `interest_submissions` to hold multiple line items. Cleanest: a new `interest_items` child table (submission_id fk, flavor_id, flavor_name snapshot, quantity) while keeping `interest_submissions` as the parent (name, contact, created_at, contacted). If that needs a migration, that's 007 — write it and pause for me to apply. Keep the Submissions dashboard tab working: show each order with its line items.
- The flavor detail page (`/flavors/[id]`) reserve action can stay single-flavor (pre-selected) OR adopt the same multi-flavor form — keep it consistent and note which you chose.
- Validate server-side; success state lists what they reserved.

## 2. Fix the home hero subheading (reported still not editable)
The home hero subline "Three friends, a smoker, and a new pair of flavors every week." is NOT editable despite Round 8 adding `home_hero_subhead`. **Find the root cause** — the rendered string is probably hardcoded in the hero component instead of reading the key, or a different key is wired. Fix it so editing `home_hero_subhead` in the Site Text tab actually changes this exact string on the live home page. Verify by editing it and seeing it change.

## 3. About page title — make editable
The About page heading ("Three Friends, a Smoker.") is hardcoded. Add an editable key `about_title` (default = current text), wire the About page to read it, and add it to the Site Text tab under the About group. Fallback to default when empty.

## 4. Home "Our Story" teaser — text AND image editable
The block at the bottom of the home page ("Made by hand, by three friends." + the "We started Hossauges in 2024…" teaser + the STORY PHOTO) is its own content, separate from the full About page story. Make all of it editable:
- `home_story_heading` (default "Made by hand, by three friends.")
- `home_story_text` (default = current teaser paragraph)
- `home_story_image` — dashboard image upload (Supabase Storage), with the current placeholder/photo as fallback.
- Add the two text fields to the Site Text tab (Home group) and the image to wherever images are managed (Gallery & Content tab) — keep text in Site Text, images with the other image uploads, and note where each lives.

## 5. Audit pass — catch any other "should be editable but isn't"
While in here, verify the previously-scoped Round 8 strings actually render from the DB (not hardcoded). Report any that were wired to the wrong key or still hardcoded, and fix them. Specifically confirm: home hero headline, subhead, CTA; the 3 how-it-works lines; batch intro; footer tagline; notify blurb; about paragraph; about title (new); home story heading/text (new).

## Acceptance
- [ ] Reserve form: customer can set a quantity per flavor across multiple flavors, no cap, sold-out locked; ONE combined submission + ONE owner email listing all line items.
- [ ] Submissions dashboard shows each order with its per-flavor line items.
- [ ] Editing `home_hero_subhead` changes the real home hero subline (root cause of the miss found + fixed).
- [ ] About title editable via Site Text; falls back to default.
- [ ] Home "Our Story" heading, text, and image all editable; image falls back to current photo; empty text falls back to defaults.
- [ ] Audit: every scoped string confirmed reading from DB with fallback; any misses fixed and reported.
- [ ] Migration 007 (if needed) written and paused for me to apply; existing single-flavor data not broken.
- [ ] `npm run build` clean. No commit, no push.
