"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin-session";
import { type ActionResult, type MeatType, PREORDER_MAX_ITEMS } from "@/lib/types";
import { SITE_TEXT_KEYS } from "@/lib/site-text";

const DENIED: ActionResult = { ok: false, message: "Not authorized." };

function revalidatePublic() {
  revalidatePath("/");
  revalidatePath("/drop");
  revalidatePath("/flavors");
  revalidatePath("/merch");
}

// ── Drop ─────────────────────────────────────────────────────────────────────

export type FlavorInput = {
  id?: string; // absent / empty → a new flavor to insert
  name: string;
  meat_type: MeatType;
  description: string;
  price_cents: number | null;
  sold_out: boolean;
  // photo_url is intentionally NOT here — flavor photos are managed by the
  // add/delete/move flavor-photo actions so saveDrop never clobbers them.
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

    // Reconcile the flavor set: delete rows the editor removed, update the
    // ones it kept, insert the new ones. Supports any flavor count.
    const { data: existing } = await supabaseAdmin
      .from("drop_flavors")
      .select("id")
      .eq("drop_id", input.dropId);
    const existingIds = new Set((existing ?? []).map((r) => r.id as string));
    const keptIds = new Set(input.flavors.map((f) => f.id).filter(Boolean) as string[]);
    const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
    if (toDelete.length) {
      const { error } = await supabaseAdmin.from("drop_flavors").delete().in("id", toDelete);
      if (error) throw error;
    }

    for (const f of input.flavors) {
      const row = {
        name: (f.name ?? "").trim() || "Untitled flavor",
        meat_type: f.meat_type,
        description: (f.description ?? "").trim(),
        price_cents: f.price_cents,
        sold_out: f.sold_out,
      };
      if (f.id && existingIds.has(f.id)) {
        const { error } = await supabaseAdmin.from("drop_flavors").update(row).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabaseAdmin
          .from("drop_flavors")
          .insert({ drop_id: input.dropId, ...row });
        if (error) throw error;
      }
    }

    revalidatePublic();
    return { ok: true, message: "Saved." };
  } catch (err) {
    console.error("[saveDrop]", err);
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't save changes. Try again." };
  }
}

/**
 * Insert one empty flavor into the active drop and return its id. The editor
 * appends it locally with that real id so its photo uploader works immediately
 * (photos require a flavor_id). Name/fields are filled in and persisted on Save.
 */
export async function addFlavor(
  dropId: string,
): Promise<ActionResult & { id?: string }> {
  if (!(await isAdmin())) return DENIED;
  try {
    const { data: row, error } = await supabaseAdmin
      .from("drop_flavors")
      .insert({ drop_id: dropId, name: "", meat_type: "pork", description: "", sold_out: false })
      .select("id")
      .single();
    if (error) throw error;
    revalidatePublic();
    return { ok: true, message: "Flavor added.", id: row.id };
  } catch (err) {
    console.error("[addFlavor]", err);
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't add flavor. Try again." };
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
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't update. Try again." };
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

    const { error: flavErr } = await supabaseAdmin
      .from("drop_flavors")
      .insert({ drop_id: created.id, name: "New flavor", meat_type: "pork", description: "", sold_out: false });
    if (flavErr) throw flavErr;

    revalidatePublic();
    return { ok: true, message: "New batch published. Edit the flavor and add more." };
  } catch (err) {
    console.error("[publishNewDrop]", err);
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't publish a new drop. Try again." };
  }
}

// ── Flavor photos (multiple per flavor, migration 004) ───────────────────────

function revalidateFlavor(flavorId: string) {
  revalidatePath(`/flavors/${flavorId}`);
  revalidatePublic();
}

// Keep drop_flavors.photo_url in sync with the first flavor_photos row (legacy
// "first photo" used by any code still reading photo_url).
async function syncFlavorFirstPhoto(flavorId: string) {
  const { data } = await supabaseAdmin
    .from("flavor_photos")
    .select("url")
    .eq("flavor_id", flavorId)
    .order("sort", { ascending: true })
    .limit(1)
    .maybeSingle();
  await supabaseAdmin.from("drop_flavors").update({ photo_url: data?.url ?? null }).eq("id", flavorId);
}

