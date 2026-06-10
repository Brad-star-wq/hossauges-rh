/**
 * RESET TO EMPTY (clean handoff). Wipes ALL content so the owners start fresh:
 * deletes every row from drops, drop_flavors, merch_items, interest_submissions,
 * email_list (and the transient submission_guard), and empties the photos bucket.
 *
 *   npm run reset
 *
 * Guarded by a typed confirmation so it can't fire by accident. After it runs:
 *   /drop    → "Next drop is in the works."
 *   /merch   → "Merch restock coming soon."
 *   /flavors → empty
 * Then the owners add real content through the dashboard.
 */
import { config } from "dotenv";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createClient } from "@supabase/supabase-js";

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
  await wipe("submission_guard");
  await wipe("drop_flavors");
  await wipe("drops");
  await wipe("merch_items");
  await wipe("email_list");
  await emptyPhotosBucket();

  console.log("\n✓ Reset complete. The site now shows clean empty states.");
}

run().catch((err) => {
  console.error("✗ Reset failed:", err.message ?? err);
  process.exit(1);
});
