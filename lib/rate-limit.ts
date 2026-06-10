import "server-only";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_PER_HOUR = 5;
const WINDOW_MS = 60 * 60 * 1000;

/** Salted, non-reversible hash of the caller IP (never store raw IPs). */
function hashIp(ip: string): string {
  const salt = process.env.SESSION_SECRET ?? "hossauges";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/**
 * Cross-instance rate limit backed by the submission_guard table (5/hour/IP).
 * Records the hit when allowed. Fails OPEN if the table is missing (migration
 * 002 not yet applied) so the form still works in that window — log warns.
 */
export async function checkReserveRateLimit(
  ip: string,
): Promise<{ allowed: boolean }> {
  const ipHash = hashIp(ip);
  const since = new Date(Date.now() - WINDOW_MS).toISOString();

  const { count, error } = await supabaseAdmin
    .from("submission_guard")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if (error) {
    // 42P01 = undefined_table — migration 002 not applied. Don't block users.
    console.warn(
      `[rate-limit] guard check skipped (${error.code ?? "error"}): ${error.message}`,
    );
    return { allowed: true };
  }

  if ((count ?? 0) >= MAX_PER_HOUR) return { allowed: false };

  await supabaseAdmin.from("submission_guard").insert({ ip_hash: ipHash });
  return { allowed: true };
}