export async function addFlavorPhoto(
  formData: FormData,
): Promise<ActionResult & { url?: string; id?: string }> {
  if (!(await isAdmin())) return DENIED;
  try {
    const file = formData.get("file");
    const flavorId = String(formData.get("flavorId") ?? "");
    if (!(file instanceof File) || file.size === 0) return { ok: false, message: "No image selected." };
    if (!flavorId) return { ok: false, message: "Save the flavor first." };

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `flavors/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("photos")
      .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = supabaseAdmin.storage.from("photos").getPublicUrl(path);

    const { data: last } = await supabaseAdmin
      .from("flavor_photos")
      .select("sort")
      .eq("flavor_id", flavorId)
      .order("sort", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: row, error: insErr } = await supabaseAdmin
      .from("flavor_photos")
      .insert({ flavor_id: flavorId, url: pub.publicUrl, sort: (last?.sort ?? -1) + 1 })
      .select("id")
      .single();
    if (insErr) throw insErr;

    await syncFlavorFirstPhoto(flavorId);
    revalidateFlavor(flavorId);
    return { ok: true, message: "Added.", url: pub.publicUrl, id: row.id };
  } catch (err) {
    console.error("[addFlavorPhoto]", err);
    return { ok: false, message: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function deleteFlavorPhoto(photoId: string): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    const { data: row } = await supabaseAdmin
      .from("flavor_photos")
      .select("flavor_id, url")
      .eq("id", photoId)
      .maybeSingle();
    if (!row) return { ok: false, message: "Photo not found." };

    const marker = "/photos/";
    const idx = (row.url as string).indexOf(marker);
    if (idx !== -1) {
      await supabaseAdmin.storage.from("photos").remove([(row.url as string).slice(idx + marker.length)]);
    }
    const { error } = await supabaseAdmin.from("flavor_photos").delete().eq("id", photoId);
    if (error) throw error;

    await syncFlavorFirstPhoto(row.flavor_id as string);
    revalidateFlavor(row.flavor_id as string);
    return { ok: true, message: "Deleted." };
  } catch (err) {
    console.error("[deleteFlavorPhoto]", err);
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't delete. Try again." };
  }
}

export async function moveFlavorPhoto(photoId: string, dir: "up" | "down"): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    const { data: target } = await supabaseAdmin
      .from("flavor_photos")
      .select("flavor_id")
      .eq("id", photoId)
      .maybeSingle();
    if (!target) return { ok: false, message: "Photo not found." };

    const { data: items } = await supabaseAdmin
      .from("flavor_photos")
      .select("id, sort")
      .eq("flavor_id", target.flavor_id as string)
      .order("sort", { ascending: true });
    if (!items) return { ok: false, message: "Couldn't reorder." };

    const i = items.findIndex((x) => x.id === photoId);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i === -1 || j < 0 || j >= items.length) return { ok: true, message: "" };

    await supabaseAdmin.from("flavor_photos").update({ sort: items[j].sort }).eq("id", items[i].id);
    await supabaseAdmin.from("flavor_photos").update({ sort: items[i].sort }).eq("id", items[j].id);

    await syncFlavorFirstPhoto(target.flavor_id as string);
    revalidateFlavor(target.flavor_id as string);
    return { ok: true, message: "Reordered." };
  } catch (err) {
    console.error("[moveFlavorPhoto]", err);
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't reorder. Try again." };
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
    return { ok: false, message: err instanceof Error ? err.message : "Upload failed. Try again." };
  }
}

// ── Merch ─────────────────────────────────────────────────────────────────────
// Merch is now managed entirely in Square (Round 6) — the public /merch page and
// the read-only admin tab read it live via lib/square.ts. No write actions here.

// ── Gallery & editable content ───────────────────────────────────────────────

const CONTENT_KEYS = new Set([
  "home_hero_url",
  "about_hero_url",
  "about_paragraph",
  "home_story_image",
]);

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
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't save. Try again." };
  }
}

// ── Site Text (Round 8) — the scoped editable strings ────────────────────────
// Stored in the same site_content table. Empty values are kept as "" so the
// public resolver (getSiteText) falls back to the hardcoded default.

const ALLOWED_SITE_TEXT = new Set<string>(SITE_TEXT_KEYS);

export async function saveSiteText(
  values: Record<string, string>,
): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    const now = new Date().toISOString();
    const rows = Object.entries(values)
      .filter(([key]) => ALLOWED_SITE_TEXT.has(key))
      .map(([key, value]) => ({ key, value: (value ?? "").trim(), updated_at: now }));

    if (rows.length === 0) return { ok: false, message: "Nothing to save." };

    const { error } = await supabaseAdmin
      .from("site_content")
      .upsert(rows, { onConflict: "key" });
    if (error) throw error;

    // Footer + announcement bar live in the shared site layout, so revalidate
    // the whole tree to refresh every page at once.
    revalidatePath("/", "layout");
    return { ok: true, message: "Saved." };
  } catch (err) {
    console.error("[saveSiteText]", err);
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't save. Try again." };
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
    return { ok: false, message: err instanceof Error ? err.message : "Upload failed. Try again." };
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
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't delete. Try again." };
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
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't reorder. Try again." };
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
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't update. Try again." };
  }
}

// ── Pre-order pop-up (separate from the batch system) ─────────────────────────

function revalidateHome() {
  revalidatePath("/"); // live pop-up reads from the homepage
}

export async function setPreorderEnabled(enabled: boolean): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    const { error } = await supabaseAdmin
      .from("preorder_popup")
      .upsert({ id: 1, enabled, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) throw error;
    revalidateHome();
    return { ok: true, message: enabled ? "Pop-up turned on." : "Pop-up turned off." };
  } catch (err) {
    console.error("[setPreorderEnabled]", err);
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't update. Try again." };
  }
}

export async function setPreorderTitle(title: string): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    const { error } = await supabaseAdmin
      .from("preorder_popup")
      .upsert({ id: 1, title: title.trim(), updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) throw error;
    revalidateHome();
    return { ok: true, message: "Saved." };
  } catch (err) {
    console.error("[setPreorderTitle]", err);
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't save. Try again." };
  }
}

export async function addPreorderItem(
  formData: FormData,
): Promise<ActionResult & { id?: string }> {
  if (!(await isAdmin())) return DENIED;
  try {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { ok: false, message: "Give the item a name." };

    // Cap at PREORDER_MAX_ITEMS.
    const { count } = await supabaseAdmin
      .from("preorder_items")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) >= PREORDER_MAX_ITEMS) {
      return { ok: false, message: `That's the max of ${PREORDER_MAX_ITEMS} items.` };
    }

    let photoUrl: string | null = null;
    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `preorder/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from("photos")
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });
      if (upErr) throw upErr;
      photoUrl = supabaseAdmin.storage.from("photos").getPublicUrl(path).data.publicUrl;
    }

    const { data: last } = await supabaseAdmin
      .from("preorder_items")
      .select("sort")
      .order("sort", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data: row, error: insErr } = await supabaseAdmin
      .from("preorder_items")
      .insert({ name, photo_url: photoUrl, sort: (last?.sort ?? -1) + 1 })
      .select("id")
      .single();
    if (insErr) throw insErr;

    revalidateHome();
    return { ok: true, message: "Added.", id: row.id };
  } catch (err) {
    console.error("[addPreorderItem]", err);
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't add item. Try again." };
  }
}

export async function updatePreorderItemName(id: string, name: string): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    if (!name.trim()) return { ok: false, message: "Give the item a name." };
    const { error } = await supabaseAdmin
      .from("preorder_items")
      .update({ name: name.trim() })
      .eq("id", id);
    if (error) throw error;
    revalidateHome();
    return { ok: true, message: "Saved." };
  } catch (err) {
    console.error("[updatePreorderItemName]", err);
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't save. Try again." };
  }
}

export async function updatePreorderItemPhoto(id: string, url: string): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    const { error } = await supabaseAdmin
      .from("preorder_items")
      .update({ photo_url: url })
      .eq("id", id);
    if (error) throw error;
    revalidateHome();
    return { ok: true, message: "Photo updated." };
  } catch (err) {
    console.error("[updatePreorderItemPhoto]", err);
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't save photo. Try again." };
  }
}

export async function deletePreorderItem(id: string): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    const { data: row } = await supabaseAdmin
      .from("preorder_items")
      .select("photo_url")
      .eq("id", id)
      .maybeSingle();
    if (row?.photo_url) {
      const marker = "/photos/";
      const idx = (row.photo_url as string).indexOf(marker);
      if (idx !== -1) {
        await supabaseAdmin.storage.from("photos").remove([(row.photo_url as string).slice(idx + marker.length)]);
      }
    }
    const { error } = await supabaseAdmin.from("preorder_items").delete().eq("id", id);
    if (error) throw error;
    revalidateHome();
    return { ok: true, message: "Deleted." };
  } catch (err) {
    console.error("[deletePreorderItem]", err);
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't delete. Try again." };
  }
}

export async function movePreorderItem(id: string, dir: "up" | "down"): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    const { data: items } = await supabaseAdmin
      .from("preorder_items")
      .select("id, sort")
      .order("sort", { ascending: true });
    if (!items) return { ok: false, message: "Couldn't reorder." };
    const i = items.findIndex((x) => x.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i === -1 || j < 0 || j >= items.length) return { ok: true, message: "" };
    await supabaseAdmin.from("preorder_items").update({ sort: items[j].sort }).eq("id", items[i].id);
    await supabaseAdmin.from("preorder_items").update({ sort: items[i].sort }).eq("id", items[j].id);
    revalidateHome();
    return { ok: true, message: "Reordered." };
  } catch (err) {
    console.error("[movePreorderItem]", err);
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't reorder. Try again." };
  }
}

export async function markPreorderContacted(id: string, contacted: boolean): Promise<ActionResult> {
  if (!(await isAdmin())) return DENIED;
  try {
    const { error } = await supabaseAdmin
      .from("preorder_signups")
      .update({ contacted })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/preorder");
    return { ok: true, message: contacted ? "Marked contacted." : "Marked not contacted." };
  } catch (err) {
    console.error("[markPreorderContacted]", err);
    return { ok: false, message: err instanceof Error ? err.message : "Couldn't update. Try again." };
  }
}
