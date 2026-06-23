# CHANGES — Round 6 (Square as the source of truth for merch)

Read CLAUDE.md and SPEC.md first. This replaces the current "merch managed in our dashboard" model. From now on, **Square is the source of truth for all merch**: the owners manage items, prices, sizes, photos, and stock in Square; our website **reads** that catalog + inventory and displays it; buying happens on Square's hosted checkout. Our merch dashboard tab becomes read-only/removed for item management.

**Hard rules:**
1. We access only ONE Square account (Hossauges' own), so use a **Square personal access token** — NOT the OAuth seller flow. Much simpler; no token refresh/onboarding.
2. Token lives only in server env (`SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_ENV`). Never in the client bundle, never committed.
3. **Verify before building the UI.** First prove items actually come back from the API (see Step 1). Do not build the whole merch page until a real fetch returns Hossauges' items + stock.
4. Do NOT commit or push. Stop when `npm run build` is clean and report.

## API facts (verified, current)
- Base URL: `https://connect.squareup.com`. Header `Square-Version: 2026-05-20`. Auth: `Authorization: Bearer ${SQUARE_ACCESS_TOKEN}`.
- Use the official Node SDK (`square`) if current, else plain `fetch` to the REST endpoints. Confirm the SDK's current package name/version before adding it; if unsure, use `fetch`.
- **Catalog** (items, variations, prices, images): `POST /v2/catalog/search-catalog-items` or `GET /v2/catalog/list?types=ITEM`. Items have variations (e.g. sizes); each variation has its own price + inventory.
- **Images**: catalog items reference `CatalogImage` objects by id — resolve image URLs from the catalog response.
- **Inventory** (stock counts): `POST /v2/inventory/counts/batch-retrieve` (a.k.a. retrieve counts) for the item-variation IDs at `SQUARE_LOCATION_ID`. Map state IN_STOCK quantity → available; 0 or missing → sold out.
- **Checkout**: do NOT build custom payment code. For each item, link buyers to Square's hosted checkout/online item page. Confirm the current way to get a per-item hosted checkout URL (Square Online item URL, or Payment Links API `POST /v2/online-checkout/payment-links` using the catalog object id). Pick whichever is simplest and document it.
- **Gotcha to verify:** items only return/display if `present_at_location_ids` includes our location (and items are enabled). If Step 1 returns nothing, check this first.

## Step 1 — Connectivity proof (do this first, then pause)
- Add env vars; write a small server-side script/route that calls Catalog + Inventory and logs: item names, variations, prices, image URLs, and stock counts for the real Hossauges account.
- Confirm real items come back. If empty, report exactly why (location id, present_at_location_ids, token scope) before continuing.
- PAUSE here and show me the output.

## Step 2 — Public merch page reads from Square
- `/merch` fetches live from Square (server-side, cached ~60s with revalidate). For each item: photo, name, price (from variation), sizes (variations), and stock state.
- Sold-out items/variations show a clear sold-out state (from Inventory). Out-of-stock sizes disabled.
- "Buy" → Square hosted checkout URL (new tab, `rel="noopener"`). No card handling on our site.
- Keep the existing merch card styling/design system. Graceful empty state if the catalog is empty. Graceful error state if Square is unreachable (don't crash the page).

## Step 3 — Dashboard merch tab
- Remove the add/edit/delete item management (Square owns that now). Replace with a short read-only panel: "Merch is managed in Square" + a refresh/last-synced note, and optionally a live list of what's currently pulled (read-only) so owners can sanity-check.
- Update SQUARE_SETUP.md / OWNER_GUIDE.md: owners now manage everything in the Square app; the website auto-reflects it within ~a minute.

## Step 4 — Cleanup
- The old `merch_items` table + its writes are no longer the source of truth. Either drop it (migration 006) or leave it unused and clearly deprecated — pick one and document it. Don't leave two competing merch systems half-wired.

## Acceptance
- [ ] Step 1 connectivity proof returned real Hossauges items + stock (shown to me).
- [ ] `/merch` shows live Square items, prices, sizes, photos, and accurate sold-out state.
- [ ] Buy goes to Square hosted checkout; no payment code on our site; token not in client bundle.
- [ ] Editing an item in Square (price, new item, stock to 0) reflects on the site within ~60s.
- [ ] Dashboard merch tab is read-only ("managed in Square"); guides updated.
- [ ] Old merch_items handled (dropped or clearly deprecated), no double system.
- [ ] `npm run build` clean. No commit, no push — stopped for my review.
