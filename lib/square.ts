import "server-only";

/**
 * Square is the source of truth for all merch (Round 6). The owners manage
 * items, prices, sizes, photos, and stock in the Square app; this module READS
 * that catalog + inventory and mints Square-hosted checkout links. No payment
 * code lives here — buyers complete checkout on Square's hosted page.
 *
 * Env (server only, never in the client bundle):
 *   SQUARE_ACCESS_TOKEN  — personal access token (ITEMS_READ + INVENTORY_READ,
 *                          and ORDERS/PAYMENTS write for payment links)
 *   SQUARE_LOCATION_ID   — the location whose catalog + stock we show
 *   SQUARE_ENV           — "production" (default) or "sandbox"
 *
 * `server-only` makes the build fail if this is ever pulled into client code.
 */

const SQUARE_VERSION = "2026-05-20";

type SquareConfig = {
  base: string;
  token: string;
  locationId: string;
};

/** Read + validate env at call time (not import time) so the build never throws. */
function config(): SquareConfig | null {
  const token = process.env.SQUARE_ACCESS_TOKEN?.trim();
  const locationId = process.env.SQUARE_LOCATION_ID?.trim();
  const env = (process.env.SQUARE_ENV?.trim() || "production").toLowerCase();
  if (!token || !locationId) return null;
  const base =
    env === "sandbox"
      ? "https://connect.squareupsandbox.com"
      : "https://connect.squareup.com";
  return { base, token, locationId };
}

async function squareFetch<T>(
  cfg: SquareConfig,
  method: "GET" | "POST",
  path: string,
  opts: { body?: unknown; revalidate?: number | false } = {},
): Promise<T> {
  const { body, revalidate = 60 } = opts;
  const res = await fetch(`${cfg.base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Square-Version": SQUARE_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    // GETs cache for ~60s so we don't hammer Square on every render; POSTs
    // (payment links) are never cached by Next.
    ...(revalidate === false
      ? { cache: "no-store" as const }
      : { next: { revalidate } }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Square ${method} ${path} → ${res.status} ${detail}`);
  }
  return (await res.json()) as T;
}

// ── Public shapes the UI consumes ────────────────────────────────────────────

export type SquareVariation = {
  id: string;
  /** Size label, e.g. "S". Square's default is "Regular" when there are no options. */
  name: string;
  priceCents: number | null;
  soldOut: boolean;
  /** Hosted checkout URL for this size; null when sold out or links are skipped. */
  checkoutUrl: string | null;
};

export type SquareMerchItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  /** Lowest variation price — what the card shows ("From $X" when they differ). */
  priceCents: number | null;
  /** True when every variation is out of stock. */
  soldOut: boolean;
  /** Whether variations carry distinct prices (drives the "From" prefix). */
  multiPrice: boolean;
  variations: SquareVariation[];
};

export type SquareMerchResult =
  | { ok: true; items: SquareMerchItem[] }
  | { ok: false; reason: string };

// ── Raw Square catalog/inventory types (only the fields we read) ──────────────

type CatalogObject = {
  type: string;
  id: string;
  present_at_all_locations?: boolean;
  present_at_location_ids?: string[];
  item_data?: {
    name?: string;
    is_archived?: boolean;
    image_ids?: string[];
    variations?: Array<{
      id: string;
      item_variation_data?: {
        name?: string;
        ordinal?: number;
        price_money?: { amount?: number; currency?: string };
        track_inventory?: boolean;
      };
    }>;
  };
  image_data?: { url?: string };
};

type InventoryCount = {
  catalog_object_id?: string;
  state?: string;
  quantity?: string;
};

// ── Catalog + inventory reads ────────────────────────────────────────────────

async function listCatalog(
  cfg: SquareConfig,
  revalidate: number | false,
): Promise<{ items: CatalogObject[]; imagesById: Map<string, string> }> {
  const items: CatalogObject[] = [];
  const imagesById = new Map<string, string>();
  let cursor: string | undefined;
  do {
    const qs = new URLSearchParams({ types: "ITEM,IMAGE" });
    if (cursor) qs.set("cursor", cursor);
    const page = await squareFetch<{ objects?: CatalogObject[]; cursor?: string }>(
      cfg,
      "GET",
      `/v2/catalog/list?${qs.toString()}`,
      { revalidate },
    );
    for (const obj of page.objects ?? []) {
      if (obj.type === "ITEM") items.push(obj);
      else if (obj.type === "IMAGE" && obj.image_data?.url)
        imagesById.set(obj.id, obj.image_data.url);
    }
    cursor = page.cursor;
  } while (cursor);
  return { items, imagesById };
}

async function retrieveInventory(
  cfg: SquareConfig,
  variationIds: string[],
  revalidate: number | false,
): Promise<Map<string, number>> {
  const qtyByVariation = new Map<string, number>();
  for (let i = 0; i < variationIds.length; i += 500) {
    const chunk = variationIds.slice(i, i + 500);
    const inv = await squareFetch<{ counts?: InventoryCount[] }>(
      cfg,
      "POST",
      "/v2/inventory/counts/batch-retrieve",
      {
        body: { catalog_object_ids: chunk, location_ids: [cfg.locationId] },
        revalidate,
      },
    );
    for (const c of inv.counts ?? []) {
      if (!c.catalog_object_id || c.state !== "IN_STOCK") continue;
      qtyByVariation.set(c.catalog_object_id, Number(c.quantity ?? "0"));
    }
  }
  return qtyByVariation;
}

