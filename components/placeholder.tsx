import { cn } from "@/lib/cn";

/**
 * Solid navy/cream block with a mono label, sized to a final aspect ratio so
 * real photos drop in later with zero layout shift (SPEC §7).
 */
export function Placeholder({
  label,
  ratio = "4/3",
  tone = "navy",
  className,
}: {
  label: string;
  /** CSS aspect-ratio, e.g. "4/3", "4/5", "16/9", "1/1". */
  ratio?: string;
  tone?: "navy" | "cream";
  className?: string;
}) {
  const tones = {
    navy: "bg-navy text-cream/70 border-navy",
    cream: "bg-sage-wash text-smoke border-navy/20",
  } as const;

  return (
    <div
      role="img"
      aria-label={label}
      style={{ aspectRatio: ratio }}
      className={cn(
        "flex w-full items-center justify-center overflow-hidden border",
        tones[tone],
        className,
      )}
    >
      <span className="font-mono text-[0.65rem] uppercase tracking-[0.25em]">
        {label}
      </span>
    </div>
  );
}
