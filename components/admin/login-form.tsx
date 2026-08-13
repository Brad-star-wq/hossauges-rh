"use client";

import { useActionState } from "react";
import { adminLogin, type LoginState } from "@/app/admin/auth-actions";
import { Label, Field, Button, StatusLine } from "@/components/admin/ui";

const initial: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(adminLogin, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Label htmlFor="password">Password</Label>
      <Field
        id="password"
        name="password"
        type="password"
        autoFocus
        autoComplete="current-password"
        aria-invalid={!!state.error}
      />
      <StatusLine result={state.error ? { ok: false, message: state.error } : null} />
      <Button type="submit" variant="primary" disabled={pending} className="min-h-12 w-full py-4">
        {pending ? "Checking…" : "Log in"}
      </Button>
    </form>
  );
}