// ── Hosted checkout links (Square Payment Links API) ─────────────────────────
//
// We mint one payment link per in-stock variation so the buyer lands on Square's
// hosted page with the right size + price pre-selected. The link's order
// references the catalog variation by id, so Square pulls the live price.
//
// Memoized per (variationId, priceCents): a deterministic idempotency key means
// repeat calls return the SAME link (Square dedups), and a price change in
// Square yields a fresh link automatically. Cached in-process to avoid re-POSTing
// every render.
const checkoutCache = new Map<string, string>();

async function checkoutUrlFor(
  cfg: SquareConfig,
  variationId: string,
  priceCents: number,
  revalidate: number | false,
): Promise<string | null> {
  const cacheKey = `${variationId}:${priceCents}`;
  const cached = checkoutCache.get(cacheKey);
  if (cached) return cached;
  try {
    const res = await squareFetch<{ payment_link?: { url?: string; long_url?: string } }>(
      cfg,
      "POST",
      "/v2/online-checkout/payment-links",
      {
        // Next never caches POST responses, but we avoid `no-store` here so the
        // /merch page can still be statically revalidated (ISR) instead of being
        // forced fully dynamic. The in-memory cache above prevents re-POSTing.
        revalidate,
        body: {
          idempotency_key: `hoss-${cacheKey}`,
          order: {
            location_id: cfg.locationId,
            line_items: [{ quantity: "1", catalog_object_id: variationId }],
          },
          checkout_options: { ask_for_shipping_address: true },
        },
      },
    );
    const url = res.payment_link?.url ?? res.payment_link?.long_url ?? null;
    if (url) checkoutCache.set(cacheKey, url);
    return url;
  } catch (err) {
    // A missing checkout link must not break the page — the size just shows
    // without a working Buy button, and the error is logged for the owner.
    console.error(`[square] checkout link failed for ${variationId}:`, err);
    return null;
  }
}

// ── The one function the pages call ──────────────────────────────────────────

/**
 * Live merch from Square: items present at our location, with variations,
 * prices, image URLs, stock state, and hosted checkout links.
 *
 * Never throws — returns `{ ok: false, reason }` so the page can render a
 * graceful error state instead of crashing.
 *
 * @param opts.revalidate   GET cache window in seconds (default 60). `false`
 *                          forces fresh reads (used by the admin sanity panel).
 * @param opts.withCheckout mint hosted checkout links (default true). The admin
 *                          read-only panel passes false to avoid creating links.
 */
export async function getSquareMerch(opts?: {
  revalidate?: number | false;
  withCheckout?: boolean;
}): Promise<SquareMerchResult> {
  const cfg = config();
  if (!cfg)
    return { ok: false, reason: "Square is not configured (missing token or location)." };

  const revalidate = opts?.revalidate ?? 60;
  const withCheckout = opts?.withCheckout ?? true;

  try {
    const { items: catalog, imagesById } = await listCatalog(cfg, revalidate);

    // Only items that are live at our location and not archived.
    const visible = catalog.filter(
      (obj) =>
        !obj.item_data?.is_archived &&
        (obj.present_at_all_locations ||
          (obj.present_at_location_ids ?? []).includes(cfg.locationId)),
    );

    const variationIds = visible.flatMap((obj) =>
      (obj.item_data?.variations ?? []).map((v) => v.id),
    );
    const qtyByVariation = variationIds.length
      ? await retrieveInventory(cfg, variationIds, revalidate)
      : new Map<string, number>();

    const items: SquareMerchItem[] = [];
    for (const obj of visible) {
      const d = obj.item_data;
      if (!d) continue;

      const rawVariations = (d.variations ?? [])
        .slice()
        .sort(
          (a, b) =>
            (a.item_variation_data?.ordinal ?? 0) -
            (b.item_variation_data?.ordinal ?? 0),
        );

      const variations: SquareVariation[] = [];
      for (const v of rawVariations) {
        const vd = v.item_variation_data;
        const priceCents = vd?.price_money?.amount ?? null;
        // Untracked inventory is treated as always available (matches Square's
        // own behavior when a seller doesn't count stock).
        const tracked = vd?.track_inventory ?? false;
        const qty = qtyByVariation.get(v.id) ?? 0;
        const soldOut = tracked && qty <= 0;

        let checkoutUrl: string | null = null;
        if (withCheckout && !soldOut && priceCents != null) {
          checkoutUrl = await checkoutUrlFor(cfg, v.id, priceCents, revalidate);
        }

        variations.push({
          id: v.id,
          name: vd?.name?.trim() || "Regular",
          priceCents,
          soldOut,
          checkoutUrl,
        });
      }

      const prices = variations
        .map((v) => v.priceCents)
        .filter((p): p is number => p != null);
      const minPrice = prices.length ? Math.min(...prices) : null;
      const multiPrice = new Set(prices).size > 1;

      const imageUrl =
        (d.image_ids ?? [])
          .map((id) => imagesById.get(id))
          .find((u): u is string => Boolean(u)) ?? null;

      items.push({
        id: obj.id,
        name: d.name?.trim() || "Untitled item",
        imageUrl,
        priceCents: minPrice,
        soldOut: variations.length > 0 && variations.every((v) => v.soldOut),
        multiPrice,
        variations,
      });
    }

    // Stable, friendly order: in-stock first, then alphabetical.
    items.sort(
      (a, b) =>
        Number(a.soldOut) - Number(b.soldOut) || a.name.localeCompare(b.name),
    );

    return { ok: true, items };
  } catch (err) {
    console.error("[square] getSquareMerch failed:", err);
    return { ok: false, reason: "Couldn't reach Square." };
  }
}
