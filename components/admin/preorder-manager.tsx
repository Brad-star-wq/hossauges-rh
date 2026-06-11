"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setPreorderEnabled,
  setPreorderTitle,
  addPreorderItem,
  updatePreorderItemName,
  updatePreorderItemPhoto,
  deletePreorderItem,
  movePreorderItem,
  markPreorderContacted,
} from "@/app/admin/actions";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { type PreorderItem, PREORDER_MAX_ITEMS } from "@/lib/types";
import type { PreorderSignup } from "@/lib/admin-queries";
import { cn } from "@/lib/cn";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const labelCls = "font-mono block text-[0.65rem] uppercase tracking-[0.18em] text-navy";
const fieldCls =
  "mt-1 w-full border border-navy/30 bg-paper px-3 py-3 text-base text-char focus-visible:border-ember";

function contactHref(c: string) {
  return EMAIL_RE.test(c) ? `mailto:${c}` : `tel:${c.replace(/[^\d+]/g, "")}`;
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function EnableToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [, start] = useTransition();
  function toggle() {
    const next = !on;
    setOn(next);
    start(async () => {
      const res = await setPreorderEnabled(next);
      if (!res.ok) {
        setOn(!next);
        window.alert(res.message);
      } else router.refresh();
    });
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={toggle}
      className={cn(
        "flex min-h-12 items-center justify-between border-2 px-4 transition-colors",
        on ? "border-ember bg-ember/10" : "border-navy/30 bg-paper",
      )}
    >
      <span className="font-mono text-xs uppercase tracking-[0.16em] text-navy">
        Pop-up is {on ? "ON" : "OFF"}
      </span>
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-smoke">
        tap to turn {on ? "off" : "on"}
      </span>
    </button>
  );
}

function TitleField({ title }: { title: string }) {
  const router = useRouter();
  const [value, setValue] = useState(title);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function save() {
    setMsg(null);
    start(async () => {
      const res = await setPreorderTitle(value);
      setMsg(res.message);
      if (res.ok) router.refresh();
    });
  }
  return (
    <div className="border border-navy/20 bg-paper p-4">
      <label htmlFor="po-title" className={labelCls}>Pop-up title</label>
      <input id="po-title" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Holiday Pre-Order" className={fieldCls} />
      <div className="mt-2 flex items-center gap-3">
        <button type="button" onClick={save} disabled={pending}
          className="font-mono min-h-11 bg-ember-press px-4 text-[0.65rem] uppercase tracking-[0.16em] text-cream hover:bg-navy disabled:opacity-60">
          {pending ? "Saving…" : "Save title"}
        </button>
        {msg && <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-smoke">{msg}</span>}
      </div>
    </div>
  );
}

function ItemRow({ item, first, last }: { item: PreorderItem; first: boolean; last: boolean }) {
  const router = useRouter();
  const [name, setName] = useState(item.name);
  const [pending, start] = useTransition();

  function saveName() {
    if (name.trim() === item.name) return;
    start(async () => {
      const res = await updatePreorderItemName(item.id, name);
      if (!res.ok) window.alert(res.message);
      else router.refresh();
    });
  }
  function setPhoto(url: string) {
    start(async () => {
      const res = await updatePreorderItemPhoto(item.id, url);
      if (!res.ok) window.alert(res.message);
      else router.refresh();
    });
  }
  function move(dir: "up" | "down") {
    start(async () => {
      await movePreorderItem(item.id, dir);
      router.refresh();
    });
  }
  function remove() {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    start(async () => {
      const res = await deletePreorderItem(item.id);
      if (!res.ok) window.alert(res.message);
      else router.refresh();
    });
  }

  return (
    <li className="flex items-start gap-3 border border-navy/20 bg-paper p-3">
      <div className="w-16 shrink-0">
        <PhotoUpload folder="preorder" value={item.photo_url} ratio="1/1" label="Item photo" onUploaded={setPhoto} />
      </div>
      <div className="min-w-0 flex-1">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          aria-label="Item name"
          className="w-full border border-navy/30 bg-paper px-2 py-2 text-sm text-char focus-visible:border-ember"
        />
        <div className="mt-2 flex gap-1">
          <button type="button" onClick={() => move("up")} disabled={pending || first} aria-label="Move up"
            className="font-mono min-h-9 border border-navy/40 px-2 text-navy disabled:opacity-30">↑</button>
          <button type="button" onClick={() => move("down")} disabled={pending || last} aria-label="Move down"
            className="font-mono min-h-9 border border-navy/40 px-2 text-navy disabled:opacity-30">↓</button>
          <button type="button" onClick={remove} disabled={pending} aria-label="Delete"
            className="font-mono ml-auto min-h-9 border border-ember/50 px-2 text-ember hover:bg-ember hover:text-cream disabled:opacity-50">✕</button>
        </div>
      </div>
    </li>
  );
}

function ItemsSection({ items }: { items: PreorderItem[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const atMax = items.length >= PREORDER_MAX_ITEMS;

  function add() {
    if (!newName.trim()) return;
    setErr(null);
    const fd = new FormData();
    fd.append("name", newName.trim());
    start(async () => {
      const res = await addPreorderItem(fd);
      if (res.ok) {
        setNewName("");
        router.refresh();
      } else setErr(res.message);
    });
  }

  return (
    <div className="border border-navy/20 bg-paper p-4">
      <div className="flex items-center justify-between gap-3">
        <span className={labelCls}>Menu items ({items.length}/{PREORDER_MAX_ITEMS})</span>
      </div>

      {items.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item, i) => (
            <ItemRow key={item.id} item={item} first={i === 0} last={i === items.length - 1} />
          ))}
        </ul>
      )}

      {atMax ? (
        <p className="font-mono mt-3 text-[0.6rem] uppercase tracking-[0.12em] text-smoke">
          That&apos;s the max of {PREORDER_MAX_ITEMS} items. Delete one to add another.
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New item name"
            className="min-w-0 flex-1 border border-navy/30 bg-paper px-3 py-3 text-sm text-char focus-visible:border-ember"
          />
          <button type="button" onClick={add} disabled={pending || !newName.trim()}
            className="font-mono shrink-0 bg-ember-press px-4 text-[0.65rem] uppercase tracking-[0.16em] text-cream hover:bg-navy disabled:opacity-50">
            + Add
          </button>
        </div>
      )}
      {!atMax && (
        <p className="font-mono mt-2 text-[0.55rem] uppercase tracking-[0.1em] text-smoke">
          Add the item, then upload its photo from the row above.
        </p>
      )}
      {err && <p role="alert" className="font-mono mt-2 text-[0.6rem] uppercase tracking-[0.12em] text-ember">{err}</p>}
    </div>
  );
}

