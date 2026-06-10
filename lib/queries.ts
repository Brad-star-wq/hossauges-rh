import { supabase } from "@/lib/supabase/client";
import type {
  Drop,
  DropFlavor,
  MerchItem,
  ArchiveFlavor,
  MeatType,
} from "@/lib/types";

// Typed read helpers for the public site (Session 6 swaps the mock imports for
// these). All run through the anon client and rely on the RLS read policies.

type FlavorRow = {
  id: string;
  drop_id: string;
  name: string;
  meat_type: MeatType;
  description: string | null;
  price_cents: number | null;
  sold_out: boolean;
  photo_url: string | null;
  votes: number;
};

function toFlavor(row: FlavorRow): DropFlavor {
  return {
    id: row.id,
    drop_id: row.drop_id,
    name: row.name,
    meat_type: row.meat_type,
    description: row.description ?? "",
    price_cents: row.price_cents,
    sold_out: row.sold_out,
    photo_url: row.photo_url,
    votes: row.votes,
  };
}

/** The single active drop with its flavors, or null if none is published. */
export async function getActiveDrop(): Promise<Drop | null> {
  const { data, error } = await supabase
    .from("drops")
    .select(
      "id, week_label, status, drop_flavors(id, drop_id, name, meat_type, description, price_cents, sold_out, photo_url, votes, created_at)",
    )
    .eq("status", "active")
    .order("created_at", { referencedTable: "drop_flavors", ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    week_label: data.week_label,
    status: data.status as "active" | "archived",
    flavors: ((data.drop_flavors ?? []) as FlavorRow[]).map(toFlavor),
  };
}

/**
 * Every flavor ever made (active + archived drops), deduped by name with a
 * "made × N" count and summed votes. Grouped consumers split by meat_type.
 */
export async function getArchiveFlavors(): Promise<ArchiveFlavor[]> {
  const { data, error } = await supabase
    .from("drop_flavors")
    .select("name, meat_type, votes");

  if (error) throw error;

  const byName = new Map<string, ArchiveFlavor>();
  for (const row of (data ?? []) as Pick<
    FlavorRow,
    "name" | "meat_type" | "votes"
  >[]) {
    const existing = byName.get(row.name);
    if (existing) {
      existing.made_count += 1;
      existing.votes += row.votes ?? 0;
    } else {
      byName.set(row.name, {
        name: row.name,
        meat_type: row.meat_type,
        made_count: 1,
        votes: row.votes ?? 0,
      });
    }
  }

  // Stable, friendly order: most-made first, then alphabetical.
  return [...byName.values()].sort(
    (a, b) => b.made_count - a.made_count || a.name.localeCompare(b.name),
  );
}

/** Active merch, sorted. (RLS also restricts anon reads to active = true.) */
export async function getMerch(): Promise<MerchItem[]> {
  const { data, error } = await supabase
    .from("merch_items")
    .select(
      "id, name, price_cents, sizes_note, photo_url, square_link, active, sort",
    )
    .eq("active", true)
    .order("sort", { ascending: true });

  if (error) throw error;
  return (data ?? []) as MerchItem[];
}
