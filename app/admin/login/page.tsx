import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { isAdmin } from "@/lib/admin-session";

export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

export default async function AdminLoginPage() {
  // Already signed in? Skip the form.
  if (await isAdmin()) redirect("/admin");

  return (
    <main className="flex min-h-[calc(100svh-4rem)] items-center justify-center bg-cream px-5 py-16">
      <div className="w-full max-w-sm border-2 border-navy bg-paper p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ember">
          ★ Hossauges
        </p>
        <h1 className="font-display mt-2 text-4xl font-extrabold uppercase leading-[0.95] text-navy">
          Owner login
        </h1>
        <p className="mt-2 text-sm text-smoke">
          Enter the shared password to manage drops, merch, and reservations.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
