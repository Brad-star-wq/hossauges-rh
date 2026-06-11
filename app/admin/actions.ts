"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin-session";
import type { ActionResult, MeatType } from "@/lib/types";

const DENIED: ActionResult = { ok: false, message: "Not authorized." };

function revalidatePublic() {
  revalidatePath("/");
  revalidatePath("/drop");
  revalidatePath("/flavors");
  revalidatePath("/merch");
}

// ── Drop ─────────────────────────────────────────────────────────────────────

export type FlavorInput = {
  id: string;
  name: string;
  meat_type: MeatType;
  description: string;
  price_cents: number | null;
  sold_out: boolean;
  photo_url: string | null;
};

export async function saveDrop(input: {
  dropId: string;
  weekLabel: string;
  flavors: FlavorInput[];
}): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    if (!input.weekLabel.trim()) {
      return { ok: false, message: "Give the drop a week label." };
    }

    const { error: dropErr } = await supabaseAdmin
      .from("drops")
      .update({ week_label: input.weekLabel.trim() })
      .eq("id", input.dropId);
    if (dropErr) throw dropErr;

    for (const f of input.flavors) {
      const { error } = await supabaseAdmin
        .from("drop_flavors")
        .update({
          name: f.name.trim() || "Untitled flavor",
          meat_type: f.meat_type,
          description: f.description.trim(),
          price_cents: f.price_cents,
          sold_out: f.sold_out,
          photo_url: f.photo_url,
        })
        .eq("id", f.id);
      if (error) throw error;
    }

    revalidatePublic();
    return { ok: true, message: "Saved." };
  } catch (err) {
    console.error("[saveDrop]", err);
    return { ok: false, message: "Couldn't save changes. Try again." };
  }
}

export async function toggleSoldOut(
  flavorId: string,
  soldOut: boolean,
): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    const { error } = await supabaseAdmin
      .from("drop_flavors")
      .update({ sold_out: soldOut })
      .eq("id", flavorId);
    if (error) throw error;
    revalidatePublic();
    return { ok: true, message: soldOut ? "Marked sold out." : "Marked available." };
  } catch (err) {
    console.error("[toggleSoldOut]", err);
    return { ok: false, message: "Couldn't update. Try again." };
  }
}

export async function publishNewDrop(): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    // Archive the current active drop (its flavors stay attached → /flavors).
    const { error: archErr } = await supabaseAdmin
      .from("drops")
      .update({ status: "archived" })
      .eq("status", "active");
    if (archErr) throw archErr;

    const { data: created, error: dropErr } = await supabaseAdmin
      .from("drops")
      .insert({
        week_label: "NEW DROP — EDIT ME",
        status: "active",
        published_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (dropErr) throw dropErr;

    const { error: flavErr } = await supabaseAdmin.from("drop_flavors").insert([
      { drop_id: created.id, name: "New flavor 1", meat_type: "pork", sold_out: false },
      { drop_id: created.id, name: "New flavor 2", meat_type: "beef_pork", sold_out: false },
    ]);
    if (flavErr) throw flavErr;

    revalidatePublic();
    return { ok: true, message: "New drop published. Edit the two flavors." };
  } catch (err) {
    console.error("[publishNewDrop]", err);
    return { ok: false, message: "Couldn't publish a new drop. Try again." };
  }
}

// ── Photo upload (compressed client-side, stored via service role) ────────────

export async function uploadPhoto(
  formData: FormData,
): Promise<ActionResult & { url?: string }> {
  if (!(await isAdmin())) return DENIED;
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, message: "No image selected." };
    }
    const folder = String(formData.get("folder") ?? "misc").replace(/[^a-z]/g, "");
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${folder || "misc"}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from("photos")
      .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
    if (error) throw error;

    const { data } = supabaseAdmin.storage.from("photos").getPublicUrl(path);
    return { ok: true, message: "Uploaded.", url: data.publicUrl };
  } catch (err) {
    console.error("[uploadPhoto]", err);
    return { ok: false, message: "Upload failed. Try again." };
  }
}

// ── Merch ─────────────────────────────────────────────────────────────────────

export type MerchInput = {
  id?: string;
  name: string;
  price_cents: number;
  sizes_note: string;
  photo_url: string | null;
  square_link: string;
  active: boolean;
};

export async function saveMerch(input: MerchInput): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    if (!input.name.trim()) return { ok: false, message: "Give the item a name." };

    const row = {
      name: input.name.trim(),
      price_cents: input.price_cents,
      sizes_note: input.sizes_note.trim(),
      photo_url: input.photo_url,
      square_link: input.square_link.trim(),
      active: input.active,
    };

    if (input.id) {
      const { error } = await supabaseAdmin.from("merch_items").update(row).eq("id", input.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin.from("merch_items").insert(row);
      if (error) throw error;
    }
    revalidatePublic();
    return { ok: true, message: "Saved." };
  } catch (err) {
    console.error("[saveMerch]", err);
    return { ok: false, message: "Couldn't save the item. Try again." };
  }
}

