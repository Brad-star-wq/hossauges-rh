/**
 * Reserve-flow verification (Session 6). Run after migration + seed:
 *   npx tsx scripts/verify-reserve.ts
 *
 * Proves: (1) a valid reserve INSERTS a row into Supabase, and (2) the
 * authoritative core rejects a sold-out / unknown flavor and bad input — the
 * exact reserveSchema + resolveReserveFlavor the server action runs. Does NOT
 * send email (that's the live test you trigger).
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { reserveSchema, resolveReserveFlavor } from "../lib/reserve-core";
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
  const available = drop.flavors.find((f) => !f.sold_out);
  const soldOut = drop.flavors.find((f) => f.sold_out);
  check("active drop has an available + a sold-out flavor", !!available && !!soldOut,
    `available=${available?.name}, soldOut=${soldOut?.name}`);
  if (!available || !soldOut) process.exit(1);

  // 1) Authoritative rejection of a SOLD-OUT flavor (client bypass simulated).
  const soldRes = resolveReserveFlavor(drop, soldOut.id);
  check("server-side rejects SOLD-OUT flavor", soldRes.ok === false,
    soldRes.ok ? "accepted!" : soldRes.message);

  // 1b) Rejection of an unknown flavor id and of invalid input.
  const unknownRes = resolveReserveFlavor(drop, "00000000-0000-0000-0000-000000000000");
  check("server-side rejects unknown flavor", unknownRes.ok === false);
  const badInput = reserveSchema.safeParse({ name: "A", contact: "nope", flavorId: available.id, quantity: 99 });
  check("schema rejects bad input (short name / bad contact / qty>10)", badInput.success === false,
    badInput.success ? "accepted!" : Object.keys(badInput.error.flatten().fieldErrors).join(","));

  // 2) HAPPY PATH — validate, resolve, INSERT, confirm row lands, clean up.
  const marker = `verify-reserve-${Date.now()}`;
  const goodInput = reserveSchema.safeParse({
    name: marker, contact: "tester@example.com", flavorId: available.id, quantity: 2,
  });
  check("schema accepts valid input", goodInput.success);
  const goodRes = resolveReserveFlavor(drop, available.id);
  check("server-side accepts available flavor", goodRes.ok === true);

  if (goodInput.success && goodRes.ok) {
    const { error: insErr } = await db.from("interest_submissions").insert({
      drop_id: drop.id,
      flavor_id: goodRes.flavor.id,
      name: goodInput.data.name,
      contact: goodInput.data.contact,
      quantity: goodInput.data.quantity,
    });
    check("reserve row INSERTS into Supabase", !insErr, insErr?.message);

    const { data: rows } = await db
      .from("interest_submissions")
      .select("id, name, flavor_id, quantity")
      .eq("name", marker);
    check("reserve row is READABLE in Supabase (service role)", (rows?.length ?? 0) === 1,
      `found ${rows?.length ?? 0} row(s), qty=${rows?.[0]?.quantity}`);

    await db.from("interest_submissions").delete().eq("name", marker);
    console.log("  (cleaned up test row)");
  }

  console.log(`\n${failures === 0 ? "All reserve checks passed." : `${failures} check(s) FAILED.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((e) => { console.error("✗ crashed:", e.message ?? e); process.exit(1); });
