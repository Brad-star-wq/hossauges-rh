"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import { setAdminCookie, clearAdminCookie } from "@/lib/admin-session";

// In-memory login lockout: 5 failed attempts per IP within 15 minutes.
// NOTE: per-instance only (resets on cold start / not shared across serverless
// instances). Acceptable for a low-traffic 2-owner admin behind a strong shared
// password; harden with a DB-backed guard table if abuse is seen.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; first: number }>();

function ipKey(ip: string): string {
  return ip || "unknown";
}

function lockState(ip: string): { locked: boolean; retryMinutes: number } {
  const rec = attempts.get(ipKey(ip));
  if (!rec) return { locked: false, retryMinutes: 0 };
  if (Date.now() - rec.first > WINDOW_MS) {
    attempts.delete(ipKey(ip));
    return { locked: false, retryMinutes: 0 };
  }
  if (rec.count >= MAX_ATTEMPTS) {
    const retryMinutes = Math.ceil((WINDOW_MS - (Date.now() - rec.first)) / 60000);
    return { locked: true, retryMinutes };
  }
  return { locked: false, retryMinutes: 0 };
}

function recordFail(ip: string): void {
  const key = ipKey(ip);
  const rec = attempts.get(key);
  if (!rec || Date.now() - rec.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: Date.now() });
  } else {
    rec.count += 1;
  }
}

/** Constant-time equality that doesn't early-return on length mismatch. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab); // burn equivalent work
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export type LoginState = { error?: string };

export async function adminLogin(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";

  const { locked, retryMinutes } = lockState(ip);
  if (locked) {
    return { error: `Too many tries. Wait ${retryMinutes} min and try again.` };
  }

  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD ?? "";

  if (!expected) {
    return { error: "Admin password isn't configured. Set ADMIN_PASSWORD." };
  }
  if (!password || !safeEqual(password, expected)) {
    recordFail(ip);
    const after = lockState(ip);
    return {
      error: after.locked
        ? `Too many tries. Wait ${after.retryMinutes} min and try again.`
        : "Wrong password.",
    };
  }

  attempts.delete(ipKey(ip)); // success clears the counter
  await setAdminCookie();
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  await clearAdminCookie();
  redirect("/admin/login");
}
