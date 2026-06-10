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

export const reserveSchema = z.object({
  name: z.string().trim().min(2, "Tell us your name."),
  contact: z
    .string()
    .trim()
    .min(1, "Enter an email or phone number.")
    .refine(isEmailOrPhone, "Enter a valid email or 10-digit phone number."),
  flavorId: z.string().trim().min(1, "Pick a flavor."),
  quantity: z.coerce
    .number()
    .int()
    .min(1, "At least 1 pack.")
    .max(10, "10 packs max."),
});

export type ReserveInput = z.infer<typeof reserveSchema>;

export type FlavorResolution =
  | { ok: true; flavor: DropFlavor }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

/**
 * Authoritative check: the chosen flavor must belong to the active drop and not
 * be sold out. Server-side source of truth — runs even if the client was bypassed.
 */
export function resolveReserveFlavor(
  drop: Drop | null,
  flavorId: string,
): FlavorResolution {
  if (!drop) return { ok: false, message: "There's no active drop right now." };

  const flavor = drop.flavors.find((f) => f.id === flavorId);
  if (!flavor) {
    return {
      ok: false,
      message: "That flavor isn't part of this week's drop.",
      fieldErrors: { flavor: "Pick a flavor that's on the board." },
    };
  }
  if (flavor.sold_out) {
    return {
      ok: false,
      message: "That flavor just sold out.",
      fieldErrors: { flavor: "Sold out — pick another flavor." },
    };
  }
  return { ok: true, flavor };
}
