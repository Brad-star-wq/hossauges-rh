"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { publishNewDrop } from "@/app/admin/actions";

export function PublishFirstDrop() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    start(async () => {
      const res = await publishNewDrop();
      if (res.ok) router.refresh();
      else setError(res.message);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="font-mono min-h-12 w-full bg-ember px-6 py-4 text-xs uppercase tracking-[0.18em] text-cream transition-colors hover:bg-navy disabled:opacity-60"
      >
        {pending ? "Publishing…" : "Publish a new drop"}
      </button>
      {error && (
        <p role="alert" className="font-mono text-xs uppercase tracking-[0.12em] text-ember">
          {error}
        </p>
      )}
    </div>
  );
}
