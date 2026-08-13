"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminLogout } from "@/app/admin/auth-actions";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/admin", label: "Batch" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/site-text", label: "Site text" },
  { href: "/admin/preorder", label: "Pre-order" },
  { href: "/admin/submissions", label: "Reservations" },
];

/** Small ember count pill on the Reservations item. Hidden at zero. */
function UnpaidBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-ember px-1.5 text-[0.7rem] font-semibold tabular-nums text-cream">
      {count}
    </span>
  );
}

export function AdminNav({ unpaidCount = 0 }: { unpaidCount?: number }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <>
      {/* Desktop: fixed left rail (≥840px). */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[186px] flex-col bg-navy-deep text-cream min-[840px]:flex">
        <div className="px-5 py-5">
          <span className="font-display text-lg font-extrabold uppercase tracking-[0.04em]">
            Hoss<span className="text-ember">auges</span>
          </span>
          <span className="mt-1 block text-xs text-cream/50">Admin</span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-2">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive(tab.href) ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center justify-between gap-2 border-l-[3px] px-3 text-[14.5px] transition-colors",
                isActive(tab.href)
                  ? "border-ember bg-black/20 text-cream"
                  : "border-transparent text-cream/[0.58] hover:text-cream",
              )}
            >
              <span>{tab.label}</span>
              {tab.href === "/admin/submissions" && <UnpaidBadge count={unpaidCount} />}
            </Link>
          ))}
        </nav>

        <form action={adminLogout} className="p-2">
          <button
            type="submit"
            className="flex min-h-11 w-full items-center px-3 text-[14.5px] text-cream/[0.58] transition-colors hover:text-ember"
          >
            Log out
          </button>
        </form>
      </aside>

      {/* Phone / small screens: the horizontal tab bar (hidden ≥840px). */}
      <header className="sticky top-0 z-40 border-b border-navy/15 bg-navy text-cream min-[840px]:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <span className="font-display text-lg font-extrabold uppercase tracking-[0.04em]">
            Hoss<span className="text-ember">auges</span>
            <span className="ml-2 text-xs text-cream/60">Admin</span>
          </span>
          <form action={adminLogout}>
            <button
              type="submit"
              className="min-h-11 px-3 text-sm text-cream/80 transition-colors hover:text-ember"
            >
              Log out
            </button>
          </form>
        </div>

        <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive(tab.href) ? "page" : undefined}
              className={cn(
                "flex min-h-12 shrink-0 items-center justify-center gap-1.5 px-4 text-sm transition-colors",
                isActive(tab.href)
                  ? "border-b-2 border-ember text-cream"
                  : "border-b-2 border-transparent text-cream/60 hover:text-cream",
              )}
            >
              {tab.label}
              {tab.href === "/admin/submissions" && <UnpaidBadge count={unpaidCount} />}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
