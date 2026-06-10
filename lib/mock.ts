// Mock data for Sessions 2–4. Shapes mirror the future Supabase schema (SPEC §5)
// so swapping in real queries (Session 6) is a drop-in. Prices are in cents;
// a null price renders as "$—" (TBD), matching the brisket in CLAUDE.md.

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

// ── Active drop — "WEEK OF JUNE 9" ──────────────────────────────────────
export const activeDrop: Drop = {
  id: "drop-week-of-june-9",
  week_label: "WEEK OF JUNE 9",
  status: "active",
  flavors: [
    {
      id: "flv-jalapeno-pimento-brisket",
      drop_id: "drop-week-of-june-9",
      name: "Jalapeño Pimento Brisket",
      meat_type: "beef_pork",
      description:
        "Smoked brisket, sharp pimento cheese, and fresh jalapeño. Rich, a little heat, no apologies.",
      price_cents: null, // "$—" — price TBD
      sold_out: true,
      photo_url: null,
      votes: 42,
    },
    {
      id: "flv-blueberry-gouda",
      drop_id: "drop-week-of-june-9",
      name: "Blueberry Gouda",
      meat_type: "pork",
      description:
        "Sweet blueberry and smoky melted gouda in a snappy pork link. The surprise favorite.",
      price_cents: 1800,
      sold_out: false,
      photo_url: null,
      votes: 31,
    },
  ],
};

/**
 * Toggle to verify the /drop empty state (Session 3). When null, the Drop page
 * shows "NEXT DROP IS IN THE WORKS." Flip the export below to test.
 */
export const currentDrop: Drop | null = activeDrop;

// ── All-time flavor archive (CLAUDE.md flavor list) ─────────────────────
// made_count / votes are mock values; the real dedupe + sums arrive in Session 5.
export const archiveFlavors: ArchiveFlavor[] = [
  // 100% Pork
  { name: "Blueberry Gouda", meat_type: "pork", made_count: 3, votes: 31 },
  { name: "Sweet Italian", meat_type: "pork", made_count: 5, votes: 12 },
  { name: "Maple Bacon Gouda", meat_type: "pork", made_count: 4, votes: 27 },
  { name: "Pepperoni Pizza", meat_type: "pork", made_count: 2, votes: 19 },
  { name: "Peach Cobbler", meat_type: "pork", made_count: 1, votes: 22 },
  { name: "Hot Honey Apple Brie", meat_type: "pork", made_count: 2, votes: 15 },
  { name: "Pineapple Al-Pastor", meat_type: "pork", made_count: 2, votes: 18 },
  // Beef & Pork Mix
  { name: "Jalapeño Pimento Brisket", meat_type: "beef_pork", made_count: 4, votes: 42 },
  { name: "Fajita Brisket", meat_type: "beef_pork", made_count: 3, votes: 24 },
  { name: "Philly Cheesesteak", meat_type: "beef_pork", made_count: 3, votes: 33 },
  { name: "Italian", meat_type: "beef_pork", made_count: 6, votes: 9 },
  { name: "Mexican Street Corn", meat_type: "beef_pork", made_count: 2, votes: 21 },
  { name: "Rosemary Truffle Parm", meat_type: "beef_pork", made_count: 1, votes: 29 },
  { name: "French Onion", meat_type: "beef_pork", made_count: 2, votes: 26 },
  { name: "Korean Beef Bulgogi", meat_type: "beef_pork", made_count: 3, votes: 38 },
];

/** Every flavor name ever made — for the marquee ticker. */
export const allTimeFlavorNames: string[] = archiveFlavors.map((f) => f.name);

// ── Merch (3 active + 1 inactive to verify the active filter, Session 4) ─
export const merchItems: MerchItem[] = [
  {
    id: "merch-4th-tee",
    name: "4th of July Tee",
    price_cents: 3000,
    sizes_note: "S–XXL",
    photo_url: null,
    square_link: "#",
    active: true,
    sort: 0,
  },
  {
    id: "merch-dry-sage-hoodie",
    name: "Dry Sage Hoodie",
    price_cents: 4500,
    sizes_note: "S–XXL",
    photo_url: null,
    square_link: "#",
    active: true,
    sort: 1,
  },
  {
    id: "merch-black-camo-hoodie",
    name: "Black Camo Hoodie",
    price_cents: 5000,
    sizes_note: "S–XXL",
    photo_url: null,
    square_link: "#",
    active: true,
    sort: 2,
  },
  {
    id: "merch-retired-trucker-hat",
    name: "Retired Trucker Hat",
    price_cents: 2500,
    sizes_note: "One size",
    photo_url: null,
    square_link: "#",
    active: false, // hidden — verifies the active filter
    sort: 3,
  },
];

/** Format cents as a price string; null → "$—". */
export function formatPrice(cents: number | null): string {
  if (cents === null) return "$—";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
}

export function meatTypeLabel(meat: MeatType): string {
  return meat === "pork" ? "100% PORK" : "BEEF & PORK";
}
