import { cn } from "@/lib/cn";

function TickerRow({
  items,
  ariaHidden,
}: {
  items: string[];
  ariaHidden?: boolean;
}) {
  return (
    <ul aria-hidden={ariaHidden} className="flex shrink-0 items-center gap-6 pr-6">
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-6 whitespace-nowrap">
          <span className="font-mono text-xs uppercase tracking-[0.22em] text-cream">
            {item}
          </span>
          <span aria-hidden className="size-1.5 rounded-full bg-ember" />
        </li>
      ))}
    </ul>
  );
}

/**
 * CSS marquee of an all-time flavor list. The track is duplicated so the
 * -50% scroll loops seamlessly; pauses on hover. Navy band, ember dot
 * separators. (Animation handled by .ticker-track in globals.css.)
 */
export function Ticker({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden border-y border-navy-deep bg-navy py-4",
        className,
      )}
    >
      <div className="ticker-track flex w-max group-hover:[animation-play-state:paused]">
        <TickerRow items={items} />
        <TickerRow items={items} ariaHidden />
      </div>
    </div>
  );
}
