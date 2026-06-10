"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveMerch,
  setMerchActive,
  deleteMerch,
  type MerchInput,
} from "@/app/admin/actions";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { formatPrice, type MerchItem } from "@/lib/types";
import { cn } from "@/lib/cn";

function toDollars(cents: number): string {
  return (cents / 100).toString();
}
function toCents(dollars: string): number {
  const n = Number(dollars.trim());
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

const labelCls = "font-mono block text-[0.65rem] uppercase tracking-[0.18em] text-navy";
const fieldCls =
  "mt-1 w-full border border-navy/30 bg-paper px-3 py-3 text-base text-char focus-visible:border-ember";

function MerchForm({
  item,
  onDone,
  onCancel,
}: {
  item?: MerchItem;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [priceDollars, setPriceDollars] = useState(item ? toDollars(item.price_cents) : "");
  const [sizes, setSizes] = useState(item?.sizes_note ?? "S–XXL");
  const [square, setSquare] = useState(item?.square_link ?? "");
  const [photo, setPhoto] = useState<string | null>(item?.photo_url ?? null);
  const [active, setActive] = useState(item?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onSave() {
    setError(null);
    const payload: MerchInput = {
      id: item?.id,
      name,
      price_cents: toCents(priceDollars),
      sizes_note: sizes,
      photo_url: photo,
      square_link: square,
      active,
    };
    start(async () => {
      const res = await saveMerch(payload);
      if (res.ok) onDone();
      else setError(res.message);
    });
  }

  return (
    <div className="border-2 border-navy bg-paper p-4">
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelCls}>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldCls} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Price ($)</label>
            <input
              inputMode="decimal"
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
              placeholder="30"
              className={fieldCls}
            />
          </div>
          <div>
            <label className={labelCls}>Sizes note</label>
            <input value={sizes} onChange={(e) => setSizes(e.target.value)} className={fieldCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Square checkout link</label>
          <input
            value={square}
            onChange={(e) => setSquare(e.target.value)}
            placeholder="https://square.link/..."
            className={fieldCls}
          />
          <p className="font-mono mt-1 text-[0.6rem] uppercase tracking-[0.1em] text-smoke">
            Paste the checkout link from your Square app — see SQUARE_SETUP guide.
          </p>
        </div>
        <div>
          <span className={labelCls}>Photo</span>
          <div className="mt-1">
            <PhotoUpload folder="merch" value={photo} ratio="4/5" label="Merch photo" onUploaded={setPhoto} />
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          onClick={() => setActive((a) => !a)}
          className={cn(
            "flex min-h-12 items-center justify-between border-2 px-4 transition-colors",
            active ? "border-navy/30 bg-paper" : "border-ember bg-ember/10",
          )}
        >
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-navy">
            {active ? "Shown on site" : "Hidden"}
          </span>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-smoke">
            tap to {active ? "hide" : "show"}
          </span>
        </button>

        {error && (
          <p role="alert" className="font-mono text-xs uppercase tracking-[0.12em] text-ember">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="font-mono min-h-12 flex-1 bg-ember px-4 py-3 text-xs uppercase tracking-[0.18em] text-cream transition-colors hover:bg-navy disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save item"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="font-mono min-h-12 border border-navy/40 px-4 py-3 text-xs uppercase tracking-[0.18em] text-navy"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function MerchCard({ item, onEdit }: { item: MerchItem; onEdit: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function hideToggle() {
    start(async () => {
      await setMerchActive(item.id, !item.active);
      router.refresh();
    });
  }
  function onDelete() {
    if (!window.confirm(`Delete "${item.name}"? This can't be undone.`)) return;
    start(async () => {
      await deleteMerch(item.id);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-4 border border-navy/20 bg-paper p-3">
      <div className="w-16 shrink-0">
        {item.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.photo_url} alt={item.name} className="aspect-[4/5] w-full border border-navy/20 object-cover" />
        ) : (
          <div className="flex aspect-[4/5] w-full items-center justify-center border border-navy/20 bg-sage-wash">
            <span className="font-mono text-[0.5rem] uppercase tracking-widest text-smoke">No photo</span>
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-display truncate text-lg font-bold uppercase leading-tight text-navy">
          {item.name}
        </p>
        <p className="font-mono text-xs text-smoke">
          {formatPrice(item.price_cents)} · {item.sizes_note}
          {!item.active && <span className="ml-2 text-ember">· Hidden</span>}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="font-mono min-h-9 border border-navy/40 px-3 text-[0.6rem] uppercase tracking-[0.14em] text-navy hover:border-ember hover:text-ember"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={hideToggle}
            disabled={pending}
            className="font-mono min-h-9 border border-navy/40 px-3 text-[0.6rem] uppercase tracking-[0.14em] text-navy hover:border-ember hover:text-ember disabled:opacity-50"
          >
            {item.active ? "Hide" : "Show"}
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="font-mono min-h-9 border border-ember/50 px-3 text-[0.6rem] uppercase tracking-[0.14em] text-ember hover:bg-ember hover:text-cream disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function MerchManager({ items }: { items: MerchItem[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  function done() {
    setEditingId(null);
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold uppercase leading-[0.95] text-navy">
          Merch
        </h1>
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setEditingId(null);
            }}
            className="font-mono min-h-11 bg-ember px-4 text-[0.65rem] uppercase tracking-[0.16em] text-cream hover:bg-navy"
          >
            + Add item
          </button>
        )}
      </div>

      {adding && <MerchForm onDone={done} onCancel={() => setAdding(false)} />}

      {items.length === 0 && !adding ? (
        <p className="font-mono text-sm text-smoke">
          No merch yet — add your first item.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) =>
            editingId === item.id ? (
              <MerchForm key={item.id} item={item} onDone={done} onCancel={() => setEditingId(null)} />
            ) : (
              <MerchCard key={item.id} item={item} onEdit={() => setEditingId(item.id)} />
            ),
          )}
        </div>
      )}
    </div>
  );
}
