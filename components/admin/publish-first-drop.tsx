"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { publishNewDrop } from "@/app/admin/actions";
import { Button, StatusLine } from "@/components/admin/ui";

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
      <Button
        type="button"
        variant="primary"
        onClick={onClick}
        disabled={pending}
        className="min-h-12 w-full py-4"
      >
        {pending ? "Publishing…" : "Publish a new drop"}
      </Button>
      <StatusLine result={error ? { ok: false, message: error } : null} />
    </div>
  );
}
