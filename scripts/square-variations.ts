/**
 * Round 7 — Step 1 diagnostic. Read-only. Run with:
 *   npx tsx scripts/square-variations.ts
 *
 * Inspects how the real Hossauges merch is modeled in Square so we can design
 * the detail view: are variations combined ("Black / M") or split into separate
 * Color + Size option sets? Do photos live on the item or per variation? What's
 * the stock per variation? Prints everything; makes no writes.
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
  console.error("Missing SQUARE_ACCESS_TOKEN or SQUARE_LOCATION_ID in .env.local");
  process.exit(1);
}
const LOCATION: string = LOCATION_ID;

async function square<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
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
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}\n${JSON.stringify(json, null, 2)}`);
  return json as T;
}

function money(m?: { amount?: number; currency?: string }) {
  if (!m || m.amount == null) return "—";
  return `$${(Number(m.amount) / 100).toFixed(2)}`;
}

type CatalogObject = {
  type: string;
  id: string;
  present_at_all_locations?: boolean;
  present_at_location_ids?: string[];
  item_data?: {
    name?: string;
    is_archived?: boolean;
    image_ids?: string[];
    item_options?: Array<{ item_option_id?: string }>;
    variations?: Array<{
      id: string;
      item_variation_data?: {
        name?: string;
        sku?: string;
        ordinal?: number;
        price_money?: { amount?: number; currency?: string };
        track_inventory?: boolean;
        image_ids?: string[];
        item_option_values?: Array<{ item_option_id?: string; item_option_value_id?: string }>;
      };
    }>;
  };
  image_data?: { url?: string };
  item_option_data?: {
    name?: string;
    display_name?: string;
    values?: Array<{ id: string; item_option_value_data?: { name?: string } }>;
  };
};

type Count = { catalog_object_id?: string; state?: string; quantity?: string };

async function main() {
  console.log(`\nRound 7 variation probe — env=${ENV}  location=${LOCATION}\n${"─".repeat(64)}`);

  // Pull items, images, and option definitions in one pass.
  const items: CatalogObject[] = [];
  const imagesById = new Map<string, string>();
  // optionId → { name, values: Map<valueId, valueName> }
  const optionsById = new Map<string, { name: string; values: Map<string, string> }>();
  let cursor: string | undefined;
  do {
    const qs = new URLSearchParams({ types: "ITEM,IMAGE,ITEM_OPTION" });
    if (cursor) qs.set("cursor", cursor);
    const page = await square<{ objects?: CatalogObject[]; cursor?: string }>(
      "GET",
      `/v2/catalog/list?${qs.toString()}`,
    );
    for (const obj of page.objects ?? []) {
      if (obj.type === "ITEM") items.push(obj);
      else if (obj.type === "IMAGE" && obj.image_data?.url) imagesById.set(obj.id, obj.image_data.url);
      else if (obj.type === "ITEM_OPTION") {
        const od = obj.item_option_data;
        const values = new Map<string, string>();
        for (const v of od?.values ?? []) values.set(v.id, v.item_option_value_data?.name ?? "(?)");
        optionsById.set(obj.id, { name: od?.name ?? od?.display_name ?? "(option)", values });
      }
    }
    cursor = page.cursor;
  } while (cursor);

  console.log(`Items: ${items.length}   Images: ${imagesById.size}   Option sets: ${optionsById.size}\n`);
  if (optionsById.size) {
    console.log("Option sets defined in this account:");
    for (const [id, o] of optionsById) {
      console.log(`  • "${o.name}" (${id}) → [${[...o.values.values()].join(", ")}]`);
    }
    console.log();
  } else {
    console.log("No ITEM_OPTION sets — variations are likely standalone (e.g. just sizes).\n");
  }

  // Inventory for every variation.
  const variationIds = items.flatMap((it) => (it.item_data?.variations ?? []).map((v) => v.id));
  const qtyByVariation = new Map<string, number>();
  for (let i = 0; i < variationIds.length; i += 500) {
    const chunk = variationIds.slice(i, i + 500);
    const inv = await square<{ counts?: Count[] }>("POST", "/v2/inventory/counts/batch-retrieve", {
      catalog_object_ids: chunk,
      location_ids: [LOCATION],
    });
    for (const c of inv.counts ?? []) {
      if (c.catalog_object_id && c.state === "IN_STOCK")
        qtyByVariation.set(c.catalog_object_id, Number(c.quantity ?? "0"));
    }
  }

  const resolveImgs = (ids?: string[]) =>
    (ids ?? []).map((id) => imagesById.get(id)).filter(Boolean) as string[];

  for (const it of items) {
    const d = it.item_data;
    if (!d) continue;
    console.log(`${"═".repeat(64)}\n■ ITEM: ${d.name}${d.is_archived ? "  [ARCHIVED]" : ""}`);
    console.log(`  item id: ${it.id}`);
    const itemImgs = resolveImgs(d.image_ids);
    console.log(`  ITEM-LEVEL images (${itemImgs.length}):`);
    itemImgs.forEach((u) => console.log(`     - ${u}`));

    const itemOptionIds = (d.item_options ?? []).map((o) => o.item_option_id).filter(Boolean) as string[];
    console.log(
      `  item_options referenced: ${
        itemOptionIds.length
          ? itemOptionIds.map((id) => `"${optionsById.get(id)?.name ?? id}"`).join(", ")
          : "(none — standalone variations)"
      }`,
    );

    console.log(`  VARIATIONS (${d.variations?.length ?? 0}):`);
    for (const v of d.variations ?? []) {
      const vd = v.item_variation_data;
      const qty = qtyByVariation.get(v.id) ?? 0;
      const tracked = vd?.track_inventory ?? false;
      const stock = !tracked ? "untracked→available" : qty > 0 ? `${qty} in stock` : "SOLD OUT";

      // Resolve option values into "OptionName=ValueName" pairs.
      const optPairs = (vd?.item_option_values ?? []).map((ov) => {
        const opt = ov.item_option_id ? optionsById.get(ov.item_option_id) : undefined;
        const optName = opt?.name ?? ov.item_option_id ?? "?";
        const valName = ov.item_option_value_id ? opt?.values.get(ov.item_option_value_id) : undefined;
        return `${optName}=${valName ?? ov.item_option_value_id ?? "?"}`;
      });

      const vImgs = resolveImgs(vd?.image_ids);
      console.log(`\n    • "${vd?.name}"  (${v.id})`);
      console.log(`        price: ${money(vd?.price_money)}   stock: ${stock}`);
      console.log(
        `        options: ${optPairs.length ? optPairs.join(" , ") : "(none — name is the only differentiator)"}`,
      );
      console.log(`        VARIATION-LEVEL images (${vImgs.length}): ${vImgs.length ? "" : "none"}`);
      vImgs.forEach((u) => console.log(`           - ${u}`));
    }
    console.log();
  }

  console.log(`${"─".repeat(64)}\nProbe complete.`);
}

main().catch((e) => {
  console.error("\nProbe failed:");
  console.error(String(e));
  process.exit(1);
});
