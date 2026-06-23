import "server-only";

/**
 * Square is the source of truth for all merch (Round 6). The owners manage
 * items, prices, sizes, colors, photos, and stock in Square; this module READS
 * that catalog + inventory and mints Square-hosted checkout links. No payment
 * code lives here — buyers complete checkout on Square's hosted page.
 *
 * Round 7 adds the on-site detail view: it resolves Square's option sets
 * ("Color" / "Size") into color + size dimensions, reads per-variation images
 * (with item-level fallback), and exposes a single-item fetch for /merch/[id].
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
  /** Full Square variation name, e.g. "Small, Red" or "S". */
  name: string;
  /** Resolved "Color" option value, or null when the item has no color option. */
  color: string | null;
  /** Resolved "Size" option value (or the variation name for standalone items). */
  size: string | null;
  priceCents: number | null;
  /** Inventory says this variation has no stock (or is tracked at 0). */
  soldOut: boolean;
  /** Buyable right now: in stock AND has a price. Drives the Buy button. */
  purchasable: boolean;
  /** Hosted checkout URL; null when not purchasable or links weren't minted. */
  checkoutUrl: string | null;
  /** Variation-level photos (per-color). Empty → fall back to item photos. */
  imageUrls: string[];
};

export type SquareMerchItem = {
  id: string;
  name: string;
  description: string | null;
  /** All item-level photos (shared across colors). */
  imageUrls: string[];
  /** Primary item photo — the grid/teaser thumbnail. */
  imageUrl: string | null;
  /** Lowest variation price — what the card shows ("From $X" when they differ). */
  priceCents: number | null;
  /** Whether priced variations carry distinct prices (drives the "From" prefix). */
  multiPrice: boolean;
  /** True when every variation is out of stock. */
  soldOut: boolean;
  /** Distinct color values in Square's option order ([] when no color option). */
  colors: string[];
  /** Distinct size values in option order (or variation names for standalone). */
  sizes: string[];
  variations: SquareVariation[];
};

export type SquareMerchResult =
  | { ok: true; items: SquareMerchItem[] }
  | { ok: false; reason: string };

export type SquareMerchItemResult =
  | { ok: true; item: SquareMerchItem }
  | { ok: false; reason: string; notFound?: boolean };

// ── Raw Square catalog/inventory types (only the fields we read) ──────────────

type RawVariation = {
  id: string;
  item_variation_data?: {
    name?: string;
    ordinal?: number;
    price_money?: { amount?: number; currency?: string };
    track_inventory?: boolean;
    image_ids?: string[];
    item_option_values?: Array<{
      item_option_id?: string;
      item_option_value_id?: string;
    }>;
  };
};

type CatalogObject = {
  type: string;
  id: string;
  present_at_all_locations?: boolean;
  present_at_location_ids?: string[];
  item_data?: {
    name?: string;
    description?: string;
    description_plaintext?: string;
    is_archived?: boolean;
    image_ids?: string[];
    item_options?: Array<{ item_option_id?: string }>;
    variations?: RawVariation[];
  };
  image_data?: { url?: string };
  item_option_data?: {
    name?: string;
    display_name?: string;
    values?: Array<{ id: string; item_option_value_data?: { name?: string } }>;
  };
};

type InventoryCount = {
  catalog_object_id?: string;
  state?: string;
  quantity?: string;
};

/** Resolved option set: ordered value-id → value-name (Square's own order). */
type OptionSet = { id: string; name: string; values: Map<string, string> };

type CatalogData = {
  items: CatalogObject[];
  imagesById: Map<string, string>;
  optionsById: Map<string, OptionSet>;
};

// ── Catalog + inventory reads ────────────────────────────────────────────────

