// Shared domain types + pure display helpers. The public app imports from here
// (not lib/mock.ts, which now only feeds the seed script).

export type MeatType = "pork" | "beef_pork";

export type DropFlavor = {
  id: string;
  drop_id: string;
  name: string;
  meat_type: MeatType;
  description: string;
  price_cents: number | null;
  sold_out: boolean;
  photo_url: string | null;
  votes: number;
};

export type Drop = {
  id: string;
  week_label: string;
  status: "active" | "archived";
  flavors: DropFlavor[];
};

export type MerchItem = {
  id: string;
  name: string;
  price_cents: number;
  sizes_note: string;
  photo_url: string | null;
  square_link: string;
  active: boolean;
  sort: number;
};

/** A deduped archive entry: how a flavor appears on /flavors. */
export type ArchiveFlavor = {
  name: string;
  meat_type: MeatType;
  made_count: number;
  votes: number;
};

/** Typed result every server action returns — forms render these, never throw. */
export type ActionResult = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

/** Format cents as a price string; null → "$—". */
export function formatPrice(cents: number | null): string {
  if (cents === null) return "$—";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function meatTypeLabel(meat: MeatType): string {
  return meat === "pork" ? "100% PORK" : "BEEF & PORK";
}