function SignupCard({ row }: { row: PreorderSignup }) {
  const [contacted, setContacted] = useState(row.contacted);
  const [, start] = useTransition();
  function toggle(next: boolean) {
    setContacted(next);
    start(async () => {
      const res = await markPreorderContacted(row.id, next);
      if (!res.ok) setContacted(!next);
    });
  }
  return (
    <div className={cn("border border-navy/20 bg-paper p-4", contacted && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-bold uppercase leading-tight text-navy">{row.name}</p>
          <a href={contactHref(row.contact)} className="font-mono text-sm text-ember underline-offset-2 hover:underline">
            {row.contact}
          </a>
        </div>
        <span className="font-mono shrink-0 text-[0.6rem] uppercase tracking-[0.14em] text-smoke">{fmtDate(row.created_at)}</span>
      </div>
      {row.items && <p className="font-mono mt-2 text-sm text-char">{row.items}</p>}
      <label className="mt-3 flex min-h-11 items-center gap-3">
        <input type="checkbox" checked={contacted} onChange={(e) => toggle(e.target.checked)} className="size-5 accent-[var(--color-ember)]" />
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-navy">Contacted</span>
      </label>
    </div>
  );
}

function SignupsSection({ signups }: { signups: PreorderSignup[] }) {
  const [copied, setCopied] = useState(false);
  async function copyAll() {
    try {
      await navigator.clipboard.writeText(signups.map((s) => s.contact).join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="border-t border-navy/15 pt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold uppercase leading-[0.95] text-navy">Signups</h2>
        <button type="button" onClick={copyAll} disabled={signups.length === 0}
          className="font-mono min-h-11 border border-navy/40 px-4 text-[0.65rem] uppercase tracking-[0.16em] text-navy hover:border-ember hover:text-ember disabled:opacity-40">
          {copied ? "Copied!" : `Copy contacts (${signups.length})`}
        </button>
      </div>
      {signups.length === 0 ? (
        <p className="font-mono mt-3 text-sm text-smoke">No pre-order signups yet.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          {signups.map((s) => <SignupCard key={s.id} row={s} />)}
        </div>
      )}
    </div>
  );
}

export function PreorderManager({
  config,
  items,
  signups,
}: {
  config: { enabled: boolean; title: string };
  items: PreorderItem[];
  signups: PreorderSignup[];
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold uppercase leading-[0.95] text-navy">
          Pre-order pop-up
        </h1>
        <p className="mt-1 text-sm text-smoke">
          The homepage pop-up. Turn it on, set the title, add up to {PREORDER_MAX_ITEMS} items.
        </p>
      </div>
      <EnableToggle enabled={config.enabled} />
      <TitleField title={config.title} />
      <ItemsSection items={items} />
      <SignupsSection signups={signups} />
    </div>
  );
}