async function listCatalog(
  cfg: SquareConfig,
  revalidate: number | false,
): Promise<CatalogData> {
  const items: CatalogObject[] = [];
  const imagesById = new Map<string, string>();
  const optionsById = new Map<string, OptionSet>();
  let cursor: string | undefined;
  do {
    const qs = new URLSearchParams({ types: "ITEM,IMAGE,ITEM_OPTION" });
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
      else if (obj.type === "ITEM_OPTION") {
        const od = obj.item_option_data;
        const values = new Map<string, string>();
        for (const v of od?.values ?? [])
          values.set(v.id, v.item_option_value_data?.name ?? "");
        optionsById.set(obj.id, {
          id: obj.id,
          name: od?.name ?? od?.display_name ?? "",
          values,
        });
      }
    }
    cursor = page.cursor;
  } while (cursor);
  return { items, imagesById, optionsById };
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
// One payment link per purchasable variation, so the buyer lands on Square's
// hosted page with the right color+size + price pre-selected. The link's order
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
        // page can still be statically revalidated (ISR) instead of being forced
        // fully dynamic. The in-memory cache above prevents re-POSTing.
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
    // A missing checkout link must not break the page — the variation just shows
    // without a working Buy button, and the error is logged for the owner.
    console.error(`[square] checkout link failed for ${variationId}:`, err);
    return null;
  }
}

// ── Option mapping (Color / Size) ────────────────────────────────────────────

const COLOR_RE = /colou?r/i;
const SIZE_RE = /size/i;

/**
 * Decide which of an item's referenced option sets is the color dimension and
 * which is the size dimension. Falls back gracefully: if there's no set named
 * "Size", the first non-color set is treated as size; standalone items (no
 * option sets) use the variation name as the size.
 */
function classifyOptions(
  d: NonNullable<CatalogObject["item_data"]>,
  optionsById: Map<string, OptionSet>,
): { colorOpt: OptionSet | null; sizeOpt: OptionSet | null } {
  const referenced = (d.item_options ?? [])
    .map((o) => (o.item_option_id ? optionsById.get(o.item_option_id) : undefined))
    .filter((o): o is OptionSet => Boolean(o));

  const colorOpt = referenced.find((o) => COLOR_RE.test(o.name)) ?? null;
  const sizeOpt =
    referenced.find((o) => SIZE_RE.test(o.name)) ??
    referenced.find((o) => o !== colorOpt) ??
    null;
  return { colorOpt, sizeOpt };
}

function valueFor(v: RawVariation, opt: OptionSet | null): string | null {
  if (!opt) return null;
  const match = (v.item_variation_data?.item_option_values ?? []).find(
    (ov) => ov.item_option_id === opt.id,
  );
  const valId = match?.item_option_value_id;
  return (valId && opt.values.get(valId)) || null;
}

// ── Build one item from raw Square data ──────────────────────────────────────

async function buildItem(
  obj: CatalogObject,
  cat: CatalogData,
  qtyByVariation: Map<string, number>,
  cfg: SquareConfig,
  withCheckout: boolean,
  revalidate: number | false,
): Promise<SquareMerchItem | null> {
  const d = obj.item_data;
  if (!d) return null;

  const { colorOpt, sizeOpt } = classifyOptions(d, cat.optionsById);
  const resolveImgs = (ids?: string[]) =>
    (ids ?? [])
      .map((id) => cat.imagesById.get(id))
      .filter((u): u is string => Boolean(u));

  const raw = (d.variations ?? [])
    .slice()
    .sort(
      (a, b) =>
        (a.item_variation_data?.ordinal ?? 0) -
        (b.item_variation_data?.ordinal ?? 0),
    );

  const variations: SquareVariation[] = [];
  for (const v of raw) {
    const vd = v.item_variation_data;
    const priceCents = vd?.price_money?.amount ?? null;
    // Untracked inventory is treated as always available (matches Square's own
    // behavior when a seller doesn't count stock).
    const tracked = vd?.track_inventory ?? false;
    const qty = qtyByVariation.get(v.id) ?? 0;
    const soldOut = tracked && qty <= 0;
    const purchasable = !soldOut && priceCents != null;

    const color = valueFor(v, colorOpt);
    // Size from the size option, or the variation name when there are no options.
    const size = valueFor(v, sizeOpt) ?? (sizeOpt ? null : vd?.name?.trim() || null);

    let checkoutUrl: string | null = null;
    if (withCheckout && purchasable) {
      checkoutUrl = await checkoutUrlFor(cfg, v.id, priceCents, revalidate);
    }

    variations.push({
      id: v.id,
      name: vd?.name?.trim() || "Regular",
      color,
      size,
      priceCents,
      soldOut,
      purchasable,
      checkoutUrl,
      imageUrls: resolveImgs(vd?.image_ids),
    });
  }

  // Distinct colors/sizes in Square's option-value order, limited to values that
  // actually appear on this item's variations.
  const orderColors = (() => {
    if (!colorOpt) return [];
    const present = new Set(variations.map((v) => v.color).filter(Boolean));
    return [...colorOpt.values.values()].filter((n) => present.has(n));
  })();
  const orderSizes = (() => {
    if (sizeOpt) {
      const present = new Set(variations.map((v) => v.size).filter(Boolean));
      return [...sizeOpt.values.values()].filter((n) => present.has(n));
    }
    // Standalone: sizes are the variation names, already in ordinal order.
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of variations) {
      if (v.size && !seen.has(v.size)) {
        seen.add(v.size);
        out.push(v.size);
      }
    }
    return out;
  })();

  const prices = variations
    .map((v) => v.priceCents)
    .filter((p): p is number => p != null);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const multiPrice = new Set(prices).size > 1;

  const imageUrls = resolveImgs(d.image_ids);

  return {
    id: obj.id,
    name: d.name?.trim() || "Untitled item",
    description: d.description_plaintext?.trim() || d.description?.trim() || null,
    imageUrls,
    imageUrl: imageUrls[0] ?? null,
    priceCents: minPrice,
    multiPrice,
    soldOut: variations.length > 0 && variations.every((v) => v.soldOut),
    colors: orderColors,
    sizes: orderSizes,
    variations,
  };
}

