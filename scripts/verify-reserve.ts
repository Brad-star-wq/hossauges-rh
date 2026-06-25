/**
 * Reserve-flow verification (Round 9: multi-flavor). Run after migration + seed:
 *   npx tsx scripts/verify-reserve.ts
 *
 * Proves: (1) a valid multi-flavor reserve INSERTS a parent + per-flavor line
 * items into Supabase, and (2) the authoritative core rejects a sold-out /
 * unknown flavor and bad input — the exact reserveSchema + resolveReserveItems
 * the server action runs. Does NOT send email (that's the live test you trigger).
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { reserveSchema, resolveReserveItems } from "../lib/reserve-core";
import type { Drop } from "../lib/types";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(url, service, { auth: { persistSession: false } });
const pub = createClient(url, anon, { auth: { persistSession: false } });

let failures = 0;
function check(name: string, passed: boolean, detail = "") {
  console.log(`${passed ? "✓ PASS" : "✗ FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) failures++;
}

async function getActiveDrop(): Promise<Drop | null> {
  const { data } = await pub
    .from("drops")
    .select("id, week_label, status, drop_flavors(id, drop_id, name, meat_type, description, price_cents, sold_out, photo_url, votes)")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, week_label: data.week_label, status: data.status, flavors: data.drop_flavors } as Drop;
}

async function run() {
  const drop = await getActiveDrop();
  if (!drop) {
    console.error("No active drop — run `npm run seed` first.");
    process.exit(1);
  }
  const available = drop.flavors.filter((f) => !f.sold_out);
  const soldOut = drop.flavors.find((f) => f.sold_out);
  check("active drop has at least one available flavor", available.length > 0,
    `available=${available.map((f) => f.name).join(", ")}`);
  if (available.length === 0) process.exit(1);

  // 1) Authoritative rejection of a SOLD-OUT flavor (client bypass simulated).
  if (soldOut) {
    const soldRes = resolveReserveItems(drop, [{ flavorId: soldOut.id, quantity: 1 }]);
    check("server-side rejects a SOLD-OUT flavor", soldRes.ok === false,
      soldRes.ok ? "accepted!" : soldRes.message);
  } else {
    console.log("  (no sold-out flavor seeded — skipping sold-out rejection check)");
  }

  // 1b) Rejection of an unknown flavor id, and of invalid input.
  const unknownRes = resolveReserveItems(drop, [
    { flavorId: "00000000-0000-0000-0000-000000000000", quantity: 1 },
  ]);
  check("server-side rejects an unknown flavor", unknownRes.ok === false);

  const badInput = reserveSchema.safeParse({
    name: "A",
    contact: "nope",
    items: [{ flavorId: available[0].id, quantity: 0 }],
  });
  check("schema rejects bad input (short name / bad contact / no qty)", badInput.success === false,
    badInput.success ? "accepted!" : Object.keys(badInput.error.flatten().fieldErrors).join(","));

  // 2) HAPPY PATH — multi-flavor: validate, resolve, INSERT parent + items, read, clean up.
  const marker = `verify-reserve-${Date.now()}`;
  const wanted = available.slice(0, 2); // up to two flavors
  const items = wanted.map((f, i) => ({ flavorId: f.id, quantity: (i + 1) * 2 })); // 2, 4, ...
  const goodInput = reserveSchema.safeParse({ name: marker, contact: "tester@example.com", items });
  check("schema accepts a valid multi-flavor order", goodInput.success);
  const goodRes = resolveReserveItems(drop, items);
  check("server-side accepts the available flavors", goodRes.ok === true,
    goodRes.ok ? `${goodRes.items.length} item(s)` : goodRes.message);

  if (goodInput.success && goodRes.ok) {
    const { data: parent, error: pErr } = await db
      .from("interest_submissions")
      .insert({ drop_id: drop.id, name: marker, contact: "tester@example.com" })
      .select("id")
      .single();
    check("parent reserve row INSERTS", !pErr && !!parent, pErr?.message);

    if (parent) {
      const { error: iErr } = await db.from("interest_items").insert(
        goodRes.items.map(({ flavor, quantity }) => ({
          submission_id: parent.id,
          flavor_id: flavor.id,
          flavor_name: flavor.name,
          quantity,
        })),
      );
      check("per-flavor line items INSERT", !iErr, iErr?.message);

      const { data: rows } = await db
        .from("interest_items")
        .select("flavor_name, quantity")
        .eq("submission_id", parent.id)
        .order("created_at", { ascending: true });
      check("line items are READABLE (service role)", (rows?.length ?? 0) === goodRes.items.length,
        `found ${rows?.length ?? 0}: ${(rows ?? []).map((r) => `${r.flavor_name}×${r.quantity}`).join(", ")}`);

      // Cascade delete removes the children too.
      await db.from("interest_submissions").delete().eq("id", parent.id);
      console.log("  (cleaned up test rows)");
    }
  }

  console.log(`\n${failures === 0 ? "All reserve checks passed." : `${failures} check(s) FAILED.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((e) => { console.error("✗ crashed:", e.message ?? e); process.exit(1); });
