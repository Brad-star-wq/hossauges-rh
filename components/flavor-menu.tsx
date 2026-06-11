import Link from "next/link";
import { Eyebrow } from "@/components/eyebrow";
import { Placeholder } from "@/components/placeholder";
import { type Drop, formatPrice, meatTypeLabel } from "@/lib/types";

/**
 * "THIS WEEK" grid of the current batch's flavors as photo cards, each linking
 * to its detail view. First photo is the thumbnail; placeholder when none.
 */
export function FlavorMenu({ drop }: { drop: Drop }) {
  return (
    <div>
      <Eyebrow>This week</Eyebrow>
      <h2 className="font-display mt-3 text-3xl font-extrabold uppercase leading-[0.95] text-navy sm:text-4xl">
        On the board now
      </h2>
      <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {drop.flavors.map((f) => (
          <li key={f.id}>
            <Link
              href={`/flavors/${f.id}`}
              className="group block border border-navy/15 bg-paper transition-[border-color] hover:border-ember"
            >
              <div className="relative overflow-hidden">
                {f.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={f.photos[0]}
                    alt={f.name}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <Placeholder label="Flavor photo" ratio="4/3" tone="navy" />
                )}
                {f.sold_out && (
                  <span className="font-mono absolute right-2 top-2 border border-ember bg-cream/90 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.12em] text-ember">
                    Sold out
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-ember">
                  {meatTypeLabel(f.meat_type)}
                </p>
                <h3 className="font-display mt-1 text-xl font-extrabold uppercase leading-tight text-navy">
                  {f.name}
                </h3>
                <p className="font-mono mt-1 text-sm text-char">
                  {f.sold_out ? (
                    <span className="text-ember">Sold out</span>
                  ) : (
                    <>
                      {formatPrice(f.price_cents)}{" "}
                      <span className="text-smoke">/ 3-pack</span>
                    </>
                  )}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
