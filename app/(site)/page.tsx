import Link from "next/link";
import { Hero } from "@/components/hero";
import { Section } from "@/components/section";
import { Eyebrow } from "@/components/eyebrow";
import { Button } from "@/components/button";
import { DropBoard } from "@/components/drop-board";
import { Ticker } from "@/components/ticker";
import { HowItWorks } from "@/components/how-it-works";
import { Placeholder } from "@/components/placeholder";
import {
  getActiveDrop,
  getArchiveFlavors,
  getMerch,
  getSiteContent,
} from "@/lib/queries";
import { formatPrice } from "@/lib/types";

export const revalidate = 60;

export default async function HomePage() {
  const [drop, archive, merch, content] = await Promise.all([
    getActiveDrop(),
    getArchiveFlavors(),
    getMerch(),
    getSiteContent(),
  ]);

  const tickerItems = archive.map((f) => f.name);
  const teaserMerch = merch.slice(0, 3);

  return (
    <>
      <Hero photoUrl={content.home_hero_url || null} />

      {/* Compact batch board */}
      {drop && (
        <Section className="paper-grain">
          <div className="mx-auto max-w-md">
            <Eyebrow>This week</Eyebrow>
            <div className="mt-4">
              <DropBoard drop={drop} variant="condensed" />
            </div>
          </div>
        </Section>
      )}

      {/* Flavor ticker — every flavor ever made */}
      {tickerItems.length > 0 && <Ticker items={tickerItems} />}

      {/* How it works (slim) */}
      <HowItWorks />

      {/* Merch teaser */}
      {teaserMerch.length > 0 && (
        <Section className="paper-grain">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Wear the brand</Eyebrow>
              <h2 className="font-display mt-3 text-4xl font-extrabold uppercase leading-[0.95] text-navy sm:text-5xl">
                Merch
              </h2>
            </div>
            <Button href="/merch" variant="secondary">
              Shop all
            </Button>
          </div>
          <ul className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3">
            {teaserMerch.map((item) => (
              <li key={item.id}>
                <Link href="/merch" className="group block">
                  <div className="overflow-hidden border border-navy/15">
                    <Placeholder
                      label="Merch photo"
                      ratio="4/5"
                      tone="cream"
                      className="transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <p className="font-display mt-3 text-lg font-bold uppercase leading-tight text-navy">
                    {item.name}
                  </p>
                  <p className="font-mono text-sm text-smoke">
                    {formatPrice(item.price_cents)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Story teaser */}
      <section className="bg-sage-wash">
        <Section as="div" className="!py-0">
          <div className="grid items-center gap-10 py-16 sm:py-24 md:grid-cols-2">
            <Placeholder label="Story photo" ratio="4/3" tone="navy" />
            <div>
              <Eyebrow>Our story</Eyebrow>
              <h2 className="font-display mt-3 text-4xl font-extrabold uppercase leading-[0.95] text-navy sm:text-5xl">
                Made by hand, by two friends.
              </h2>
              <p className="mt-4 max-w-prose text-char">
                We started Hossauges in 2024 in Columbia, SC, grinding and
                smoking about a hundred pounds a week. Every batch is small,
                hands-on, and a little experimental.
              </p>
              <div className="mt-6">
                <Button href="/about" variant="secondary">
                  Our story
                </Button>
              </div>
            </div>
          </div>
        </Section>
      </section>
    </>
  );
}
