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
import {
  PageHeader,
  Label,
  Field,
  Button,
  Card,
  Toggle,
  StatusLine,
} from "@/components/admin/ui";
import { type PreorderItem, PREORDER_MAX_ITEMS } from "@/lib/types";
import type { PreorderSignup } from "@/lib/admin-queries";
import { cn } from "@/lib/cn";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  function toggle(next: boolean) {
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
    <Toggle checked={on} onChange={toggle}>
      <span className="text-sm text-navy">Pop-up is {on ? "on" : "off"}</span>
      <span className="text-xs text-smoke">tap to turn {on ? "off" : "on"}</span>
    </Toggle>
  );
}

function TitleField({ title }: { title: string }) {
  const router = useRouter();
  const [value, setValue] = useState(title);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  function save() {
    setResult(null);
    start(async () => {
      const res = await setPreorderTitle(value);
      setResult({ ok: res.ok, message: res.message });
      if (res.ok) router.refresh();
    });
  }
  return (
    <Card>
      <Label htmlFor="po-title">Pop-up title</Label>
      <Field id="po-title" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Holiday Pre-Order" className="mt-1" />
      <div className="mt-2 flex items-center gap-3">
        <Button type="button" variant="primary" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save title"}
        </Button>
        <StatusLine result={result} />
      </div>
    </Card>
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
        <Field
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          aria-label="Item name"
          className="px-2 py-2 text-sm"
        />
        <div className="mt-2 flex gap-1">
          <button type="button" onClick={() => move("up")} disabled={pending || first} aria-label="Move up"
            className="min-h-9 border border-navy/40 px-2 text-navy disabled:opacity-30">↑</button>
          <button type="button" onClick={() => move("down")} disabled={pending || last} aria-label="Move down"
            className="min-h-9 border border-navy/40 px-2 text-navy disabled:opacity-30">↓</button>
          <button type="button" onClick={remove} disabled={pending} aria-label="Delete"
            className="ml-auto min-h-9 border border-ember/50 px-2 text-ember hover:bg-ember hover:text-cream disabled:opacity-50">✕</button>
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
    <Card>
      <div className="flex items-center justify-between gap-3">
        <Label>Menu items <span className="tabular-nums">({items.length}/{PREORDER_MAX_ITEMS})</span></Label>
      </div>

      {items.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item, i) => (
            <ItemRow key={item.id} item={item} first={i === 0} last={i === items.length - 1} />
          ))}
        </ul>
      )}

      {atMax ? (
        <p className="mt-3 text-xs text-smoke">
          That&apos;s the max of {PREORDER_MAX_ITEMS} items. Delete one to add another.
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <Field
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New item name"
            className="min-w-0 flex-1 text-sm"
          />
          <Button type="button" variant="primary" onClick={add} disabled={pending || !newName.trim()} className="shrink-0">
            + Add
          </Button>
        </div>
      )}
      <StatusLine result={err ? { ok: false, message: err } : null} className="mt-2" />
    </Card>
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
    <Card className={cn(contacted && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-navy-deep">{row.name}</p>
          <a href={contactHref(row.contact)} className="text-sm text-navy-deep underline-offset-2 hover:underline">
            {row.contact}
          </a>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-smoke">{fmtDate(row.created_at)}</span>
      </div>
      {row.items && <p className="mt-2 text-sm text-char">{row.items}</p>}
      <label className="mt-3 flex min-h-11 items-center gap-3">
        <input type="checkbox" checked={contacted} onChange={(e) => toggle(e.target.checked)} className="size-5 accent-[var(--color-ember)]" />
        <span className="text-sm text-navy">Contacted</span>
      </label>
    </Card>
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
        <h2 className="text-xl font-bold tracking-tight text-navy-deep">Signups</h2>
        <Button type="button" variant="ghost" onClick={copyAll} disabled={signups.length === 0}>
          {copied ? "Copied!" : `Copy contacts (${signups.length})`}
        </Button>
      </div>
      {signups.length === 0 ? (
        <p className="mt-3 text-sm text-smoke">No pre-order signups yet.</p>
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
      <PageHeader title="Pre-order pop-up" />
      <EnableToggle enabled={config.enabled} />
      <TitleField title={config.title} />
      <ItemsSection items={items} />
      <SignupsSection signups={signups} />
    </div>
  );
}
