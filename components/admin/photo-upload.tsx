"use client";

import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { uploadPhoto } from "@/app/admin/actions";
import { Placeholder } from "@/components/placeholder";

/**
 * Photo picker: compresses client-side (max 1600px, ~80% quality) then uploads
 * to Supabase Storage via the service-role action. Calls onUploaded with the
 * public URL. Shows a live preview.
 */
export function PhotoUpload({
  folder,
  value,
  onUploaded,
  ratio = "4/3",
  label = "Photo",
}: {
  folder: "flavors" | "merch" | "hero";
  value: string | null;
  onUploaded: (url: string) => void;
  ratio?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
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
      fd.append("folder", folder);
      const res = await uploadPhoto(fd);
      if (res.ok && res.url) {
        onUploaded(res.url);
      } else {
        setError(res.message);
      }
    } catch {
      setError("Couldn't process that image.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="w-24 shrink-0">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={`${label} preview`}
            style={{ aspectRatio: ratio }}
            className="w-full border border-navy/20 object-cover"
          />
        ) : (
          <Placeholder label={label} ratio={ratio} tone="cream" />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="font-mono min-h-11 border border-navy/40 px-4 text-[0.65rem] uppercase tracking-[0.16em] text-navy transition-colors hover:border-ember hover:text-ember disabled:opacity-50"
        >
          {busy ? "Uploading…" : value ? "Replace photo" : "Upload photo"}
        </button>
        {error && (
          <p role="alert" className="font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ember">
            {error}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onPick}
          className="hidden"
        />
      </div>
    </div>
  );
}
