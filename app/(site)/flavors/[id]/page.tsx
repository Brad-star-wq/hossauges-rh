import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eyebrow } from "@/components/eyebrow";
import { Stamp } from "@/components/stamp";
import { PhotoGallery } from "@/components/photo-gallery";
import { ReserveForm } from "@/components/reserve-form";
import { getFlavorById } from "@/lib/queries";
import { formatPrice, meatTypeLabel } from "@/lib/types";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getFlavorById(id);
  if (!data) return { title: "Flavor" };
  return {
    title: data.flavor.name,
    description: data.flavor.description || `${data.flavor.name} — Hossauges small-batch sausage.`,
  };
}

export default async function FlavorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getFlavorById(id);
  if (!data) notFound();

  const { flavor, weekLabel, isActive } = data;
  const canReserve = isActive && !flavor.sold_out;

  return (
    <div className="paper-grain">
      <section className="container py-12 sm:py-20">
        <Link
          href="/flavors"
          className="font-mono text-xs uppercase tracking-[0.18em] text-smoke transition-colors hover:text-ember"
        >
          ← All flavors
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          {/* Gallery */}
          <div className="relative">
            <PhotoGallery photos={flavor.photos} alt={flavor.name} />
            {flavor.sold_out && <Stamp />}
          </div>

          {/* Details */}
          <div>
            {isActive && weekLabel && <Eyebrow>{weekLabel}</Eyebrow>}
            <p className="font-mono mt-3 text-[0.65rem] uppercase tracking-[0.2em] text-ember">
              {meatTypeLabel(flavor.meat_type)}
            </p>
            <h1 className="font-display mt-2 text-5xl font-extrabold uppercase leading-[0.95] text-navy sm:text-6xl">
              {flavor.name}
            </h1>
            {flavor.description && (
              <p className="mt-4 max-w-prose text-lg text-char">{flavor.description}</p>
            )}
            <p className="font-mono mt-5 text-lg text-char">
              {formatPrice(flavor.price_cents)} <span className="text-smoke">/ 3-pack</span>
            </p>

            <div className="mt-8">
              {canReserve ? (
                <ReserveForm flavors={[flavor]} />
              ) : flavor.sold_out ? (
                <div className="border-2 border-ember bg-paper p-6">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">
                    ★ Sold out
                  </p>
                  <p className="mt-2 text-char">
                    This one&apos;s gone for now. Vote it back on the{" "}
                    <Link href="/flavors" className="text-ember underline-offset-2 hover:underline">
                      flavors page
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                <div className="border border-navy/20 bg-paper p-6">
                  <p className="text-char">
                    This flavor isn&apos;t on the current menu.{" "}
                    <Link href="/drop" className="text-ember underline-offset-2 hover:underline">
                      See this week&apos;s batch
                    </Link>
                    .
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
