"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDrop, publishNewDrop, type FlavorInput } from "@/app/admin/actions";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { type Drop, type MeatType } from "@/lib/types";
import { cn } from "@/lib/cn";

type EditFlavor = {
  id: string;
  name: string;
  meat_type: MeatType;
  description: string;
  priceDollars: string;
  sold_out: boolean;
  photo_url: string | null;
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

export function DropEditor({ drop }: { drop: Drop }) {
  const router = useRouter();
  const [weekLabel, setWeekLabel] = useState(drop.week_label);
  const [flavors, setFlavors] = useState<EditFlavor[]>(
    drop.flavors.map((f) => ({
      id: f.id,
      name: f.name,
      meat_type: f.meat_type,
      description: f.description,
      priceDollars: toDollars(f.price_cents),
      sold_out: f.sold_out,
      photo_url: f.photo_url,
    })),
  );
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, startSave] = useTransition();
  const [publishing, startPublish] = useTransition();

  function patch(i: number, p: Partial<EditFlavor>) {
    setFlavors((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...p } : f)));
  }

  function onSave() {
    setResult(null);
    const payload: { dropId: string; weekLabel: string; flavors: FlavorInput[] } = {
      dropId: drop.id,
      weekLabel,
      flavors: flavors.map((f) => ({
        id: f.id,
        name: f.name,
        meat_type: f.meat_type,
        description: f.description,
        price_cents: toCents(f.priceDollars),
        sold_out: f.sold_out,
        photo_url: f.photo_url,
      })),
    };
    startSave(async () => {
      const res = await saveDrop(payload);
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  function onPublish() {
    const ok = window.confirm(
      "This archives the current drop. The old flavors move to the Flavors page. Continue?",
    );
    if (!ok) return;
    setResult(null);
    startPublish(async () => {
      const res = await publishNewDrop();
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  const labelCls = "font-mono block text-[0.65rem] uppercase tracking-[0.18em] text-navy";
  const fieldCls =
    "mt-1 w-full border border-navy/30 bg-paper px-3 py-3 text-base text-char focus-visible:border-ember";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold uppercase leading-[0.95] text-navy">
          This week&apos;s drop
        </h1>
        <p className="mt-1 text-sm text-smoke">Edit the board, then Save changes.</p>
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
        <fieldset key={f.id} className="border border-navy/20 bg-paper p-4">
          <legend className="font-mono px-2 text-[0.65rem] uppercase tracking-[0.18em] text-ember">
            Flavor {i + 1}
          </legend>

          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor={`name-${f.id}`} className={labelCls}>
                Name
              </label>
              <input
                id={`name-${f.id}`}
                value={f.name}
                onChange={(e) => patch(i, { name: e.target.value })}
                className={fieldCls}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`meat-${f.id}`} className={labelCls}>
                  Meat type
                </label>
                <select
                  id={`meat-${f.id}`}
                  value={f.meat_type}
                  onChange={(e) => patch(i, { meat_type: e.target.value as MeatType })}
                  className={cn(fieldCls, "appearance-none")}
                >
                  <option value="pork">100% Pork</option>
                  <option value="beef_pork">Beef &amp; Pork</option>
                </select>
              </div>
              <div>
                <label htmlFor={`price-${f.id}`} className={labelCls}>
                  Price / 3-pack ($)
                </label>
                <input
                  id={`price-${f.id}`}
                  inputMode="decimal"
                  value={f.priceDollars}
                  onChange={(e) => patch(i, { priceDollars: e.target.value })}
                  placeholder="18"
                  className={fieldCls}
                />
              </div>
            </div>

            <div>
              <label htmlFor={`desc-${f.id}`} className={labelCls}>
                Description
              </label>
              <textarea
                id={`desc-${f.id}`}
                value={f.description}
                onChange={(e) => patch(i, { description: e.target.value })}
                rows={2}
                className={fieldCls}
              />
            </div>

            <div>
              <span className={labelCls}>Photo</span>
              <div className="mt-1">
                <PhotoUpload
                  folder="flavors"
                  value={f.photo_url}
                  ratio="4/3"
                  label="Flavor photo"
                  onUploaded={(url) => patch(i, { photo_url: url })}
                />
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
          </div>
        </fieldset>
      ))}

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
          className="font-mono min-h-12 w-full bg-ember px-6 py-4 text-xs uppercase tracking-[0.18em] text-cream transition-colors hover:bg-navy disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={publishing}
          className="font-mono min-h-12 w-full border-2 border-navy px-6 py-4 text-xs uppercase tracking-[0.18em] text-navy transition-colors hover:bg-navy hover:text-cream disabled:opacity-60"
        >
          {publishing ? "Publishing…" : "Publish new drop"}
        </button>
      </div>
    </div>
  );
}
