/**
 * RESET TO EMPTY (clean handoff). Wipes ALL content so the owners start fresh:
 * deletes every row from drops, drop_flavors, flavor_photos, merch_items,
 * interest_submissions, email_list, gallery_items, preorder_items/signups (and
 * the transient submission_guard), resets the editable content + pre-order
 * config to defaults, and empties the photos bucket.
 *
 *   npm run reset
 *
 * Guarded by a typed confirmation so it can't fire by accident. After it runs:
 *   /drop    → "Next batch is in the works."
 *   /merch   → "Merch restock coming soon."
 *   /flavors → empty; /about → default story + placeholders; no pre-order pop-up
 * Then the owners add real content through the dashboard.
 */
import { config } from "dotenv";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_ABOUT_PARAGRAPH } from "../lib/types";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Matches every row (id is never null) — supabase requires a filter on delete.
async function wipe(table: string) {
  const { error } = await db.from(table).delete().not("id", "is", null);
  if (error && error.code !== "42P01") throw error; // ignore "table missing"
  console.log(`  cleared ${table}${error?.code === "42P01" ? " (not present)" : ""}`);
}

async function emptyPhotosBucket() {
  // Recurse one level (we store under flavors/ and merch/).
  const { data: top } = await db.storage.from("photos").list("", { limit: 1000 });
  if (!top) {
    console.log("  photos bucket: nothing to remove");
    return;
  }
  const paths: string[] = [];
  for (const entry of top) {
    if (entry.id === null) {
      // a folder — list its contents
      const { data: inner } = await db.storage.from("photos").list(entry.name, { limit: 1000 });
      for (const f of inner ?? []) paths.push(`${entry.name}/${f.name}`);
    } else {
      paths.push(entry.name);
    }
  }
  if (paths.length === 0) {
    console.log("  photos bucket: already empty");
    return;
  }
  const { error } = await db.storage.from("photos").remove(paths);
  if (error) throw error;
  console.log(`  photos bucket: removed ${paths.length} file(s)`);
}

async function run() {
  console.log("\n⚠️  This permanently deletes ALL drops, flavors, merch,");
  console.log("    reservations, the email list, and every uploaded photo.\n");

  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question("Type RESET to wipe all data: ");
  rl.close();

  if (answer.trim() !== "RESET") {
    console.log("Aborted — nothing was changed.");
    process.exit(0);
  }

  console.log("\nWiping…");
  // FK-safe order: children referencing others first.
  await wipe("interest_submissions");
  await wipe("preorder_signups");
  await wipe("submission_guard");
  await wipe("flavor_photos");
  await wipe("gallery_items");
  await wipe("preorder_items");
  await wipe("drop_flavors");
  await wipe("drops");
  await wipe("merch_items");
  await wipe("email_list");

  // Reset config singletons to their seeded defaults (don't delete the rows).
  const { error: scErr } = await db.from("site_content").upsert(
    [
      { key: "home_hero_url", value: "" },
      { key: "about_hero_url", value: "" },
      { key: "about_paragraph", value: DEFAULT_ABOUT_PARAGRAPH },
    ],
    { onConflict: "key" },
  );
  if (scErr && scErr.code !== "42P01") throw scErr;
  console.log("  reset site_content to defaults");

  const { error: poErr } = await db
    .from("preorder_popup")
    .upsert({ id: 1, enabled: false, title: "" }, { onConflict: "id" });
  if (poErr && poErr.code !== "42P01") throw poErr;
  console.log("  reset preorder_popup (disabled)");

  await emptyPhotosBucket();

  console.log("\n✓ Reset complete. The site now shows clean empty states.");
}

run().catch((err) => {
  console.error("✗ Reset failed:", err.message ?? err);
  process.exit(1);
});
