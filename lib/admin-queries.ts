import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Drop, MerchItem, DropFlavor, GalleryItem } from "@/lib/types";

// Service-role reads for the dashboard (see all data, incl. inactive merch and
// the no-public-read tables). Only ever called from authed admin pages.

export async function getActiveDropAdmin(): Promise<Drop | null> {
  const { data, error } = await supabaseAdmin
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
    status: data.status,
    flavors: (data.drop_flavors ?? []) as DropFlavor[],
  };
}

export async function getAllMerch(): Promise<MerchItem[]> {
  const { data, error } = await supabaseAdmin
    .from("merch_items")
    .select("id, name, price_cents, sizes_note, photo_url, square_link, active, sort")
    .order("sort", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MerchItem[];
}

export type SubmissionRow = {
  id: string;
  name: string;
  contact: string;
  quantity: number;
  contacted: boolean;
  created_at: string;
  drop_id: string | null;
  flavor_name: string | null;
  week_label: string | null;
};

export async function getSubmissions(dropId?: string): Promise<SubmissionRow[]> {
  let q = supabaseAdmin
    .from("interest_submissions")
    .select(
      "id, name, contact, quantity, contacted, created_at, drop_id, drop_flavors(name), drops(week_label)",
    )
    .order("created_at", { ascending: false });
  if (dropId) q = q.eq("drop_id", dropId);

  const { data, error } = await q;
  if (error) throw error;

  type Raw = {
    id: string;
    name: string;
    contact: string;
    quantity: number;
    contacted: boolean;
    created_at: string;
    drop_id: string | null;
    drop_flavors: { name: string } | null;
    drops: { week_label: string } | null;
  };

  return ((data ?? []) as unknown as Raw[]).map((r) => ({
    id: r.id,
    name: r.name,
    contact: r.contact,
    quantity: r.quantity,
    contacted: r.contacted,
    created_at: r.created_at,
    drop_id: r.drop_id,
    flavor_name: r.drop_flavors?.name ?? null,
    week_label: r.drops?.week_label ?? null,
  }));
}

export type DropOption = { id: string; week_label: string; status: string };

export async function getDropsForFilter(): Promise<DropOption[]> {
  const { data, error } = await supabaseAdmin
    .from("drops")
    .select("id, week_label, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((d) => ({
    id: d.id,
    week_label: d.week_label,
    status: d.status,
  }));
}

/** Raw site_content values for the editor (no default substitution). */
export async function getContentMap(): Promise<Record<string, string>> {
  const { data, error } = await supabaseAdmin.from("site_content").select("key, value");
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const r of data) out[r.key as string] = (r.value as string) ?? "";
  return out;
}

/** All gallery items, ordered by sort. */
export async function getGalleryAll(): Promise<GalleryItem[]> {
  const { data, error } = await supabaseAdmin
    .from("gallery_items")
    .select("id, type, url, sort")
    .order("sort", { ascending: true });
  if (error || !data) return [];
  return data as GalleryItem[];
}

export async function getEmailList(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("email_list")
    .select("email, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => r.email as string);
}
