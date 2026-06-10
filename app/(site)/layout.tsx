import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

// Public site shell: sticky nav + footer. The /admin tree has its own shell and
// deliberately does not render these.
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
