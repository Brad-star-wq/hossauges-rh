import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Drop, DropFlavor, GalleryItem, PreorderItem } from "@/lib/types";

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

  type Row = Omit<DropFlavor, "photos" | "description"> & { description: string | null };
  const flavors: DropFlavor[] = ((data.drop_flavors ?? []) as Row[]).map((f) => ({
    ...f,
    description: f.description ?? "", // DB description is nullable; the editor + saveDrop expect a string
    photos: f.photo_url ? [f.photo_url] : [],
  }));

  // Attach all photos (migration 004). Falls back to photo_url if table missing.
  const { data: photos } = await supabaseAdmin
    .from("flavor_photos")
    .select("flavor_id, url, sort")
    .in("flavor_id", flavors.map((f) => f.id))
    .order("sort", { ascending: true });
  if (photos) {
    const byFlavor = new Map<string, string[]>();
    for (const r of photos as { flavor_id: string; url: string }[]) {
      const list = byFlavor.get(r.flavor_id) ?? [];
      list.push(r.url);
      byFlavor.set(r.flavor_id, list);
    }
    for (const f of flavors) {
      const urls = byFlavor.get(f.id);
      if (urls?.length) {
        f.photos = urls;
        f.photo_url = urls[0];
      }
    }
  }

  return {
    id: data.id,
    week_label: data.week_label,
    status: data.status,
    flavors,
  };
}

export type FlavorPhoto = { id: string; url: string };

/** Photo rows (with ids, for editing) keyed by flavor id. */
export async function getFlavorPhotos(
  flavorIds: string[],
): Promise<Record<string, FlavorPhoto[]>> {
  const out: Record<string, FlavorPhoto[]> = {};
  if (flavorIds.length === 0) return out;
  const { data, error } = await supabaseAdmin
    .from("flavor_photos")
    .select("id, url, flavor_id, sort")
    .in("flavor_id", flavorIds)
    .order("sort", { ascending: true });
  if (error || !data) return out; // table missing (pre-migration) → empty
  for (const r of data as { id: string; url: string; flavor_id: string }[]) {
    (out[r.flavor_id] ??= []).push({ id: r.id, url: r.url });
  }
  return out;
}

export type SubmissionItem = { flavor_name: string; quantity: number };

export type SubmissionRow = {
  id: string;
  name: string;
  contact: string;
  contacted: boolean;
  created_at: string;
  drop_id: string | null;
  week_label: string | null;
  /** Per-flavor line items (Round 9). Old single-flavor rows yield one item. */
  items: SubmissionItem[];
};

export async function getSubmissions(dropId?: string): Promise<SubmissionRow[]> {
  // Parent rows + legacy single-flavor columns (drop_flavors/quantity) for
  // back-compat with pre-Round-9 submissions.
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
    quantity: number | null;
    contacted: boolean;
    created_at: string;
    drop_id: string | null;
    drop_flavors: { name: string } | null;
    drops: { week_label: string } | null;
  };
  const parents = (data ?? []) as unknown as Raw[];

  // Line items (Round 9) in one batch. Resilient to the table not existing yet
  // (pre-migration): on error we fall back to the legacy columns only.
  const itemsBySubmission = new Map<string, SubmissionItem[]>();
  if (parents.length > 0) {
    const { data: itemRows, error: itemErr } = await supabaseAdmin
      .from("interest_items")
      .select("submission_id, flavor_name, quantity, created_at")
      .in("submission_id", parents.map((p) => p.id))
      .order("created_at", { ascending: true });
    if (!itemErr && itemRows) {
      for (const it of itemRows as unknown as {
        submission_id: string;
        flavor_name: string;
        quantity: number;
      }[]) {
        const list = itemsBySubmission.get(it.submission_id) ?? [];
        list.push({ flavor_name: it.flavor_name, quantity: it.quantity });
        itemsBySubmission.set(it.submission_id, list);
      }
    }
  }

  return parents.map((r) => {
    const items = itemsBySubmission.get(r.id);
    return {
      id: r.id,
      name: r.name,
      contact: r.contact,
      contacted: r.contacted,
      created_at: r.created_at,
      drop_id: r.drop_id,
      week_label: r.drops?.week_label ?? null,
      items:
        items && items.length > 0
          ? items
          : // Legacy single-flavor row → one synthesized line item.
            r.drop_flavors?.name && r.quantity != null
            ? [{ flavor_name: r.drop_flavors.name, quantity: r.quantity }]
            : [],
    };
  });
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

// ── Pre-order pop-up ──────────────────────────────────────────────────────────
export async function getPreorderConfig(): Promise<{ enabled: boolean; title: string }> {
  const { data } = await supabaseAdmin
    .from("preorder_popup")
    .select("enabled, title")
    .eq("id", 1)
    .maybeSingle();
  return { enabled: data?.enabled ?? false, title: data?.title ?? "" };
}

export async function getPreorderItemsAdmin(): Promise<PreorderItem[]> {
  const { data, error } = await supabaseAdmin
    .from("preorder_items")
    .select("id, name, photo_url, sort")
    .order("sort", { ascending: true });
  if (error || !data) return [];
  return data as PreorderItem[];
}

export type PreorderSignup = {
  id: string;
  name: string;
  contact: string;
  items: string | null;
  contacted: boolean;
  created_at: string;
};

export async function getPreorderSignups(): Promise<PreorderSignup[]> {
  const { data, error } = await supabaseAdmin
    .from("preorder_signups")
    .select("id, name, contact, items, contacted, created_at")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as PreorderSignup[];
}

export async function getEmailList(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("email_list")
    .select("email, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => r.email as string);
}
