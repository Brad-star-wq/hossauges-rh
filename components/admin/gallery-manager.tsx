"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import {
  saveSiteContent,
  addGalleryItem,
  deleteGalleryItem,
  moveGalleryItem,
} from "@/app/admin/actions";
import { PhotoUpload } from "@/components/admin/photo-upload";
import type { GalleryItem } from "@/lib/types";

const labelCls = "font-mono block text-[0.65rem] uppercase tracking-[0.18em] text-navy";
const fieldCls =
  "mt-1 w-full border border-navy/30 bg-paper px-3 py-3 text-base text-char focus-visible:border-ember";

function HeroField({
  contentKey,
  label,
  value,
}: {
  contentKey: "home_hero_url" | "about_hero_url";
  label: string;
  value: string;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(value);
  const [, start] = useTransition();

  function persist(next: string) {
    setUrl(next);
    start(async () => {
      await saveSiteContent(contentKey, next);
      router.refresh();
    });
  }

  return (
    <div className="border border-navy/20 bg-paper p-4">
      <span className={labelCls}>{label}</span>
      <div className="mt-2">
        <PhotoUpload
          folder="hero"
          value={url || null}
          ratio="16/9"
          label={label}
          onUploaded={persist}
        />
      </div>
      {url && (
        <button
          type="button"
          onClick={() => persist("")}
          className="font-mono mt-3 text-[0.6rem] uppercase tracking-[0.14em] text-ember"
        >
          Remove photo (use placeholder)
        </button>
      )}
    </div>
  );
}

function ParagraphField({ value }: { value: string }) {
  const router = useRouter();
  const [text, setText] = useState(value);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMsg(null);
    start(async () => {
      const r = await saveSiteContent("about_paragraph", text);
      setMsg(r.message);
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="border border-navy/20 bg-paper p-4">
      <label htmlFor="about-paragraph" className={labelCls}>
        About story paragraph
      </label>
      <textarea
        id="about-paragraph"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className={fieldCls}
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="font-mono min-h-11 bg-ember-press px-4 text-[0.65rem] uppercase tracking-[0.16em] text-cream hover:bg-navy disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save text"}
        </button>
        {msg && <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-smoke">{msg}</span>}
      </div>
    </div>
  );
}

function GalleryCard({ item, first, last }: { item: GalleryItem; first: boolean; last: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function move(dir: "up" | "down") {
    start(async () => {
      await moveGalleryItem(item.id, dir);
      router.refresh();
    });
  }
  function remove() {
    if (!window.confirm("Delete this item? This can't be undone.")) return;
    start(async () => {
      await deleteGalleryItem(item.id);
      router.refresh();
    });
  }

  return (
    <li className="flex items-center gap-3 border border-navy/20 bg-paper p-2">
      <div className="w-16 shrink-0">
        {item.type === "video" ? (
          <video src={item.url} muted playsInline preload="metadata" className="aspect-square w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt="" className="aspect-square w-full object-cover" />
        )}
      </div>
      <span className="font-mono flex-1 text-[0.6rem] uppercase tracking-[0.14em] text-smoke">
        {item.type}
      </span>
      <button type="button" onClick={() => move("up")} disabled={pending || first} aria-label="Move up"
        className="font-mono min-h-9 border border-navy/40 px-2 text-navy disabled:opacity-30">↑</button>
      <button type="button" onClick={() => move("down")} disabled={pending || last} aria-label="Move down"
        className="font-mono min-h-9 border border-navy/40 px-2 text-navy disabled:opacity-30">↓</button>
      <button type="button" onClick={remove} disabled={pending} aria-label="Delete"
        className="font-mono min-h-9 border border-ember/50 px-2 text-ember hover:bg-ember hover:text-cream disabled:opacity-50">✕</button>
    </li>
  );
}

function GallerySection({ items }: { items: GalleryItem[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const isVideo = file.type.startsWith("video");
      let upload: File | Blob = file;
      if (!isVideo) {
        upload = await imageCompression(file, {
          maxWidthOrHeight: 1600,
          maxSizeMB: 1,
          initialQuality: 0.8,
          useWebWorker: true,
        });
      }
      const fd = new FormData();
      fd.append("file", upload, file.name);
      fd.append("type", isVideo ? "video" : "photo");
      const r = await addGalleryItem(fd);
      if (!r.ok) setErr(r.message);
      else router.refresh();
    } catch {
      setErr("Couldn't process that file.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="border border-navy/20 bg-paper p-4">
      <div className="flex items-center justify-between gap-3">
        <span className={labelCls}>Gallery items (photos &amp; videos)</span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="font-mono min-h-11 bg-ember-press px-4 text-[0.65rem] uppercase tracking-[0.16em] text-cream hover:bg-navy disabled:opacity-60"
        >
          {busy ? "Uploading…" : "+ Add media"}
        </button>
        <input ref={inputRef} type="file" accept="image/*,video/*" onChange={onPick} className="hidden" />
      </div>
      {err && <p role="alert" className="font-mono mt-2 text-[0.6rem] uppercase tracking-[0.12em] text-ember">{err}</p>}

      {items.length === 0 ? (
        <p className="font-mono mt-4 text-sm text-smoke">
          No gallery items yet — add your first photo or video.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {items.map((item, i) => (
            <GalleryCard key={item.id} item={item} first={i === 0} last={i === items.length - 1} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function GalleryManager({
  content,
  items,
}: {
  content: { home_hero_url: string; about_hero_url: string; about_paragraph: string };
  items: GalleryItem[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold uppercase leading-[0.95] text-navy">
          Gallery &amp; Content
        </h1>
        <p className="mt-1 text-sm text-smoke">Photos, the About story, and the homepage hero.</p>
      </div>

      <HeroField contentKey="home_hero_url" label="Home hero photo" value={content.home_hero_url} />
      <HeroField contentKey="about_hero_url" label="About hero photo" value={content.about_hero_url} />
      <ParagraphField value={content.about_paragraph} />
      <GallerySection items={items} />
    </div>
  );
}
