# SESSION 7 — Admin Dashboard

## Goal
Phone-first `/admin` the two owners can use without help: Drop, Merch, Submissions.

## Steps
1. **Auth**: `/admin/login` — one password field. Server action compares to `ADMIN_PASSWORD` (constant-time), sets signed httpOnly cookie (`SESSION_SECRET`, 7-day expiry). Middleware guards all `/admin/*`. Logout button in admin nav. 5 failed attempts = 15-min lockout (guard table from Session 6 pattern).
2. **Admin shell**: simplified nav (Drop / Merch / Submissions / Logout), same brand tokens but denser, big touch targets (min 44px).
3. **Drop tab**:
   - Shows the active drop in an editable form: week label, and per flavor — name, meat type select, description, price, **photo upload**, **Sold out toggle** (big switch with stamp preview).
   - "Save changes" updates in place.
   - "Publish new drop" → confirm dialog ("This archives the current drop. The old flavors move to the Flavors page.") → sets current to `archived`, creates fresh drop with two empty flavor forms.
   - Photo upload: `browser-image-compression` (max 1600px, ~80% quality) → Supabase Storage → preview.
4. **Merch tab**: card list with Add / Edit / Hide / Delete (delete confirms). Fields: name, price, sizes note, photo upload, Square link (paste field with mono helper text: "Paste the checkout link from your Square app — see SQUARE_SETUP guide."), active toggle.
5. **Submissions tab**: newest-first table (stacked cards on mobile): name, contact (tap-to-call/mailto), flavor, qty, date, "Contacted" checkbox (persists). Filter dropdown by drop. Below: notify-me email list with "Copy all emails" button.
6. All writes via server actions using the service-role client, gated on the session cookie.

## Acceptance
- [ ] Wrong password fails safely; lockout works; cookie expires.
- [ ] Full owner journey on a 375px screen: toggle sold out → public Drop page shows stamp within 60s; publish new drop → old flavors appear on `/flavors`.
- [ ] Add merch item with photo + Square link → appears on `/merch`, Buy opens link.
- [ ] No admin route or action reachable without the cookie.
- [ ] `npm run build` passes.
