"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getActiveDrop } from "@/lib/queries";
import { sendReserveEmail, sendPreorderEmail } from "@/lib/email";
import { checkReserveRateLimit } from "@/lib/rate-limit";
import { reserveSchema, resolveReserveItems, summarizeItems, isEmailOrPhone } from "@/lib/reserve-core";
import { type ActionResult } from "@/lib/types";

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
    const { name, contact, items } = parsed.data;

    // Authoritative server-side check: every chosen flavor must belong to the
    // active drop and not be sold out — even if the client was bypassed.
    const drop = await getActiveDrop();
    if (!drop) return { ok: false, message: "There's no active drop right now." };
    const resolved = resolveReserveItems(drop, items);
    if (!resolved.ok) {
      return {
        ok: false,
        message: resolved.message,
        ...(resolved.fieldErrors ? { fieldErrors: resolved.fieldErrors } : {}),
      };
    }
    const lineItems = resolved.items;

    // Rate limit: 5/hour/IP (cross-instance via submission_guard).
    const { allowed } = await checkReserveRateLimit(await callerIp());
    if (!allowed) {
      return {
        ok: false,
        message: "Too many requests — please try again in a little while.",
      };
    }

    // One combined submission: a parent row + a child row per flavor.
    const { data: parent, error: parentError } = await supabaseAdmin
      .from("interest_submissions")
      .insert({ drop_id: drop.id, name, contact })
      .select("id")
      .single();
    if (parentError || !parent) {
      console.error("[reserveSubmit] parent insert failed:", parentError?.message);
      return {
        ok: false,
        message: "Something went wrong saving your reservation. Try again.",
      };
    }

    const { error: itemsError } = await supabaseAdmin.from("interest_items").insert(
      lineItems.map(({ flavor, quantity }) => ({
        submission_id: parent.id,
        flavor_id: flavor.id,
        flavor_name: flavor.name,
        quantity,
      })),
    );
    if (itemsError) {
      console.error("[reserveSubmit] items insert failed:", itemsError.message);
      // Roll back the orphaned parent so we never store a reservation with no
      // line items (best-effort).
      await supabaseAdmin.from("interest_submissions").delete().eq("id", parent.id);
      return {
        ok: false,
        message: "Something went wrong saving your reservation. Try again.",
      };
    }

    // ONE owner email listing every flavor + quantity. Best-effort — the
    // reservation is already saved.
    const email = await sendReserveEmail({
      weekLabel: drop.week_label,
      customerName: name,
      contact,
      items: lineItems.map(({ flavor, quantity }) => ({
        flavorName: flavor.name,
        quantity,
      })),
    });
    if (!email.sent) {
      console.warn("[reserveSubmit] owner email not sent:", email.error);
    }

    return {
      ok: true,
      message: `Reserved: ${summarizeItems(lineItems)}. We'll reach out to confirm pickup.`,
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

// ── Pre-order signup (public; separate from the weekly reserve flow) ──────────

const preorderSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name."),
  contact: z
    .string()
    .trim()
    .min(1, "Enter an email or phone number.")
    .refine(isEmailOrPhone, "Enter a valid email or 10-digit phone number."),
  items: z.string().trim().min(1, "Pick at least one item."),
});

export async function preorderSubmit(input: unknown): Promise<ActionResult> {
  try {
    const parsed = preorderSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        message: "Please fix the highlighted fields.",
        fieldErrors: fieldErrorsFrom(parsed.error),
      };
    }
    const { name, contact, items } = parsed.data;

    const { allowed } = await checkReserveRateLimit(await callerIp());
    if (!allowed) {
      return { ok: false, message: "Too many requests — please try again in a little while." };
    }

    const { error } = await supabaseAdmin
      .from("preorder_signups")
      .insert({ name, contact, items });
    if (error) {
      console.error("[preorderSubmit] insert failed:", error.message);
      return { ok: false, message: "Something went wrong saving your pre-order. Try again." };
    }

    const email = await sendPreorderEmail({ customerName: name, contact, items });
    if (!email.sent) console.warn("[preorderSubmit] owner email not sent:", email.error);

    return { ok: true, message: "You're on the pre-order list — we'll be in touch." };
  } catch (err) {
    console.error("[preorderSubmit] unexpected:", err);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}
