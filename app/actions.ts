"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getActiveDrop } from "@/lib/queries";
import { sendReserveEmail } from "@/lib/email";
import { checkReserveRateLimit } from "@/lib/rate-limit";
import { reserveSchema, resolveReserveFlavor } from "@/lib/reserve-core";
import { meatTypeLabel, type ActionResult } from "@/lib/types";

/** Map a ZodError to our flat fieldErrors shape. */
function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

async function callerIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

// ── Reserve ──────────────────────────────────────────────────────────────────

export async function reserveSubmit(input: unknown): Promise<ActionResult> {
  try {
    const parsed = reserveSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: "Please fix the highlighted fields.",
        fieldErrors: fieldErrorsFrom(parsed.error),
      };
    }
    const { name, contact, flavorId, quantity } = parsed.data;

    // Authoritative server-side check: flavor must belong to the active drop
    // and not be sold out — even if the client was bypassed.
    const drop = await getActiveDrop();
    if (!drop) return { ok: false, message: "There's no active drop right now." };
    const resolved = resolveReserveFlavor(drop, flavorId);
    if (!resolved.ok) {
      return {
        ok: false,
        message: resolved.message,
        ...(resolved.fieldErrors ? { fieldErrors: resolved.fieldErrors } : {}),
      };
    }
    const flavor = resolved.flavor;

    // Rate limit: 5/hour/IP (cross-instance via submission_guard).
    const { allowed } = await checkReserveRateLimit(await callerIp());
    if (!allowed) {
      return {
        ok: false,
        message: "Too many requests — please try again in a little while.",
      };
    }

    const { error: insertError } = await supabaseAdmin
      .from("interest_submissions")
      .insert({
        drop_id: drop.id,
        flavor_id: flavor.id,
        name,
        contact,
        quantity,
      });
    if (insertError) {
      console.error("[reserveSubmit] insert failed:", insertError.message);
      return {
        ok: false,
        message: "Something went wrong saving your reservation. Try again.",
      };
    }

    // Email is best-effort — the reservation is already saved.
    const email = await sendReserveEmail({
      flavorName: flavor.name,
      meatTypeLabel: meatTypeLabel(flavor.meat_type),
      weekLabel: drop.week_label,
      customerName: name,
      contact,
      quantity,
    });
    if (!email.sent) {
      console.warn("[reserveSubmit] owner email not sent:", email.error);
    }

    return {
      ok: true,
      message: "You're on the list — we'll reach out to confirm pickup.",
    };
  } catch (err) {
    console.error("[reserveSubmit] unexpected:", err);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

// ── Notify-me ────────────────────────────────────────────────────────────────

const notifySchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
});

export async function notifySubmit(input: unknown): Promise<ActionResult> {
  try {
    const parsed = notifySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: "Enter a valid email address.",
        fieldErrors: fieldErrorsFrom(parsed.error),
      };
    }

    const { error } = await supabaseAdmin
      .from("email_list")
      .insert({ email: parsed.data.email.toLowerCase() });

    if (error) {
      // 23505 = unique_violation → already subscribed. Treat as a friendly win.
      if (error.code === "23505") {
        return { ok: true, message: "You're already on the list." };
      }
      console.error("[notifySubmit] insert failed:", error.message);
      return { ok: false, message: "Couldn't add you just now. Try again." };
    }

    return { ok: true, message: "You're on the list — watch for the next drop." };
  } catch (err) {
    console.error("[notifySubmit] unexpected:", err);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

// ── Vote a flavor back ───────────────────────────────────────────────────────

const voteSchema = z.object({ name: z.string().trim().min(1) });

export async function voteFlavor(input: unknown): Promise<ActionResult> {
  try {
    const parsed = voteSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Invalid vote." };

    // Increment one representative row for this flavor name; getArchiveFlavors
    // sums votes across rows, so the archive total goes up by one.
    const { data: row, error: findError } = await supabaseAdmin
      .from("drop_flavors")
      .select("id, votes")
      .eq("name", parsed.data.name)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (findError || !row) {
      return { ok: false, message: "Couldn't record that vote." };
    }

    const { error: updateError } = await supabaseAdmin
      .from("drop_flavors")
      .update({ votes: (row.votes ?? 0) + 1 })
      .eq("id", row.id);

    if (updateError) {
      console.error("[voteFlavor] update failed:", updateError.message);
      return { ok: false, message: "Couldn't record that vote." };
    }

    revalidatePath("/flavors");
    return { ok: true, message: "Vote counted." };
  } catch (err) {
    console.error("[voteFlavor] unexpected:", err);
    return { ok: false, message: "Couldn't record that vote." };
  }
}
