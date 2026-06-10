import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/types";

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

// Public site shell: sticky nav + footer + LocalBusiness structured data. The
// /admin tree has its own shell and deliberately does not render these.
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <script
        type="application/ld+json"
        // Static, trusted JSON — safe to inline.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
