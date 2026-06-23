/**
 * Step 1 — Square connectivity proof. Read-only. Run with:
 *   npx tsx scripts/square-probe.ts
 *
 * Calls Catalog (items + variations + images) and Inventory (stock counts)
 * for the real Hossauges account and prints what comes back. No UI, no writes.
 * If empty, prints likely reasons (location id / present_at_location_ids / scope).
 */
import { config } from "dotenv";

config({ path: ".env.local" });

const TOKEN = process.env.SQUARE_ACCESS_TOKEN?.trim();
const LOCATION_ID = process.env.SQUARE_LOCATION_ID?.trim();
const ENV = (process.env.SQUARE_ENV?.trim() || "production").toLowerCase();

const BASE =
  ENV === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";
const SQUARE_VERSION = "2026-05-20";

if (!TOKEN || !LOCATION_ID) {
  console.error(
    "Missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID in .env.local",
  );
  process.exit(1);
}
// Narrowed to plain strings for use inside the async closures below.
const LOCATION: string = LOCATION_ID;

async function square<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Square-Version": SQUARE_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(
      `${method} ${path} → ${res.status}\n${JSON.stringify(json, null, 2)}`,
    );
  }
  return json as T;
}

function money(m?: { amount?: number | bigint; currency?: string }) {
  if (!m || m.amount == null) return "—";
  const cents = Number(m.amount);
  return `$${(cents / 100).toFixed(2)}${m.currency && m.currency !== "USD" ? ` ${m.currency}` : ""}`;
}

async function main() {
  console.log(`\nSquare probe — env=${ENV}  base=${BASE}`);
  console.log(`Location: ${LOCATION}\n${"─".repeat(60)}`);

  // 0) Sanity: confirm the location exists & token is valid.
  try {
    const loc = await square<{
      location?: { name?: string; status?: string; currency?: string };
    }>("GET", `/v2/locations/${LOCATION}`);
    console.log(
      `Location OK: "${loc.location?.name}" (status=${loc.location?.status}, currency=${loc.location?.currency})\n`,
    );
  } catch (e) {
    console.error("Could not read the location — token or location id problem:");
    console.error(String(e));
    process.exit(1);
  }

  // 1) Catalog: items, variations, prices, and image objects.
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
          sku?: string;
          price_money?: { amount?: number; currency?: string };
          track_inventory?: boolean;
        };
      }>;
    };
    image_data?: { url?: string; name?: string };
  };

  // Pull ITEMs and IMAGEs in one list pass.
  const items: CatalogObject[] = [];
  const imagesById = new Map<string, string>();
  let cursor: string | undefined;
  do {
    const qs = new URLSearchParams({ types: "ITEM,IMAGE" });
    if (cursor) qs.set("cursor", cursor);
    const page = await square<{
      objects?: CatalogObject[];
      cursor?: string;
    }>("GET", `/v2/catalog/list?${qs.toString()}`);
    for (const obj of page.objects ?? []) {
      if (obj.type === "ITEM") items.push(obj);
      else if (obj.type === "IMAGE" && obj.image_data?.url)
        imagesById.set(obj.id, obj.image_data.url);
    }
    cursor = page.cursor;
  } while (cursor);

  console.log(
    `Catalog: ${items.length} item(s), ${imagesById.size} image(s) returned.\n`,
  );

  if (items.length === 0) {
    console.log("No items came back. Most likely causes, in order:");
    console.log(
      "  1. Items aren't present at this location — check present_at_location_ids / present_at_all_locations in Square.",
    );
    console.log(
      "  2. SQUARE_LOCATION_ID is wrong (the location above may not be the one holding the catalog).",
    );
    console.log(
      "  3. Token scope is missing ITEMS_READ / INVENTORY_READ.",
    );
    console.log("  4. Items are archived or unpublished.");
    process.exit(0);
  }

  // Collect every variation id so we can batch-retrieve inventory.
  const variationIds: string[] = [];
  for (const item of items) {
    for (const v of item.item_data?.variations ?? [])
      variationIds.push(v.id);
  }

  // 2) Inventory: stock counts at our location for those variations.
  type Count = {
    catalog_object_id?: string;
    state?: string;
    quantity?: string;
    location_id?: string;
  };
  const countsByVariation = new Map<string, Count[]>();
  if (variationIds.length) {
    // batch endpoint accepts up to ~1000 ids; chunk to be safe.
    for (let i = 0; i < variationIds.length; i += 500) {
      const chunk = variationIds.slice(i, i + 500);
      const inv = await square<{ counts?: Count[] }>(
        "POST",
        "/v2/inventory/counts/batch-retrieve",
        { catalog_object_ids: chunk, location_ids: [LOCATION] },
      );
      for (const c of inv.counts ?? []) {
        if (!c.catalog_object_id) continue;
        const arr = countsByVariation.get(c.catalog_object_id) ?? [];
        arr.push(c);
        countsByVariation.set(c.catalog_object_id, arr);
      }
    }
  }

  // 3) Print a human-readable dump.
  for (const item of items) {
    const d = item.item_data;
    const atLoc =
      item.present_at_all_locations ||
      (item.present_at_location_ids ?? []).includes(LOCATION);
    const imgs = (d?.image_ids ?? [])
      .map((id) => imagesById.get(id))
      .filter(Boolean) as string[];

    console.log(`\n■ ${d?.name ?? "(unnamed)"}${d?.is_archived ? "  [ARCHIVED]" : ""}`);
    console.log(`  id: ${item.id}`);
    console.log(
      `  at this location: ${atLoc ? "yes" : "NO — won't display"}${
        item.present_at_all_locations ? " (present_at_all_locations)" : ""
      }`,
    );
    console.log(`  images: ${imgs.length ? imgs.join("\n          ") : "—"}`);

    for (const v of d?.variations ?? []) {
      const vd = v.item_variation_data;
      const counts = countsByVariation.get(v.id) ?? [];
      const inStock = counts.find((c) => c.state === "IN_STOCK");
      const qty = inStock?.quantity ?? "0";
      const tracked = vd?.track_inventory;
      const stockLabel = !tracked
        ? "untracked (treated as available)"
        : Number(qty) > 0
          ? `${qty} in stock`
          : "SOLD OUT";
      console.log(
        `    • ${vd?.name ?? "(variation)"} — ${money(vd?.price_money)} — ${stockLabel}` +
          (vd?.sku ? `  [sku ${vd.sku}]` : ""),
      );
    }
  }

  console.log(`\n${"─".repeat(60)}\nProbe complete.`);
}

main().catch((e) => {
  console.error("\nProbe failed:");
  console.error(String(e));
  process.exit(1);
});
