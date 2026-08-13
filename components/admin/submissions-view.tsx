"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markContacted, setPacksPaid, setOrderPaid } from "@/app/admin/actions";
import type { SubmissionRow, DropOption } from "@/lib/admin-queries";
import { cn } from "@/lib/cn";
import { PageHeader, Select, Button } from "@/components/admin/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function contactHref(contact: string): string {
  return EMAIL_RE.test(contact)
    ? `mailto:${contact}`
    : `tel:${contact.replace(/[^\d+]/g, "")}`;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date}, ${time}`;
}

// ── Paid meter ────────────────────────────────────────────────────────────────
function Meter({ paid, total, done }: { paid: number; total: number; done: boolean }) {
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-[5px] min-w-[38px] flex-1 overflow-hidden rounded-full bg-sage-wash">
        <div
          className={cn("h-full rounded-full", done ? "bg-navy" : "bg-ember")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn("whitespace-nowrap text-xs tabular-nums", done ? "text-navy" : "text-smoke")}>
        {paid}/{total}
      </span>
    </div>
  );
}

// ── Status flags — computed from data, never hardcoded ────────────────────────
const CHIP = "rounded-sm px-1.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.03em]";

function Flags({
  trackable,
  fullyPaid,
  contacted,
}: {
  trackable: boolean;
  fullyPaid: boolean;
  contacted: boolean;
}) {
  // Legacy rows have no known paid state: the only flag is "Not tracked".
  if (!trackable) {
    return <span className={cn(CHIP, "bg-navy/8 text-smoke")}>Not tracked</span>;
  }
  if (fullyPaid && contacted) {
    return <span className={cn(CHIP, "bg-navy/8 text-smoke")}>Settled</span>;
  }
  // "Call back" was removed from the table: it showed on ~every row, so it was
  // noise. Contact status lives in the "To contact" filter and the panel toggle.
  if (!fullyPaid) {
    return <span className={cn(CHIP, "bg-ember/12 text-ember-press")}>Unpaid</span>;
  }
  return null;
}

// ── One order row: collapsed line + inline expandable detail ──────────────────
function OrderRow({ row }: { row: SubmissionRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [contacted, setContacted] = useState(row.contacted);
  // Paid packs per line id (optimistic). Only trackable rows have line ids.
  const [paid, setPaid] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const it of row.items) if (it.id) m[it.id] = it.paid_count;
    return m;
  });
  const [, start] = useTransition();

  const displayPacks = row.items.reduce((s, it) => s + it.quantity, 0);
  const totalPacks = row.totalPacks;
  const paidPacks = row.trackable
    ? Object.values(paid).reduce((s, n) => s + n, 0)
    : 0;
  const fullyPaid = row.trackable && totalPacks > 0 && paidPacks >= totalPacks;
  const settled = row.trackable ? fullyPaid && contacted : contacted;

  // Contiguous model: checking the pack at index j means "j+1 packs paid",
  // unchecking it means "j packs paid". The target is derived from the clicked
  // index, so it's deterministic under fast repeated clicks (no stale reads).
  // Clamp client-side too; the server clamps again, so paid_count can't exceed
  // quantity either way.
  function setLinePaid(lineId: string, quantity: number, index: number, checked: boolean) {
    const cur = paid[lineId] ?? 0;
    const next = Math.max(0, Math.min(checked ? index + 1 : index, quantity));
    if (next === cur) return;
    setPaid((prev) => ({ ...prev, [lineId]: next }));
    start(async () => {
      const res = await setPacksPaid(lineId, next);
      if (!res.ok) setPaid((prev) => ({ ...prev, [lineId]: cur })); // revert
      else router.refresh();
    });
  }

  // One-click settle for the whole order: every line → its own quantity (paid)
  // or 0 (unpaid). Optimistic — the meter, panel checkboxes, and flags all read
  // from `paid`, so setting it here updates them at once. Toggles so a misclick
  // on a fully-paid order can be undone.
  function toggleOrderPaid() {
    const nextPaid = !fullyPaid;
    const prev = paid; // snapshot for revert
    const next: Record<string, number> = {};
    for (const it of row.items) if (it.id) next[it.id] = nextPaid ? it.quantity : 0;
    setPaid(next);
    start(async () => {
      const res = await setOrderPaid(row.id, nextPaid);
      if (!res.ok) setPaid(prev);
      else router.refresh();
    });
  }

  function toggleContacted(nextValue: boolean) {
    setContacted(nextValue); // optimistic
    start(async () => {
      const res = await markContacted(row.id, nextValue);
      if (!res.ok) setContacted(!nextValue);
      else router.refresh();
    });
  }

  const detailId = `detail-${row.id}`;

  return (
    <div className={cn("border-b border-navy/12 last:border-b-0", settled && "opacity-70")}>
      {/* Collapsed row (whole row toggles). Contact link stops propagation. */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={detailId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          // Only the row itself toggles; keys on the contact link / buttons are
          // theirs to handle.
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className="grid min-h-14 cursor-pointer grid-cols-[minmax(0,1fr)_auto_max-content_28px] items-center gap-3 px-3 py-2 hover:bg-sage-wash/50 min-[840px]:grid-cols-[minmax(200px,1fr)_minmax(0,max-content)_100px_auto_max-content_28px] min-[840px]:px-4"
      >
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-navy-deep">{row.name}</div>
          <div className="truncate text-xs tabular-nums text-smoke">
            {displayPacks} pack{displayPacks === 1 ? "" : "s"} · {fmtDateTime(row.created_at)}
          </div>
        </div>

        <a
          href={contactHref(row.contact)}
          onClick={(e) => e.stopPropagation()}
          className="hidden truncate text-sm text-ember-press underline-offset-2 hover:underline min-[840px]:block"
        >
          {row.contact}
        </a>

        {row.trackable ? (
          <Meter paid={paidPacks} total={totalPacks} done={fullyPaid} />
        ) : (
          <span className="text-sm text-smoke">—</span>
        )}

        <div className="hidden flex-wrap gap-1 min-[840px]:flex">
          <Flags trackable={row.trackable} fullyPaid={fullyPaid} contacted={contacted} />
        </div>

        {/* One-click settle — kept visible below 840px (Status is not). */}
        {row.trackable ? (
          <Button
            type="button"
            variant="ghost"
            aria-pressed={fullyPaid}
            onClick={(e) => {
              e.stopPropagation();
              toggleOrderPaid();
            }}
            className="justify-self-start whitespace-nowrap px-2.5"
          >
            {fullyPaid ? "Paid" : "Mark paid"}
          </Button>
        ) : (
          <span />
        )}

        <span
          aria-hidden
          className={cn("justify-self-end text-smoke transition-transform", open && "rotate-90")}
        >
          ›
        </span>
      </div>

      {/* Inline detail (no modal — several can stay open at once). */}
      {open && (
        <div id={detailId} className="bg-sage-wash/40 px-3 pb-4 min-[840px]:px-4">
          <a
            href={contactHref(row.contact)}
            className="mt-2 inline-block text-sm text-ember-press underline-offset-2 hover:underline min-[840px]:hidden"
          >
            {row.contact}
          </a>

          <h3 className="pb-2 pt-3 text-[0.68rem] font-semibold uppercase tracking-[0.05em] text-smoke">
            Packs
          </h3>

          {row.trackable ? (
            <ul className="border border-navy/12 bg-paper">
              {row.items.flatMap((it) =>
                // One row PER PACK: a line with quantity 2 renders two rows.
                Array.from({ length: it.quantity }).map((_, j) => {
                  const linePaid = it.id ? paid[it.id] ?? 0 : 0;
                  const isPaid = j < linePaid;
                  return (
                    <li
                      key={`${it.id}-${j}`}
                      className="flex items-center gap-3 border-b border-navy/8 px-3 py-2.5 last:border-b-0"
                    >
                      <span className={cn("text-sm", isPaid && "text-smoke")}>{it.flavor_name}</span>
                      <label className="ml-auto flex cursor-pointer select-none items-center gap-2 rounded-sm px-1.5 py-1 text-sm text-smoke hover:bg-sage-wash">
                        <input
                          type="checkbox"
                          checked={isPaid}
                          // item.id is nullable in the type; trackable lines always have one.
                          disabled={!it.id}
                          onChange={(e) => it.id && setLinePaid(it.id, it.quantity, j, e.target.checked)}
                          className="size-4 accent-[var(--color-ember)]"
                        />
                        Paid
                      </label>
                    </li>
                  );
                }),
              )}
            </ul>
          ) : (
            // Untracked legacy row: read-only flavor × quantity, no checkboxes.
            <>
              <ul className="border border-navy/12 bg-paper">
                {row.items.map((it, i) => (
                  <li key={i} className="flex items-center gap-3 border-b border-navy/8 px-3 py-2.5 text-sm last:border-b-0">
                    <span>{it.flavor_name}</span>
                    <span className="ml-auto tabular-nums text-smoke">×{it.quantity}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-smoke">Not tracked</p>
            </>
          )}

          <div className="flex items-center gap-3 pt-3">
            {row.trackable && (
              <span className="text-xs tabular-nums text-smoke">
                {paidPacks} of {totalPacks} packs paid
              </span>
            )}
            <Button
              type="button"
              variant="ghost"
              aria-pressed={contacted}
              onClick={() => toggleContacted(!contacted)}
              className={cn("ml-auto", contacted && "border-navy bg-navy text-cream hover:bg-navy hover:text-cream")}
            >
              {contacted ? "Contacted" : "Mark contacted"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Filters ───────────────────────────────────────────────────────────────────
type Filter = "unpaid" | "tocontact" | "all";
const SEGMENTS: { k: Filter; label: string }[] = [
  { k: "unpaid", label: "Unpaid" },
  { k: "tocontact", label: "To contact" },
  { k: "all", label: "All" },
];

// Unpaid = has any unpaid pack (incl. partially-paid orders). To contact = not
// yet marked contacted. Both are trackable-only; untracked legacy rows appear
// only under All. All = everything.
function matchesFilter(row: SubmissionRow, filter: Filter): boolean {
  if (filter === "all") return true;
  if (!row.trackable) return false; // untracked rows appear only under All
  if (filter === "unpaid") return row.paidPacks < row.totalPacks;
  return !row.contacted;
}

export function SubmissionsView({
  rows,
  drops,
  emails,
  selectedDropId,
}: {
  rows: SubmissionRow[];
  drops: DropOption[];
  emails: string[];
  selectedDropId: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("unpaid");
  const [copied, setCopied] = useState(false);

  function onBatchChange(value: string) {
    router.push(`/admin/submissions?drop=${value}`);
  }

  async function copyEmails() {
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const visible = rows.filter((r) => matchesFilter(r, filter));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Reservations" />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-navy/30">
          {SEGMENTS.map((s, i) => (
            <button
              key={s.k}
              type="button"
              aria-pressed={filter === s.k}
              onClick={() => setFilter(s.k)}
              className={cn(
                "px-3.5 py-1.5 text-sm transition-colors",
                i > 0 && "border-l border-navy/30",
                filter === s.k
                  ? "bg-navy text-cream"
                  : "text-smoke hover:bg-sage-wash hover:text-navy-deep",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        <Select
          aria-label="Filter by batch"
          value={selectedDropId}
          onChange={(e) => onBatchChange(e.target.value)}
          className="min-h-[34px] w-auto py-1.5 text-sm text-navy-deep"
        >
          {drops.map((d) => (
            <option key={d.id} value={d.id}>
              {d.week_label}
              {d.status === "active" ? " (current)" : ""}
            </option>
          ))}
          <option value="all">All batches</option>
        </Select>

        <Button
          type="button"
          variant="ghost"
          onClick={copyEmails}
          disabled={emails.length === 0}
          className="ml-auto"
        >
          {copied ? "Copied!" : `Copy email list (${emails.length})`}
        </Button>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <p className="text-sm text-smoke">
          No reservations yet — they&apos;ll show up here, newest first.
        </p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-smoke">No orders match this filter.</p>
      ) : (
        <div className="overflow-hidden rounded-sm border border-navy/12 bg-paper">
          {/* Column headers (desktop only). Must track the row grid below. */}
          <div className="hidden grid-cols-[minmax(200px,1fr)_minmax(0,max-content)_100px_auto_max-content_28px] gap-3 border-b border-navy/12 bg-sage-wash px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.05em] text-smoke min-[840px]:grid">
            <span>Name</span>
            <span>Contact</span>
            <span>Paid</span>
            <span>Status</span>
            <span />
            <span />
          </div>
          {visible.map((r) => (
            <OrderRow key={r.id} row={r} />
          ))}
        </div>
      )}
    </div>
  );
}
