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
import {
  PageHeader,
  Label,
  Field,
  TextArea,
  Select,
  Button,
  Toggle,
  StatusLine,
} from "@/components/admin/ui";

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="This week's batch" />

      {/* Week label */}
      <div>
        <Label htmlFor="week-label">Week label</Label>
        <Field
          id="week-label"
          value={weekLabel}
          onChange={(e) => setWeekLabel(e.target.value)}
          placeholder="WEEK OF JUNE 9"
          className="mt-1"
        />
      </div>

      {/* Flavors */}
      {flavors.map((f, i) => (
        <fieldset key={f.key} className="border border-navy/20 bg-paper p-4">
            <legend className="px-2 text-xs text-smoke">Flavor {i + 1}</legend>

            <div className="flex flex-col gap-4">
              <div>
                <Label htmlFor={`name-${f.key}`}>Name</Label>
                <Field
                  id={`name-${f.key}`}
                  value={f.name}
                  onChange={(e) => patch(i, { name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`meat-${f.key}`}>Meat type</Label>
                  <Select
                    id={`meat-${f.key}`}
                    value={f.meat_type}
                    onChange={(e) => patch(i, { meat_type: e.target.value as MeatType })}
                    className="mt-1"
                  >
                    <option value="pork">100% Pork</option>
                    <option value="beef_pork">Beef &amp; Pork</option>
                  </Select>
                </div>
                <div>
                  <Label htmlFor={`price-${f.key}`}>Price / 3-pack ($)</Label>
                  <Field
                    id={`price-${f.key}`}
                    inputMode="decimal"
                    value={f.priceDollars}
                    onChange={(e) => patch(i, { priceDollars: e.target.value })}
                    placeholder="18"
                    className="mt-1 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor={`desc-${f.key}`}>Description</Label>
                <TextArea
                  id={`desc-${f.key}`}
                  value={f.description}
                  onChange={(e) => patch(i, { description: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Photos</Label>
                <div className="mt-1">
                  <FlavorPhotos flavorId={f.id} initial={photosByFlavor[f.id] ?? []} />
                </div>
              </div>

              {/* Sold-out big toggle with stamp preview */}
              <Toggle checked={f.sold_out} onChange={(next) => patch(i, { sold_out: next })}>
                <span className="text-sm text-navy">
                  {f.sold_out ? "Sold out" : "Available"}
                </span>
                <span
                  className={cn(
                    "border-2 px-3 py-0.5 text-sm font-bold uppercase tracking-[0.1em]",
                    f.sold_out
                      ? "rotate-[-6deg] border-ember text-ember"
                      : "border-navy/20 text-navy/30",
                  )}
                >
                  Sold out
                </span>
              </Toggle>

              {/* Remove flavor */}
              <Button
                type="button"
                variant="danger"
                onClick={() => removeFlavor(i)}
                disabled={flavors.length <= 1}
                className="self-start border-0 px-0 hover:bg-transparent hover:text-ember disabled:opacity-30"
              >
                Remove flavor
              </Button>
            </div>
        </fieldset>
      ))}

      {/* Add flavor */}
      <Button
        type="button"
        variant="ghost"
        onClick={addFlavor}
        disabled={adding}
        className="min-h-12 w-full border-2 border-dashed py-4"
      >
        {adding ? "Adding…" : "+ Add flavor"}
      </Button>

      <StatusLine result={result} />

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="primary"
          onClick={onSave}
          disabled={saving}
          className="min-h-12 w-full py-4"
        >
          {saving ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onPublish}
          disabled={publishing}
          className="min-h-12 w-full py-4"
        >
          {publishing ? "Publishing…" : "Publish new batch"}
        </Button>
      </div>
    </div>
  );
}
