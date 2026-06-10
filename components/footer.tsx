import Link from "next/link";

const LINKS = [
  { href: "/drop", label: "Drop" },
  { href: "/flavors", label: "Flavors" },
  { href: "/merch", label: "Merch" },
  { href: "/about", label: "About" },
];

export function Footer() {
  return (
    <footer className="mt-auto bg-navy-deep text-cream">
      <div className="container grid gap-12 py-16 md:grid-cols-2">
        {/* Brand + badge placeholder */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <span
              role="img"
              aria-label="Hossauges badge"
              className="flex size-12 items-center justify-center border border-cream/30 font-mono text-[0.55rem] uppercase tracking-widest text-cream/60"
            >
              Badge
            </span>
            <span className="font-display text-2xl font-extrabold uppercase tracking-[0.04em]">
              Hoss<span className="text-ember">auges</span>
            </span>
          </div>
          <p className="max-w-sm text-sm text-cream/70">
            Small-batch sausage, made by hand in Columbia, SC. New flavors drop
            weekly.
          </p>
        </div>

        {/* Notify-me (visual only this session) + nav */}
        <div className="flex flex-col gap-8">
          <form className="flex flex-col gap-3" aria-label="Get drop alerts">
            <label
              htmlFor="footer-notify"
              className="font-mono text-xs uppercase tracking-[0.18em] text-cream/80"
            >
              Get drop alerts
            </label>
            <div className="flex gap-2">
              <input
                id="footer-notify"
                type="email"
                placeholder="you@email.com"
                className="min-w-0 flex-1 border border-cream/30 bg-transparent px-4 py-3 text-sm text-cream placeholder:text-cream/40 focus-visible:border-ember"
              />
              <button
                type="button"
                className="font-mono shrink-0 bg-ember px-5 py-3 text-xs uppercase tracking-[0.18em] text-cream transition-colors hover:bg-cream hover:text-navy-deep"
              >
                Notify me
              </button>
            </div>
          </form>

          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-6">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-mono text-xs uppercase tracking-[0.18em] text-cream/80 transition-colors hover:text-ember"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      <div className="border-t border-cream/15">
        <div className="container flex flex-col gap-2 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-cream/60">
            Est. 2024 — Columbia, SC
          </p>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.22em] text-cream/40">
            © {/* static label, no date dependency */}Hossauges
          </p>
        </div>
      </div>
    </footer>
  );
}