export async function setMerchActive(id: string, active: boolean): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    const { error } = await supabaseAdmin.from("merch_items").update({ active }).eq("id", id);
    if (error) throw error;
    revalidatePublic();
    return { ok: true, message: active ? "Shown." : "Hidden." };
  } catch (err) {
    console.error("[setMerchActive]", err);
    return { ok: false, message: "Couldn't update. Try again." };
  }
}

export async function deleteMerch(id: string): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    const { error } = await supabaseAdmin.from("merch_items").delete().eq("id", id);
    if (error) throw error;
    revalidatePublic();
    return { ok: true, message: "Deleted." };
  } catch (err) {
    console.error("[deleteMerch]", err);
    return { ok: false, message: "Couldn't delete. Try again." };
  }
}

// ── Gallery & editable content ───────────────────────────────────────────────

const CONTENT_KEYS = new Set(["home_hero_url", "about_hero_url", "about_paragraph"]);

function revalidateContent() {
  revalidatePath("/");
  revalidatePath("/about");
}

export async function saveSiteContent(key: string, value: string): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  if (!CONTENT_KEYS.has(key)) return { ok: false, message: "Unknown field." };
  try {
    const { error } = await supabaseAdmin
      .from("site_content")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw error;
    revalidateContent();
    return { ok: true, message: "Saved." };
  } catch (err) {
    console.error("[saveSiteContent]", err);
    return { ok: false, message: "Couldn't save. Try again." };
  }
}

export async function addGalleryItem(formData: FormData): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    const file = formData.get("file");
    const type = String(formData.get("type") ?? "");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, message: "No file selected." };
    }
    if (type !== "photo" && type !== "video") {
      return { ok: false, message: "Unknown media type." };
    }
    const ext = (file.name.split(".").pop() || (type === "video" ? "mp4" : "jpg"))
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const path = `gallery/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("photos")
      .upload(path, file, { contentType: file.type || undefined, upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = supabaseAdmin.storage.from("photos").getPublicUrl(path);

    // Append to the end (max sort + 1).
    const { data: last } = await supabaseAdmin
      .from("gallery_items")
      .select("sort")
      .order("sort", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextSort = (last?.sort ?? -1) + 1;

    const { error: insErr } = await supabaseAdmin
      .from("gallery_items")
      .insert({ type, url: pub.publicUrl, sort: nextSort });
    if (insErr) throw insErr;

    revalidateContent();
    return { ok: true, message: "Added." };
  } catch (err) {
    console.error("[addGalleryItem]", err);
    return { ok: false, message: "Upload failed. Try again." };
  }
}

export async function deleteGalleryItem(id: string): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    // Best-effort remove the stored file too (path is after "/photos/").
    const { data: row } = await supabaseAdmin
      .from("gallery_items")
      .select("url")
      .eq("id", id)
      .maybeSingle();
    if (row?.url) {
      const marker = "/photos/";
      const idx = (row.url as string).indexOf(marker);
      if (idx !== -1) {
        const path = (row.url as string).slice(idx + marker.length);
        await supabaseAdmin.storage.from("photos").remove([path]);
      }
    }

    const { error } = await supabaseAdmin.from("gallery_items").delete().eq("id", id);
    if (error) throw error;
    revalidateContent();
    return { ok: true, message: "Deleted." };
  } catch (err) {
    console.error("[deleteGalleryItem]", err);
    return { ok: false, message: "Couldn't delete. Try again." };
  }
}

export async function moveGalleryItem(id: string, dir: "up" | "down"): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    const { data: items } = await supabaseAdmin
      .from("gallery_items")
      .select("id, sort")
      .order("sort", { ascending: true });
    if (!items) return { ok: false, message: "Couldn't reorder." };

    const i = items.findIndex((it) => it.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i === -1 || j < 0 || j >= items.length) return { ok: true, message: "" };

    // Swap sort values of the two neighbours.
    await supabaseAdmin.from("gallery_items").update({ sort: items[j].sort }).eq("id", items[i].id);
    await supabaseAdmin.from("gallery_items").update({ sort: items[i].sort }).eq("id", items[j].id);

    revalidateContent();
    return { ok: true, message: "Reordered." };
  } catch (err) {
    console.error("[moveGalleryItem]", err);
    return { ok: false, message: "Couldn't reorder. Try again." };
  }
}

// ── Submissions ───────────────────────────────────────────────────────────────

export async function markContacted(id: string, contacted: boolean): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    const { error } = await supabaseAdmin
      .from("interest_submissions")
      .update({ contacted })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/submissions");
    return { ok: true, message: contacted ? "Marked contacted." : "Marked not contacted." };
  } catch (err) {
    console.error("[markContacted]", err);
    return { ok: false, message: "Couldn't update. Try again." };
  }
}
