// Shared domain types + pure display helpers + site constants. The public app
// imports from here (not lib/mock.ts, which now only feeds the seed script).

/** Canonical site URL — override with NEXT_PUBLIC_SITE_URL in Vercel. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://hossauges.com"
).replace(/\/$/, "");
export const SITE_NAME = "Hossauges";
export const SITE_TAGLINE = "Small-batch sausage, Columbia SC";
export const SITE_DESCRIPTION =
  "Small-batch custom sausage from Columbia, SC. New flavors drop weekly — reserve your packs.";


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

export type GalleryItem = {
  id: string;
  type: "photo" | "video";
  url: string;
  sort: number;
};

/** Editable single fields (site_content key/value store). */
export type SiteContent = {
  home_hero_url: string;
  about_hero_url: string;
  about_paragraph: string;
};

export const DEFAULT_ABOUT_PARAGRAPH =
  "Hossauges started in 2024 in Columbia, SC. We make about a hundred pounds of small-batch sausage a week, two new flavors at a time. Everything is ground, stuffed, smoked, and packed by hand.";

export const DEFAULT_SITE_CONTENT: SiteContent = {
  home_hero_url: "",
  about_hero_url: "",
  about_paragraph: DEFAULT_ABOUT_PARAGRAPH,
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
