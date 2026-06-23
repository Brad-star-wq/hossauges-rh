import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MerchDetail } from "@/components/merch-detail";
import { getSquareMerchItem } from "@/lib/square";

// Live from Square, cached ~60s. Editing an item in Square (add a color, new
// photo, stock to 0, new price) reflects here within about a minute.
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const res = await getSquareMerchItem(id);
  if (!res.ok) return { title: "Merch" };
  return {
    title: res.item.name,
    description:
      res.item.description ||
      `${res.item.name} — Hossauges merch. Checkout handled securely by Square.`,
  };
}

export default async function MerchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await getSquareMerchItem(id);

  // Unknown id → real 404. Square unreachable → graceful error (not a crash).
  if (!res.ok && res.notFound) notFound();

  return (
    <div className="paper-grain">
      <section className="container py-12 sm:py-20">
        <Link
          href="/merch"
          className="font-mono text-xs uppercase tracking-[0.18em] text-smoke transition-colors hover:text-ember"
        >
          ← All merch
        </Link>

        <div className="mt-6">
          {res.ok ? (
            <MerchDetail item={res.item} />
          ) : (
            <p className="font-display mt-10 text-3xl font-extrabold uppercase text-smoke">
              Merch is taking a quick break — check back soon.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
