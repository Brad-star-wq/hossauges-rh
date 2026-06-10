import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { isAdmin } from "@/lib/admin-session";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false },
};

// Reading cookies makes every admin page dynamic (never statically cached).
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense-in-depth: middleware already guards, but re-check here too.
  if (!(await isAdmin())) redirect("/admin/login");

  return (
    <div className="min-h-svh bg-cream">
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-6 pb-24">{children}</main>
    </div>
  );
}
