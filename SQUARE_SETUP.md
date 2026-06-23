# SQUARE SETUP — Owner Guide (Merch)

Written for the Hossauges guys. No coding involved. **Square is now your whole merch system** — you manage everything in the Square app and the website shows it automatically. There's nothing to copy or paste into the website anymore.

## One-time setup (15 minutes)
1. Download the **Square** app (free) and create a free account — choose "Sell online / retail" when asked. No monthly fee; Square takes a small cut per sale (about 2.9% + 30¢ online).
2. Verify your identity and link the bank account where merch money should go.
3. In the app, go to **Items** — this is your merch catalog.

## Adding a merch item (5 minutes each)
1. Items → **Create Item**.
2. Name it (e.g., "Black Camo Hoodie"), set the price ($50), add a photo.
3. Add **Options** → "Size" → S, M, L, XL, XXL (and a "Color" option if it comes in colors). Set the **price** and a **stock count** for each variation so the website knows the price and when something's sold out.
4. **Save.** That's it — the item shows up on the website within about a minute.

## What shows up on the website, automatically
- The **photo, name, price, colors, and sizes** you entered in Square.
- On the website each item has its own page with **color buttons and size buttons**; picking a color + size reveals a **Buy** button that opens Square's secure checkout for that exact one.
- A **Sold out** look on any color/size (or whole item) once its stock hits 0. A variation with **no price set** can't be bought online (its Buy button stays off) — set a price in Square to enable it.

You don't paste a link anywhere. The website builds the checkout for each color+size from your Square catalog.

## Per-color photos (optional, nice to have)
By default the item's photo shows for **every** color. To show a **different photo when a shopper picks a color**, attach a photo to each **color variation** — this only works from the **Square web dashboard**, not the phone app:
1. On a computer, go to **squareup.com/dashboard** → **Items & orders → Items** → open the item.
2. Click an individual **variation** (e.g. the "Navy" ones) → **add an image** to it.
3. Save. Within about a minute the website shows that photo when "Navy" is selected. Colors without their own photo just keep showing the item's general photo.

## Good to know
- **Change anything in Square** — price, photo, a new item, stock to 0 — and the website updates within about a minute. No second step.
- When a size sells out (stock 0), the website disables its Buy button automatically. To hide a whole item, delete it or remove it from this location in Square.
- Money lands in your linked bank account on Square's normal schedule (1–2 business days). Customers get receipts from Square automatically.
- To **check what's live**, open the website dashboard → **Merch** tab. It's read-only — it just mirrors your Square catalog so you can sanity-check. Tap **Refresh** to re-pull.

---

### For the developer (one-time, technical)
The site reads Square with a **personal access token** (not OAuth). Set these in the deploy's environment (and `.env.local` for dev) — never commit them:

```
SQUARE_ACCESS_TOKEN=   # Production access token, scopes: ITEMS_READ, INVENTORY_READ, ORDERS_WRITE, PAYMENTS_WRITE
SQUARE_LOCATION_ID=    # The Hossauges production location id
SQUARE_ENV=production  # or "sandbox"
```

Verify connectivity any time with `npx tsx scripts/square-probe.ts` — it prints the live items, prices, image URLs, and stock counts. If it returns nothing, check that items are **present at this location** and the token scopes are right.
