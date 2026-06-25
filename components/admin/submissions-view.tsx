"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markContacted } from "@/app/admin/actions";
import type { SubmissionRow, DropOption } from "@/lib/admin-queries";
import { cn } from "@/lib/cn";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function contactHref(contact: string): string {
  return EMAIL_RE.test(contact)
    ? `mailto:${contact}`
    : `tel:${contact.replace(/[^\d+]/g, "")}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function SubmissionCard({ row }: { row: SubmissionRow }) {
  const [contacted, setContacted] = useState(row.contacted);
  const [, start] = useTransition();

  function toggle(next: boolean) {
    setContacted(next); // optimistic
    start(async () => {
      const res = await markContacted(row.id, next);
      if (!res.ok) setContacted(!next);
    });
  }

  return (
    <div className={cn("border border-navy/20 bg-paper p-4", contacted && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xl font-bold uppercase leading-tight text-navy">
            {row.name}
          </p>
          <a
            href={contactHref(row.contact)}
            className="font-mono text-sm text-ember underline-offset-2 hover:underline"
          >
            {row.contact}
          </a>
        </div>
        <span className="font-mono shrink-0 text-[0.6rem] uppercase tracking-[0.14em] text-smoke">
          {fmtDate(row.created_at)}
        </span>
      </div>

      <div className="mt-3">
        {row.items.length === 0 ? (
          <p className="font-mono text-sm text-smoke">—</p>
        ) : (
          <ul className="font-mono flex flex-col gap-0.5 text-sm text-char">
            {row.items.map((it, i) => (
              <li key={i}>
                {it.flavor_name} <span className="text-smoke">×{it.quantity}</span>
              </li>
            ))}
          </ul>
        )}
        {row.week_label && (
          <p className="font-mono mt-1 text-[0.6rem] uppercase tracking-[0.14em] text-smoke">
            {row.week_label}
          </p>
        )}
      </div>

      <label className="mt-3 flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={contacted}
          onChange={(e) => toggle(e.target.checked)}
          className="size-5 accent-[var(--color-ember)]"
        />
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-navy">
          Contacted
        </span>
      </label>
    </div>
  );
}

export function SubmissionsView({
  rows,
  drops,
  emails,
  activeDropId,
}: {
  rows: SubmissionRow[];
  drops: DropOption[];
  emails: string[];
  activeDropId?: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  function onFilter(value: string) {
    router.push(value ? `/admin/submissions?drop=${value}` : "/admin/submissions");
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-extrabold uppercase leading-[0.95] text-navy">
          Reservations
        </h1>
        <select
          aria-label="Filter by drop"
          value={activeDropId ?? ""}
          onChange={(e) => onFilter(e.target.value)}
          className="font-mono min-h-11 appearance-none border border-navy/30 bg-paper px-3 text-xs uppercase tracking-[0.12em] text-navy"
        >
          <option value="">All drops</option>
          {drops.map((d) => (
            <option key={d.id} value={d.id}>
              {d.week_label} {d.status === "active" ? "(current)" : ""}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="font-mono text-sm text-smoke">
          No reservations yet — they&apos;ll show up here, newest first.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <SubmissionCard key={r.id} row={r} />
          ))}
        </div>
      )}

      {/* Notify-me list */}
      <div className="border-t border-navy/15 pt-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-extrabold uppercase leading-[0.95] text-navy">
            Email list
          </h2>
          <button
            type="button"
            onClick={copyAll}
            disabled={emails.length === 0}
            className="font-mono min-h-11 border border-navy/40 px-4 text-[0.65rem] uppercase tracking-[0.16em] text-navy transition-colors hover:border-ember hover:text-ember disabled:opacity-40"
          >
            {copied ? "Copied!" : `Copy all (${emails.length})`}
          </button>
        </div>
        {emails.length === 0 ? (
          <p className="font-mono mt-3 text-sm text-smoke">No sign-ups yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1">
            {emails.map((e) => (
              <li key={e} className="font-mono break-all text-sm text-char">
                {e}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
