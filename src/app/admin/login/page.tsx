"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "../actions";

const initial: LoginState = { error: null };

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <main className="grid min-h-dvh place-items-center bg-base px-4">
      <div className="w-full max-w-sm rounded-md border border-border bg-surface p-6 shadow-card">
        <h1 className="text-xl font-bold text-ink">Admin CasinOnline</h1>
        <p className="mt-1 text-sm text-ink-secondary">Autentificare administrator.</p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink-secondary">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              className="h-11 rounded-sm border border-border bg-field px-3 text-sm text-ink outline-none focus-visible:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink-secondary">Parolă</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              className="h-11 rounded-sm border border-border bg-field px-3 text-sm text-ink outline-none focus-visible:border-accent"
            />
          </label>

          {state.error ? (
            <p role="alert" className="text-sm font-medium text-danger">
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-sm bg-accent px-4 text-sm font-semibold text-[#06110a] transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "Se autentifică…" : "Autentificare"}
          </button>
        </form>
      </div>
    </main>
  );
}
