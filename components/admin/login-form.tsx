"use client";

import { useActionState } from "react";
import { adminLogin, type LoginState } from "@/app/admin/auth-actions";

const initial: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(adminLogin, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label htmlFor="password" className="font-mono text-xs uppercase tracking-[0.18em] text-navy">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoFocus
        autoComplete="current-password"
        aria-invalid={!!state.error}
        className="w-full border border-navy/30 bg-paper px-4 py-4 text-base text-char focus-visible:border-ember"
      />
      {state.error && (
        <p role="alert" className="font-mono text-xs uppercase tracking-[0.12em] text-ember">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="font-mono min-h-12 w-full bg-ember px-6 py-4 text-xs uppercase tracking-[0.18em] text-cream transition-colors hover:bg-navy disabled:opacity-60"
      >
        {pending ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}
