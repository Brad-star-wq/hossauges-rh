// Pure, dependency-light core for reserve validation so it can be unit-tested
// without the Next request context. Imported by app/actions.ts (the server
// action) and by scripts/verify-reserve.ts. Relative imports only (tsx-safe).
import { z } from "zod";
import type { Drop, DropFlavor } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailOrPhone(value: string): boolean {
  if (EMAIL_RE.test(value)) return true;
  return value.replace(/\D/g, "").length === 10; // 10-digit US phone
}

// One line item from the form: a flavor + how many 3-packs (0 = not chosen).
export const reserveItemSchema = z.object({
  flavorId: z.string().trim().min(1),
  quantity: z.coerce.number().int().min(0, "Quantity can't be negative."),
});

// Multi-flavor order (Round 9): name + contact + a quantity per flavor. No cap;
// must choose at least one flavor with quantity > 0.
export const reserveSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name."),
  contact: z
    .string()
    .trim()
    .min(1, "Enter an email or phone number.")
    .refine(isEmailOrPhone, "Enter a valid email or 10-digit phone number."),
  items: z
    .array(reserveItemSchema)
    .min(1, "Pick at least one flavor.")
    .refine((items) => items.some((i) => i.quantity > 0), {
      message: "Add a quantity to at least one flavor.",
    }),
});

export type ReserveInput = z.infer<typeof reserveSchema>;

export type ResolvedItem = { flavor: DropFlavor; quantity: number };

export type ReserveResolution =
  | { ok: true; items: ResolvedItem[] }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/**
 * Authoritative check: every chosen flavor (quantity > 0) must belong to the
 * active drop and not be sold out. Server-side source of truth — runs even if
 * the client was bypassed. Returns the resolved line items in board order.
 */
export function resolveReserveItems(
  drop: Drop | null,
  items: { flavorId: string; quantity: number }[],
): ReserveResolution {
  if (!drop) return { ok: false, message: "There's no active drop right now." };

  const chosen = items.filter((i) => i.quantity > 0);
  if (chosen.length === 0) {
    return {
      ok: false,
      message: "Add a quantity to at least one flavor.",
      fieldErrors: { items: "Pick at least one flavor and set a quantity." },
    };
  }

  // Resolve in the drop's flavor order for a stable, friendly listing.
  const byId = new Map(chosen.map((c) => [c.flavorId, c.quantity]));
  const resolved: ResolvedItem[] = [];
  for (const flavor of drop.flavors) {
    const quantity = byId.get(flavor.id);
    if (quantity == null) continue;
    if (flavor.sold_out) {
      return {
        ok: false,
        message: `${flavor.name} just sold out.`,
        fieldErrors: { items: `${flavor.name} is sold out — set it back to 0.` },
      };
    }
    resolved.push({ flavor, quantity });
    byId.delete(flavor.id);
  }
  // Anything left was a flavor id not on the current board.
  if (byId.size > 0) {
    return {
      ok: false,
      message: "One of those flavors isn't part of this week's drop.",
      fieldErrors: { items: "The menu changed — refresh and try again." },
    };
  }

  return { ok: true, items: resolved };
}

/** Short "Flavor ×N, Flavor ×N" summary for emails + success messages. */
export function summarizeItems(items: { flavor: DropFlavor; quantity: number }[]): string {
  return items.map((i) => `${i.flavor.name} ×${i.quantity}`).join(", ");
}
