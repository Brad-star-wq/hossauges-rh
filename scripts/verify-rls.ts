/**
 * RLS smoke test (Session 5 acceptance). Run after the migration + seed:
 *   npm run verify:rls
 *
 * Confirms the anon key can read public tables but cannot read
 * interest_submissions/email_list or write to drops, and that the active-drop
 * query (mirroring getActiveDrop) returns the Week of June 9 drop.
 *
 * Self-contained: builds its own anon + service clients so it doesn't rely on
 * the app's "@/" path alias being resolvable under tsx.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !anonKey || !serviceKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const svc = createClient(url, serviceKey, { auth: { persistSession: false } });

let failures = 0;
function check(name: string, passed: boolean, detail = "") {
  console.log(`${passed ? "✓ PASS" : "✗ FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!passed) failures++;
}

async function run() {
  const marker = `rls-test-${Date.now()}`;

  // A) anon can read drops (public select)
  {
    const { data, error } = await anon.from("drops").select("id, week_label, status");
    check(
      "anon CAN read drops",
      !error && Array.isArray(data) && data.length > 0,
      error ? error.message : `${data?.length ?? 0} rows`,
    );
  }

  // B) anon CANNOT write to drops
  {
    const { error } = await anon
      .from("drops")
      .insert({ week_label: marker, status: "archived" });
    check("anon CANNOT write to drops", !!error, error ? `blocked (${error.code ?? "error"})` : "INSERT SUCCEEDED");
  }

  // C) anon can INSERT a submission but CANNOT read it back
  {
    const { error: insErr } = await anon.from("interest_submissions").insert({
      name: marker,
      contact: "test@example.com",
      quantity: 1,
    });
    const { data: anonRead } = await anon
      .from("interest_submissions")
      .select("id")
      .eq("name", marker);
    const { data: svcRead } = await svc
      .from("interest_submissions")
      .select("id")
      .eq("name", marker);

    check("anon CAN insert interest_submissions", !insErr, insErr?.message);
    check(
      "anon CANNOT read interest_submissions",
      (anonRead?.length ?? 0) === 0,
      `anon saw ${anonRead?.length ?? 0} rows; service saw ${svcRead?.length ?? 0}`,
    );

    // cleanup
    await svc.from("interest_submissions").delete().eq("name", marker);
  }

  // D) anon can INSERT email but CANNOT read the list
  {
    const email = `${marker}@example.com`;
    const { error: insErr } = await anon.from("email_list").insert({ email });
    const { data: anonRead } = await anon.from("email_list").select("id").eq("email", email);
    check("anon CAN insert email_list", !insErr, insErr?.message);
    check("anon CANNOT read email_list", (anonRead?.length ?? 0) === 0);
    await svc.from("email_list").delete().eq("email", email);
  }

  // E) merch read is restricted to active items
  {
    const { data } = await anon.from("merch_items").select("name, active");
    const allActive = (data ?? []).every((m) => m.active === true);
    const hiddenLeaked = (data ?? []).some((m) => m.name === "Retired Trucker Hat");
    check(
      "anon merch read returns only active items",
      allActive && !hiddenLeaked,
      `${data?.length ?? 0} rows, hidden leaked: ${hiddenLeaked}`,
    );
  }

  // F) active-drop query (mirrors getActiveDrop) returns Week of June 9
  {
    const { data, error } = await anon
      .from("drops")
      .select("week_label, status, drop_flavors(name)")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    const ok =
      !error &&
      data?.week_label === "WEEK OF JUNE 9" &&
      (data?.drop_flavors?.length ?? 0) === 2;
    check(
      "getActiveDrop returns the Week of June 9 drop (2 flavors)",
      ok,
      error ? error.message : `week_label="${data?.week_label}", flavors=${data?.drop_flavors?.length ?? 0}`,
    );
  }

  console.log(`\n${failures === 0 ? "All RLS checks passed." : `${failures} check(s) FAILED.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((err) => {
  console.error("✗ verify-rls crashed:", err.message ?? err);
  process.exit(1);
});
