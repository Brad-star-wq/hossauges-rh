"use client";

import { useRef, useState, useTransition } from "react";
import imageCompression from "browser-image-compression";
import {
  addFlavorPhoto,
  deleteFlavorPhoto,
  moveFlavorPhoto,
} from "@/app/admin/actions";
import { Button, StatusLine } from "@/components/admin/ui";

type Photo = { id: string; url: string };

/**
 * Manage a flavor's photos: upload (compressed), reorder, delete. Optimistic
 * local state so it stays in sync without remounting the whole editor. Only
 * available once the flavor is saved (has a db id).
 */
export function FlavorPhotos({
  flavorId,
  initial,
}: {
  flavorId: string;
  initial: Photo[];
}) {
  const [photos, setPhotos] = useState<Photo[]>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  if (!flavorId) return null;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1600,
        maxSizeMB: 1,
        initialQuality: 0.8,
        useWebWorker: true,
      });
      const fd = new FormData();
      fd.append("file", compressed, file.name);
      fd.append("flavorId", flavorId);
      const res = await addFlavorPhoto(fd);
      if (res.ok && res.url && res.id) setPhotos((p) => [...p, { id: res.id!, url: res.url! }]);
      else setErr(res.message);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't add photo.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(id: string) {
    if (!window.confirm("Delete this photo?")) return;
    start(async () => {
      try {
        const res = await deleteFlavorPhoto(id);
        if (res.ok) setPhotos((p) => p.filter((x) => x.id !== id));
        else setErr(res.message);
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : "Couldn't delete photo.");
      }
    });
  }

  function move(id: string, dir: "up" | "down") {
    start(async () => {
      try {
        const res = await moveFlavorPhoto(id, dir);
        if (!res.ok) return setErr(res.message);
        setPhotos((p) => {
          const i = p.findIndex((x) => x.id === id);
          const j = dir === "up" ? i - 1 : i + 1;
          if (i === -1 || j < 0 || j >= p.length) return p;
          const next = [...p];
          [next[i], next[j]] = [next[j], next[i]];
          return next;
        });
      } catch (e2) {
        setErr(e2 instanceof Error ? e2.message : "Couldn't reorder.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {photos.length > 0 && (
        <ul className="flex flex-col gap-2">
          {photos.map((photo, i) => (
            <li key={photo.id} className="flex items-center gap-2">
              <div className="w-14 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="aspect-[4/3] w-full border border-navy/20 object-cover" />
              </div>
              {i === 0 && (
                <span className="text-xs text-smoke">Cover</span>
              )}
              <div className="ml-auto flex gap-1">
                <button type="button" onClick={() => move(photo.id, "up")} disabled={i === 0} aria-label="Move photo up"
                  className="min-h-9 border border-navy/40 px-2 text-navy disabled:opacity-30">↑</button>
                <button type="button" onClick={() => move(photo.id, "down")} disabled={i === photos.length - 1} aria-label="Move photo down"
                  className="min-h-9 border border-navy/40 px-2 text-navy disabled:opacity-30">↓</button>
                <button type="button" onClick={() => remove(photo.id)} aria-label="Delete photo"
                  className="min-h-9 border border-ember/50 px-2 text-ember hover:bg-ember hover:text-cream">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button
        type="button"
        variant="ghost"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="self-start"
      >
        {busy ? "Uploading…" : photos.length ? "+ Add another photo" : "+ Add photo"}
      </Button>
      <StatusLine result={err ? { ok: false, message: err } : null} />
      <input ref={inputRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
    </div>
  );
}