function isVisible(obj: CatalogObject, cfg: SquareConfig): boolean {
  return (
    !obj.item_data?.is_archived &&
    (obj.present_at_all_locations ||
      (obj.present_at_location_ids ?? []).includes(cfg.locationId))
  );
}

// ── The functions the pages call ─────────────────────────────────────────────

/**
 * Live merch list for the /merch grid and home teaser. Checkout links are NOT
 * minted here (the grid links to /merch/[id], where the buyer picks a variation)
 * — pass `withCheckout: true` only if a caller genuinely needs per-variation
 * links up front.
 *
 * Never throws — returns `{ ok: false, reason }` so the page renders a graceful
 * error state instead of crashing.
 */
export async function getSquareMerch(opts?: {
  revalidate?: number | false;
  withCheckout?: boolean;
}): Promise<SquareMerchResult> {
  const cfg = config();
  if (!cfg)
    return { ok: false, reason: "Square is not configured (missing token or location)." };

  const revalidate = opts?.revalidate ?? 60;
  const withCheckout = opts?.withCheckout ?? false;

  try {
    const cat = await listCatalog(cfg, revalidate);
    const visible = cat.items.filter((obj) => isVisible(obj, cfg));

    const variationIds = visible.flatMap((obj) =>
      (obj.item_data?.variations ?? []).map((v) => v.id),
    );
    const qtyByVariation = variationIds.length
      ? await retrieveInventory(cfg, variationIds, revalidate)
      : new Map<string, number>();

    const items: SquareMerchItem[] = [];
    for (const obj of visible) {
      const item = await buildItem(obj, cat, qtyByVariation, cfg, withCheckout, revalidate);
      if (item) items.push(item);
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

/**
 * One item for the /merch/[id] detail view — full colors/sizes/variation grid,
 * per-color photos, and hosted checkout links for the purchasable variations.
 * Never throws; `notFound: true` when the id isn't a live item.
 */
export async function getSquareMerchItem(
  id: string,
  opts?: { revalidate?: number | false },
): Promise<SquareMerchItemResult> {
  const cfg = config();
  if (!cfg)
    return { ok: false, reason: "Square is not configured (missing token or location)." };

  const revalidate = opts?.revalidate ?? 60;

  try {
    const cat = await listCatalog(cfg, revalidate);
    const obj = cat.items.find((o) => o.id === id && isVisible(o, cfg));
    if (!obj) return { ok: false, reason: "Item not found.", notFound: true };

    const variationIds = (obj.item_data?.variations ?? []).map((v) => v.id);
    const qtyByVariation = variationIds.length
      ? await retrieveInventory(cfg, variationIds, revalidate)
      : new Map<string, number>();

    const item = await buildItem(obj, cat, qtyByVariation, cfg, true, revalidate);
    if (!item) return { ok: false, reason: "Item not found.", notFound: true };
    return { ok: true, item };
  } catch (err) {
    console.error("[square] getSquareMerchItem failed:", err);
    return { ok: false, reason: "Couldn't reach Square." };
  }
}
