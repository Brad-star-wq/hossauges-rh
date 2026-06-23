/**
 * Seed the database to mirror lib/mock.ts exactly. Run with the service role:
 *   npm run seed
 *
 * Idempotent: drops/merch are upserted by fixed id, and a drop's flavors are
 * fully replaced each run, so re-running converges to the same state.
 *
 * Archive modeling decision (SPEC §5 offered two options):
 *   We use ONE archived catch-all drop ("ARCHIVE — PAST DROPS"). Each historical
 *   flavor is inserted `made_count` times across the active + archive drops, so
 *   getArchiveFlavors() — which dedupes by name and counts rows — derives the
 *   correct "made ×N". Votes are placed so the per-name sum equals the mock total
 *   (the flavor's occurrence in the active drop already carries its votes).
 */
import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { activeDrop, archiveFlavors } from "../lib/mock";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Fixed ids so re-seeding is stable.
const ACTIVE_DROP_ID = "11111111-1111-4111-8111-111111111111";
const ARCHIVE_DROP_ID = "22222222-2222-4222-8222-222222222222";
const ACTIVE_FLAVOR_IDS: Record<string, string> = {
  "Jalapeño Pimento Brisket": "11111111-1111-4111-8111-0000000000a1",
  "Blueberry Gouda": "11111111-1111-4111-8111-0000000000a2",
};
async function run() {
  const now = new Date().toISOString();

  // 1) Drops (active + archive catch-all) — upsert by id.
  const { error: dropsErr } = await db.from("drops").upsert(
    [
      {
        id: ACTIVE_DROP_ID,
        week_label: activeDrop.week_label,
        status: "active",
        published_at: now,
      },
      {
        id: ARCHIVE_DROP_ID,
        week_label: "ARCHIVE — PAST DROPS",
        status: "archived",
        published_at: now,
      },
    ],
    { onConflict: "id" },
  );
  if (dropsErr) throw dropsErr;

  // 2) Replace all flavors for these two drops (idempotent).
  const { error: delErr } = await db
    .from("drop_flavors")
    .delete()
    .in("drop_id", [ACTIVE_DROP_ID, ARCHIVE_DROP_ID]);
  if (delErr) throw delErr;

  // 2a) Active drop flavors (exact mock values, stable ids).
  const activeRows = activeDrop.flavors.map((f) => ({
    id: ACTIVE_FLAVOR_IDS[f.name] ?? randomUUID(),
    drop_id: ACTIVE_DROP_ID,
    name: f.name,
    meat_type: f.meat_type,
    description: f.description,
    price_cents: f.price_cents,
    sold_out: f.sold_out,
    photo_url: f.photo_url,
    votes: f.votes,
  }));

  // 2b) Archive rows — enough extra rows per flavor to reach made_count, with
  //     votes balanced against what the active drop already contributes.
  const archiveRows: Array<Record<string, unknown>> = [];
  for (const f of archiveFlavors) {
    const inActive = activeDrop.flavors.filter((a) => a.name === f.name);
    const activeCount = inActive.length;
    const activeVotes = inActive.reduce((s, a) => s + a.votes, 0);

    const extraRows = Math.max(0, f.made_count - activeCount);
    const remainingVotes = Math.max(0, f.votes - activeVotes);

    for (let i = 0; i < extraRows; i++) {
      archiveRows.push({
        id: randomUUID(),
        drop_id: ARCHIVE_DROP_ID,
        name: f.name,
        meat_type: f.meat_type,
        description: null,
        price_cents: null,
        sold_out: false,
        photo_url: null,
        // Put the leftover votes on the first archive row, 0 on the rest.
        votes: i === 0 ? remainingVotes : 0,
      });
    }
  }

  const { error: flavErr } = await db
    .from("drop_flavors")
    .insert([...activeRows, ...archiveRows]);
  if (flavErr) throw flavErr;

  // Merch is no longer seeded — it lives in Square (Round 6).

  console.log("✓ Seed complete");
  console.log(`  drops:        2 (1 active "${activeDrop.week_label}", 1 archive)`);
  console.log(
    `  drop_flavors: ${activeRows.length + archiveRows.length} (${activeRows.length} active + ${archiveRows.length} archive)`,
  );
}

run().catch((err) => {
  console.error("✗ Seed failed:", err.message ?? err);
  process.exit(1);
});
