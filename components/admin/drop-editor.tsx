"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveDrop,
  publishNewDrop,
  addFlavor as addFlavorAction,
  type FlavorInput,
} from "@/app/admin/actions";
import { FlavorPhotos } from "@/components/admin/flavor-photos";
import { type Drop, type MeatType } from "@/lib/types";
import { cn } from "@/lib/cn";

type EditFlavor = {
  key: string; // stable React key (db id, or a fresh id for unsaved flavors)
  id: string; // db id, "" for a not-yet-saved flavor
  name: string;
  meat_type: MeatType;
  description: string;
  priceDollars: string;
  sold_out: boolean;
};

function toDollars(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toString();
}
function toCents(dollars: string): number | null {
  const t = dollars.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function DropEditor({
  drop,
  photosByFlavor,
}: {
  drop: Drop;
  photosByFlavor: Record<string, { id: string; url: string }[]>;
}) {
  const router = useRouter();
  const [weekLabel, setWeekLabel] = useState(drop.week_label);
  const [flavors, setFlavors] = useState<EditFlavor[]>(
    drop.flavors.map((f) => ({
      key: f.id,
      id: f.id,
      name: f.name,
      meat_type: f.meat_type,
      description: f.description ?? "", // never null — keeps the textarea controlled
      priceDollars: toDollars(f.price_cents),
      sold_out: f.sold_out,
    })),
  );
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, startSave] = useTransition();
  const [publishing, startPublish] = useTransition();
  const [adding, startAdd] = useTransition();

  function patch(i: number, p: Partial<EditFlavor>) {
    setFlavors((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...p } : f)));
  }
  // Persist the new flavor immediately so it gets a real id — its photo uploader
  // needs a flavor_id. We append it to local state (no refresh) so edits in
  // progress on other flavors aren't lost. Name/fields save on "Save changes".
  function addFlavor() {
    setResult(null);
    startAdd(async () => {
      try {
        const res = await addFlavorAction(drop.id);
        if (res.ok && res.id) {
          setFlavors((prev) => [
            ...prev,
            {
              key: res.id!,
              id: res.id!,
              name: "",
              meat_type: "pork",
              description: "",
              priceDollars: "",
              sold_out: false,
            },
          ]);
        } else {
          setResult({ ok: false, message: res.message });
        }
      } catch (err) {
        setResult({
          ok: false,
          message: err instanceof Error ? `Couldn't add flavor: ${err.message}` : "Couldn't add flavor.",
        });
      }
    });
  }
  function removeFlavor(i: number) {
    const f = flavors[i];
    const named = f.name.trim() || "this flavor";
    if (!window.confirm(`Remove ${named} from the batch? Save to make it final.`)) return;
    setFlavors((prev) => prev.filter((_, idx) => idx !== i));
  }

  function onSave() {
    setResult(null);
    const payload: { dropId: string; weekLabel: string; flavors: FlavorInput[] } = {
      dropId: drop.id,
      weekLabel,
      flavors: flavors.map((f) => ({
        id: f.id || undefined,
        name: f.name,
        meat_type: f.meat_type,
        description: f.description,
        price_cents: toCents(f.priceDollars),
        sold_out: f.sold_out,
      })),
    };
    startSave(async () => {
      try {
        const res = await saveDrop(payload);
        setResult(res);
        if (res.ok) router.refresh(); // reload canonical ids for newly-inserted flavors
      } catch (err) {
        setResult({
          ok: false,
          message: err instanceof Error ? `Save failed: ${err.message}` : "Save failed — server error.",
        });
      }
    });
  }

  function onPublish() {
    const ok = window.confirm(
      "This archives the current batch. The old flavors move to the Flavors page. Continue?",
    );
    if (!ok) return;
    setResult(null);
    startPublish(async () => {
      try {
        const res = await publishNewDrop();
        setResult(res);
        if (res.ok) router.refresh();
      } catch (err) {
        setResult({
          ok: false,
          message: err instanceof Error ? `Publish failed: ${err.message}` : "Publish failed — server error.",
        });
      }
    });
  }

  const labelCls = "font-mono block text-[0.65rem] uppercase tracking-[0.18em] text-navy";
  const fieldCls =
    "mt-1 w-full border border-navy/30 bg-paper px-3 py-3 text-base text-char focus-visible:border-ember";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold uppercase leading-[0.95] text-navy">
          This week&apos;s batch
        </h1>
        <p className="mt-1 text-sm text-smoke">
          {flavors.length} flavor{flavors.length === 1 ? "" : "s"}. Edit, add, or remove — then Save changes.
        </p>
      </div>

      {/* Week label */}
      <div>
        <label htmlFor="week-label" className={labelCls}>
          Week label
        </label>
        <input
          id="week-label"
          value={weekLabel}
          onChange={(e) => setWeekLabel(e.target.value)}
          placeholder="WEEK OF JUNE 9"
          className={fieldCls}
        />
      </div>

      {/* Flavors */}
      {flavors.map((f, i) => (
        <fieldset key={f.key} className="border border-navy/20 bg-paper p-4">
          <legend className="font-mono px-2 text-[0.65rem] uppercase tracking-[0.18em] text-ember">
            Flavor {i + 1}
          </legend>

          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor={`name-${f.key}`} className={labelCls}>
                Name
              </label>
              <input
                id={`name-${f.key}`}
                value={f.name}
                onChange={(e) => patch(i, { name: e.target.value })}
                className={fieldCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`meat-${f.key}`} className={labelCls}>
                  Meat type
                </label>
                <select
                  id={`meat-${f.key}`}
                  value={f.meat_type}
                  onChange={(e) => patch(i, { meat_type: e.target.value as MeatType })}
                  className={cn(fieldCls, "appearance-none")}
                >
                  <option value="pork">100% Pork</option>
                  <option value="beef_pork">Beef &amp; Pork</option>
                </select>
              </div>
              <div>
                <label htmlFor={`price-${f.key}`} className={labelCls}>
                  Price / 3-pack ($)
                </label>
                <input
                  id={`price-${f.key}`}
                  inputMode="decimal"
                  value={f.priceDollars}
                  onChange={(e) => patch(i, { priceDollars: e.target.value })}
                  placeholder="18"
                  className={fieldCls}
                />
              </div>
            </div>

            <div>
              <label htmlFor={`desc-${f.key}`} className={labelCls}>
                Description
              </label>
              <textarea
                id={`desc-${f.key}`}
                value={f.description}
                onChange={(e) => patch(i, { description: e.target.value })}
                rows={2}
                className={fieldCls}
              />
            </div>

            <div>
              <span className={labelCls}>Photos</span>
              <div className="mt-1">
                <FlavorPhotos flavorId={f.id} initial={photosByFlavor[f.id] ?? []} />
              </div>
            </div>

            {/* Sold-out big toggle with stamp preview */}
            <button
              type="button"
              role="switch"
              aria-checked={f.sold_out}
              onClick={() => patch(i, { sold_out: !f.sold_out })}
              className={cn(
                "flex min-h-12 items-center justify-between border-2 px-4 transition-colors",
                f.sold_out ? "border-ember bg-ember/10" : "border-navy/30 bg-paper",
              )}
            >
              <span className="font-mono text-xs uppercase tracking-[0.16em] text-navy">
                {f.sold_out ? "Sold out" : "Available"}
              </span>
              <span
                className={cn(
                  "font-display border-2 px-3 py-0.5 text-sm font-extrabold uppercase tracking-[0.1em]",
                  f.sold_out
                    ? "rotate-[-6deg] border-ember text-ember"
                    : "border-navy/20 text-navy/30",
                )}
              >
                Sold out
              </span>
            </button>

            {/* Remove flavor */}
            <button
              type="button"
              onClick={() => removeFlavor(i)}
              disabled={flavors.length <= 1}
              className="font-mono self-start text-[0.6rem] uppercase tracking-[0.14em] text-ember disabled:opacity-30"
            >
              Remove flavor
            </button>
          </div>
        </fieldset>
      ))}

      {/* Add flavor */}
      <button
        type="button"
        onClick={addFlavor}
        disabled={adding}
        className="font-mono min-h-12 w-full border-2 border-dashed border-navy/40 px-6 py-4 text-xs uppercase tracking-[0.18em] text-navy transition-colors hover:border-ember hover:text-ember disabled:opacity-50"
      >
        {adding ? "Adding…" : "+ Add flavor"}
      </button>

      {result && (
        <p
          role="status"
          className={cn(
            "font-mono border px-4 py-3 text-xs uppercase tracking-[0.12em]",
            result.ok ? "border-navy/30 text-navy" : "border-ember text-ember",
          )}
        >
          {result.ok ? "★ " : ""}
          {result.message}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="font-mono min-h-12 w-full bg-ember-press px-6 py-4 text-xs uppercase tracking-[0.18em] text-cream transition-colors hover:bg-navy disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={publishing}
          className="font-mono min-h-12 w-full border-2 border-navy px-6 py-4 text-xs uppercase tracking-[0.18em] text-navy transition-colors hover:bg-navy hover:text-cream disabled:opacity-60"
        >
          {publishing ? "Publishing…" : "Publish new batch"}
        </button>
      </div>
    </div>
  );
}
