"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

/** Re-pulls the live Square list (server component re-renders with no-store reads). */
export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => router.refresh())}
      disabled={pending}
      className="font-mono min-h-11 border border-navy/40 px-4 text-[0.65rem] uppercase tracking-[0.16em] text-navy transition-colors hover:border-ember hover:text-ember disabled:opacity-50"
    >
      {pending ? "Refreshing…" : "Refresh"}
    </button>
  );
}
