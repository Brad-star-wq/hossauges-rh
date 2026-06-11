# VERIFY & POLISH — Pre-handoff QA pass

Read CLAUDE.md and SPEC.md first. Purpose: before any commit, push, or data reset, **prove the whole site actually works end-to-end** — public pages, every dashboard write, auth, email, and the new pre-order pop-up. Fix anything that fails. Do NOT commit, push, or run `npm run reset` as part of this — stop at the end and report results so I can decide.

Work through every section. For each check, actually perform it (run the app, click through it, query the DB to confirm rows changed) — do not assume. Where something fails, fix the root cause, then re-verify. End with a written PASS/FAIL list and a summary of every fix made.

---

## 0. The three known bugs — confirm fixed first
1. **Dashboard saves persist.** Edit a flavor name, toggle sold-out, change the week label → save → reload the page → the change is still there AND a DB query confirms the row changed. If it uses the anon client for writes, switch to the service-role client. If the service-role key is missing in the env, say so.
2. **Dashboard changes appear on the public site.** After a successful save, the matching public page reflects it (within revalidation). If not, add `revalidatePath` for the affected routes after each write. Verify by editing → loading the public page.
3. **Admin auth is actually enforced.** In a fresh incognito window, visiting `/admin` (and any sub-tab) redirects to the login page. Wrong password is rejected; correct password grants access and sets the cookie; logout clears it. Confirm the guard runs — not just that a stale cookie exists.

## 1. Public site — full click-through (mobile 375px AND desktop)
- [ ] Home: hero, compact how-it-works row, condensed batch menu (scales 2→many), "See the full batch" button works, flavor box (formerly ticker), footer notify-me (only ONE on the page).
- [ ] Mobile nav: opens with a solid navy background, links readable and spaced, nothing bleeds through, closes correctly.
- [ ] `/drop` (This Week's Batch): full board renders all flavors; sold-out stamps correct; reserve form lists all non-sold-out flavors.
- [ ] `/flavors`: current menu with photos at top, each links to its detail view; all-time archive below.
- [ ] Flavor detail `/flavors/[id]`: all info + photos; swipeable on mobile; reserve/order works from here.
- [ ] `/merch`: items render; Buy opens the Square link in a new tab; inactive items hidden.
- [ ] `/about`: editable hero photo, editable story paragraph, the Gallery (photos + videos) render from the DB.
- [ ] No console errors; no broken images (empty media falls back to placeholders with no layout shift).

## 2. Reserve / order flow — end to end
- [ ] Submit a reserve from `/drop` → success state shows → a row lands in `interest_submissions` → owner email arrives (or sandbox-limited as expected).
- [ ] Submit from a flavor detail page → same result, correct flavor attached.
- [ ] Sold-out flavor cannot be reserved (blocked server-side, not just hidden in the UI).
- [ ] Bad input (empty name, junk contact, qty out of range) is rejected with a clear inline error.

## 3. Pre-order pop-up — end to end (Round 5)
- [ ] With the pop-up disabled in the dashboard: homepage shows NO pop-up.
- [ ] Enable it + add items: homepage shows the pop-up on load (mobile + desktop), once per session, X dismisses, editable title displays, layout fills the space at 1 / 2 / 5 / 9 items.
- [ ] "Sign up for pre-order" collects name/contact/items → persists a `preorder_signups` row → emails owners.
- [ ] Accessibility: Esc closes, focus trapped while open, background scroll locked, focus returns on close, reduced-motion respected.

## 4. Dashboard — every tab actually works and persists
For each, make a change, reload, and confirm it stuck AND shows on the public site:
- [ ] Batch/Drop: edit week label; add a flavor; remove a flavor; edit each field; toggle sold-out; upload/reorder/delete multiple photos per flavor; publish new batch (archives old, old flavors appear in archive).
- [ ] Merch: add item (name, price, sizes, photo, Square link, active); edit; hide; delete.
- [ ] Gallery & Content: replace home hero photo; replace about hero; edit about paragraph; add/reorder/delete gallery photos AND videos.
- [ ] Pre-order Pop-ups: toggle on/off; edit title; add/reorder/delete items (cap 9); view signups, mark contacted, copy contacts.
- [ ] Submissions: reserve entries listed newest-first; filter by batch; mark contacted; copy email list.
- [ ] Every destructive action confirms first; failed writes surface a visible error (never silently "succeed").

## 5. Data integrity & env
- [ ] All migrations 001–005 are applied (query each new table to confirm it exists).
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`, and the `NEXT_PUBLIC_*` vars are all present in the local env (and remind me to confirm they're in Netlify before deploy).
- [ ] Service-role key is NOT in the client bundle (`grep` the build output; report the result).
- [ ] No secrets committed (`git ls-files | grep -i env.local` shows only the example).

## 6. Polish pass
- [ ] Lighthouse on Home, Drop, Flavors detail, About: aim 90+ perf, 100 a11y/SEO; report scores; fix contrast/label regressions.
- [ ] Consistent spacing/typography across new components (detail view, pre-order pop-up, gallery) — they should look native to the existing design system, not bolted on.
- [ ] `prefers-reduced-motion` respected on all new animations.
- [ ] `npm run build` clean.

---

## Final report (do this instead of committing)
Produce:
1. A PASS/FAIL line for every checkbox above.
2. A list of every bug found and how it was fixed (root causes, not symptoms).
3. Lighthouse scores per page.
4. Anything still broken or risky that I should know before I commit/push/reset.

Then STOP. Do not commit, push, or reset — I will review this report and run those steps myself once it's all green.
