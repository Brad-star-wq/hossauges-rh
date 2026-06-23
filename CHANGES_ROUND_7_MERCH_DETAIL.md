# CHANGES — Round 7 (Merch detail view: color/size buttons + per-color photos)

Read CLAUDE.md, SPEC.md, and CHANGES_ROUND_6_SQUARE.md first. This builds an on-site merch **detail view** so colors and photos show on our site instead of jumping straight to Square checkout. Square stays the source of truth (Round 6) — this only changes how we DISPLAY merch and how the buyer picks a variation before going to checkout.

**Hard rules:**
1. Square remains source of truth. We still read catalog + inventory and send buyers to Square hosted checkout. No payment code on our site.
2. **Diagnostic first (Step 1), then PAUSE.** Square can model variations as one combined "Color/Size" variation OR as separate option sets — we must see the real Hossauges data before building the UI.
3. Do NOT commit or push. Stop when `npm run build` is clean and report.

## Step 1 — Inspect real variation data, then pause
- Fetch a real Hossauges merch item that has multiple colors, sizes, AND multiple photos. Log and show me:
  - How variations are structured (combined "Black / M" variations, or separate Color + Size option sets / item options).
  - Where images live: item-level images vs. variation-level images (image ids per variation).
  - Stock per variation (from Inventory).
- Report what you found and how you'll map it (which field = color, which = size, how photos associate to a color). PAUSE for my OK before building Step 2+.

## Step 2 — Merch detail view
- New route `/merch/[id]`. The `/merch` grid cards now link here (instead of going straight to Square checkout).
- Layout:
  - **Photo gallery** (swipeable on mobile, arrows/dots on desktop), reusing the existing flavor photo-gallery component if reasonable.
  - Item name, price, description.
  - **Color selector as buttons** (not a dropdown): one button per available color, selected state styled in the design system (ember/navy). 
  - **Size selector as buttons**: one per size.
  - **Buy button** → Square hosted checkout for the exact selected color+size variation (new tab, rel="noopener").
- **Photos change with color (#2):** when a color is selected, the gallery shows that color's variation-level photos **if they exist in Square**; if a color has no variation-level photos, fall back to the item-level photos. Implement this fallback cleanly so it works either way (see the Round 6 note about owners attaching photos per variation).
- **Out-of-stock (#4):** any color or size whose variation is out of stock (Inventory count 0/missing) renders its button **disabled** with a sold-out style. If a whole color is out, disable that color button. The Buy button is disabled until an in-stock color+size combo is selected.
- Graceful states: single-color or single-size items shouldn't show pointless selectors; one-photo items show cleanly; Square unreachable shows an error state, not a crash.

## Step 3 — /merch grid + dashboard
- `/merch` cards link to `/merch/[id]`; card thumbnail uses the item's first/primary image.
- Dashboard merch tab stays read-only ("managed in Square"), but update the note + OWNER_GUIDE/SQUARE_SETUP to explain: to get **per-color photos**, attach photos to each color **variation** in Square (not just the item); otherwise the site shows the item's general photos for every color. Keep it brief and plain.

## Acceptance
- [ ] Step 1 diagnostic shown to me; variation/photo mapping confirmed before UI built.
- [ ] `/merch/[id]` detail view: swipeable gallery, color buttons, size buttons, all from live Square data.
- [ ] Selecting a color updates the gallery to that color's photos when present; falls back to item photos otherwise.
- [ ] Out-of-stock colors/sizes are disabled; Buy disabled until a valid in-stock combo is chosen.
- [ ] Buy goes to Square hosted checkout for the exact variation; no payment code; token server-only.
- [ ] Editing a Square item (add color, new photo, stock to 0) reflects on the site within ~60s.
- [ ] Single-color/single-size/one-photo items all render cleanly; Square error state doesn't crash.
- [ ] Owner guide updated re: per-variation photos. `npm run build` clean. No commit/push.
