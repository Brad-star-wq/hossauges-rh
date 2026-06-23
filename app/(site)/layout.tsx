import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { AnnouncementBar } from "@/components/announcement-bar";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/types";
import { getSiteText } from "@/lib/queries";
import { announcementEnabled } from "@/lib/site-text";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FoodEstablishment",
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: SITE_URL,
  image: `${SITE_URL}/opengraph-image`,
  servesCuisine: "Sausage",
  foundingDate: "2024",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Columbia",
    addressRegion: "SC",
    addressCountry: "US",
  },
  email: "hossaugessc@outlook.com",
  sameAs: ["https://instagram.com/hossaugessc"],
};

// Keep the shared shell on ISR so the editable footer/announcement refresh
// within the normal revalidate window instead of being fully dynamic.
export const revalidate = 60;

// Public site shell: optional announcement bar + sticky nav + footer +
// LocalBusiness structured data. The /admin tree has its own shell and
// deliberately does not render these.
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const text = await getSiteText();

  return (
    <div className="flex min-h-svh flex-col">
      <script
        type="application/ld+json"
        // Static, trusted JSON — safe to inline.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {announcementEnabled(text) && <AnnouncementBar text={text.announcement_text} />}
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer tagline={text.footer_tagline} notifyBlurb={text.notify_blurb} />
    </div>
  );
}
