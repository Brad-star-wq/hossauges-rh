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
import {
  PageHeader,
  Label,
  TextArea,
  Button,
  Card,
  StatusLine,
} from "@/components/admin/ui";
import type { GalleryItem } from "@/lib/types";

function HeroField({
  contentKey,
  label,
  value,
  ratio = "16/9",
}: {
  contentKey: "home_hero_url" | "about_hero_url" | "home_story_image";
  label: string;
  value: string;
  ratio?: string;
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
    <Card>
      <Label>{label}</Label>
      <div className="mt-2">
        <PhotoUpload
          folder="hero"
          value={url || null}
          ratio={ratio}
          label={label}
          onUploaded={persist}
        />
      </div>
      {url && (
        <Button
          type="button"
          variant="danger"
          onClick={() => persist("")}
          className="mt-3 border-0 px-0 hover:bg-transparent hover:text-ember"
        >
          Remove photo (use placeholder)
        </Button>
      )}
    </Card>
  );
}

function ParagraphField({ value }: { value: string }) {
  const router = useRouter();
  const [text, setText] = useState(value);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setResult(null);
    start(async () => {
      const r = await saveSiteContent("about_paragraph", text);
      setResult({ ok: r.ok, message: r.message });
      if (r.ok) router.refresh();
    });
  }

  return (
    <Card>
      <Label htmlFor="about-paragraph">About story paragraph</Label>
      <TextArea
        id="about-paragraph"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mt-1"
      />
      <div className="mt-2 flex items-center gap-3">
        <Button type="button" variant="primary" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save text"}
        </Button>
        <StatusLine result={result} />
      </div>
    </Card>
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
      <span className="flex-1 text-xs text-smoke">{item.type}</span>
      <button type="button" onClick={() => move("up")} disabled={pending || first} aria-label="Move up"
        className="min-h-9 border border-navy/40 px-2 text-navy disabled:opacity-30">↑</button>
      <button type="button" onClick={() => move("down")} disabled={pending || last} aria-label="Move down"
        className="min-h-9 border border-navy/40 px-2 text-navy disabled:opacity-30">↓</button>
      <button type="button" onClick={remove} disabled={pending} aria-label="Delete"
        className="min-h-9 border border-ember/50 px-2 text-ember hover:bg-ember hover:text-cream disabled:opacity-50">✕</button>
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
    <Card>
      <div className="flex items-center justify-between gap-3">
        <Label>Gallery items (photos &amp; videos)</Label>
        <Button type="button" variant="primary" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? "Uploading…" : "+ Add media"}
        </Button>
        <input ref={inputRef} type="file" accept="image/*,video/*" onChange={onPick} className="hidden" />
      </div>
      <StatusLine result={err ? { ok: false, message: err } : null} className="mt-2" />

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-smoke">
          No gallery items yet — add your first photo or video.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {items.map((item, i) => (
            <GalleryCard key={item.id} item={item} first={i === 0} last={i === items.length - 1} />
          ))}
        </ul>
      )}
    </Card>
  );
}

export function GalleryManager({
  content,
  items,
}: {
  content: {
    home_hero_url: string;
    about_hero_url: string;
    about_paragraph: string;
    home_story_image: string;
  };
  items: GalleryItem[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Gallery & Content" />

      <HeroField contentKey="home_hero_url" label="Home hero photo" value={content.home_hero_url} />
      <HeroField
        contentKey="home_story_image"
        label="Home “Our Story” photo"
        value={content.home_story_image}
        ratio="4/3"
      />
      <HeroField contentKey="about_hero_url" label="About hero photo" value={content.about_hero_url} />
      <ParagraphField value={content.about_paragraph} />
      <GallerySection items={items} />
    </div>
  );
}
