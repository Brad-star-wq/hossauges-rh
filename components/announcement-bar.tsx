"use client";

import { useState, useSyncExternalStore } from "react";

/**
 * Thin, on-brand announcement bar at the very top of the site (Round 8). Only
 * rendered by the layout when enabled + non-empty. Dismissible: a dismissal is
 * remembered per message, so a NEW message reappears after the old one was
 * closed. SSR renders it visible (no layout shift for first-time viewers); if a
 * returning viewer already dismissed this exact text, `useSyncExternalStore`
 * removes it on hydration without a mismatch.
 */
const STORAGE_KEY = "hoss-announcement-dismissed";

function subscribe(onChange: () => void) {
  // Cross-tab dismissals; same-tab uses local state below.
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function AnnouncementBar({ text }: { text: string }) {
  // True once this exact message was dismissed in a previous visit / other tab.
  const storedDismissed = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(STORAGE_KEY) === text;
      } catch {
        return false;
      }
    },
    () => false, // server snapshot: always show
  );
  const [clicked, setClicked] = useState(false);

  if (storedDismissed || clicked) return null;

  function dismiss() {
    setClicked(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, text);
    } catch {
      // localStorage unavailable (private mode) — dismissal just won't persist.
    }
  }

  return (
    <div className="bg-ember text-cream">
      <div className="container flex items-center justify-center gap-3 py-2">
        <p className="font-mono text-center text-[0.7rem] uppercase tracking-[0.16em]">
          {text}
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="font-mono shrink-0 text-cream/80 transition-colors hover:text-cream"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
