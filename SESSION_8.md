# SESSION 8 — Polish, SEO, Deploy, Owner Guide

## Goal
Studio-grade final pass and a live site on their domain.

## Steps
1. **Motion orchestration pass**: review every page top to bottom. Hero load sequence timing, Drop Board settle, stagger rhythm consistency (same easing curve everywhere — define one `ease` token). Cut anything that feels decorative. Verify reduced-motion path on every page.
2. **Design QA**: spacing audit against an 8px grid, hairline consistency, ember rationing check (if ember appears more than ~5 times per viewport, cut), dark-section contrast (AA minimum).
3. **SEO/meta**: per-page titles + descriptions, OG image (badge on navy, generated as static asset), favicon set from logo, `sitemap.ts`, `robots.ts`, JSON-LD `LocalBusiness` (Columbia, SC).
4. **Performance**: next/image audit, font subset check, Lighthouse on Home + Drop — targets: 90+ perf, 100 a11y, 100 SEO. Fix until met.
5. **A11y sweep**: keyboard-only run through reserve form and full admin journey; labels on every input; stamp overlays have `aria-label="Sold out"`.
6. **Reset to empty (handoff)**: create `scripts/reset.ts` (service role) that deletes ALL rows from `drops`, `drop_flavors`, `merch_items`, `interest_submissions`, `email_list` and empties the `photos` storage bucket — leaving a clean site with no active drop and no merch. Add `npm run reset` to package.json. After this runs: `/drop` shows "Next drop is in the works.", `/merch` shows "Merch restock coming soon.", `/flavors` is empty. Confirm-prompt in the script ("Type RESET to wipe all data:") so it can't fire by accident. Owner/you then add real content through the dashboard.
7. **Deploy**: push to GitHub → Vercel project → env vars → connect their existing domain (document the DNS records they/you must set). Verify Resend domain sender once DNS propagates.
8. **OWNER_GUIDE.md** (written for non-technical readers, screenshots optional): how to log in, change a flavor, mark sold out, publish a new drop, add merch (with the Square link steps cross-referenced to SQUARE_SETUP.md), read submissions, copy the email list. Plain words, numbered steps, brief.
9. Final smoke test on a real phone over LTE.

## Acceptance
- [ ] Lighthouse targets met on Home and Drop.
- [ ] `npm run reset` wipes all data + photos; site shows clean empty states on every page.
- [ ] Live on the custom domain over HTTPS; reserve email arrives from the verified sender.
- [ ] OWNER_GUIDE.md complete and under 2 pages.
- [ ] One full owner journey performed start-to-finish on a phone with zero developer help.
