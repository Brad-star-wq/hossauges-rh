import type { Metadata } from "next";
import { Eyebrow } from "@/components/eyebrow";
import { FlavorArchive } from "@/components/flavor-archive";
import { FlavorMenu } from "@/components/flavor-menu";
import { getArchiveFlavors, getActiveDrop } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Flavors",
  description:
    "This week's flavors plus every Hossauges sausage we've ever smoked. Vote your favorites back onto the board.",
};
export const revalidate = 60;

export default async function FlavorsPage() {
  const [drop, archive] = await Promise.all([getActiveDrop(), getArchiveFlavors()]);

  return (
    <div className="paper-grain">
      <section className="container py-16 sm:py-24">
        <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.95] text-navy sm:text-7xl">
          Flavors
        </h1>
        <p className="mt-4 max-w-md text-lg text-char">
          This week&apos;s batch, and everything we&apos;ve ever smoked.
        </p>

        {/* This week's menu */}
        {drop && drop.flavors.length > 0 && (
          <div className="mt-12">
            <FlavorMenu drop={drop} />
          </div>
        )}

        {/* All-time archive */}
        <div className="mt-16">
          <Eyebrow>The archive</Eyebrow>
          <h2 className="font-display mt-3 text-3xl font-extrabold uppercase leading-[0.95] text-navy sm:text-4xl">
            Every flavor ever
          </h2>
          <div className="mt-8">
            {archive.length === 0 ? (
              <p className="font-display text-3xl font-extrabold uppercase text-smoke">
                No flavors archived yet.
              </p>
            ) : (
              <FlavorArchive flavors={archive} />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
