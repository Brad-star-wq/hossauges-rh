"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminLogout } from "@/app/admin/auth-actions";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/admin", label: "Batch" },
  { href: "/admin/merch", label: "Merch" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/site-text", label: "Site Text" },
  { href: "/admin/preorder", label: "Pre-order" },
  { href: "/admin/submissions", label: "Submissions" },
];

export function AdminNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-navy/15 bg-navy text-cream">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <span className="font-display text-lg font-extrabold uppercase tracking-[0.04em]">
          Hoss<span className="text-ember">auges</span>
          <span className="ml-2 font-mono text-[0.6rem] tracking-[0.2em] text-cream/60">
            ADMIN
          </span>
        </span>
        <form action={adminLogout}>
          <button
            type="submit"
            className="font-mono min-h-11 px-3 text-[0.65rem] uppercase tracking-[0.18em] text-cream/80 transition-colors hover:text-ember"
          >
            Log out
          </button>
        </form>
      </div>

      {/* Tab bar — big touch targets */}
      <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "font-mono flex min-h-12 shrink-0 items-center justify-center px-4 text-[0.7rem] uppercase tracking-[0.14em] transition-colors",
              isActive(tab.href)
                ? "border-b-2 border-ember text-cream"
                : "border-b-2 border-transparent text-cream/60 hover:text-cream",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
