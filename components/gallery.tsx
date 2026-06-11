import { Placeholder } from "@/components/placeholder";
import type { GalleryItem } from "@/lib/types";

/**
 * About-page media gallery. Renders photos and videos from the DB, lazily.
 * When empty, shows styled placeholder tiles so there's no broken layout.
 */
export function Gallery({ items }: { items: GalleryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {["Gallery photo", "Gallery photo", "Gallery photo"].map((label, i) => (
          <Placeholder key={i} label={label} ratio="1/1" tone="navy" />
        ))}
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <li key={item.id} className="overflow-hidden border border-navy/15 bg-sage-wash">
          {item.type === "video" ? (
            <video
              src={item.url}
              controls
              playsInline
              preload="metadata"
              className="aspect-square w-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt=""
              loading="lazy"
              className="aspect-square w-full object-cover"
            />
          )}
        </li>
      ))}
    </ul>
  );
}
