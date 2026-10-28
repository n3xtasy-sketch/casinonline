"use client";

import { useActionState } from "react";
import { createSeoProject, type SeoProjectFormState } from "@/app/admin/(panel)/seo-research/actions";

const input =
  "h-10 rounded-sm border border-border bg-field px-3 text-sm text-ink outline-none focus-visible:border-accent";

export function SeoProjectForm() {
  const [state, action, pending] = useActionState<SeoProjectFormState, FormData>(createSeoProject, { error: null });
  return (
    <form action={action} className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-surface p-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Nume proiect</span>
        <input name="name" required placeholder="ex. Cazinouri online — research" className={`${input} w-72`} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Țară</span>
        <input name="default_country" defaultValue="ro" maxLength={2} className={`${input} w-20`} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-sm bg-accent px-5 text-sm font-semibold text-[#06110a] transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? "Se creează…" : "Creează proiect"}
      </button>
      {state.error ? <p role="alert" className="w-full text-sm font-medium text-danger">{state.error}</p> : null}
    </form>
  );
}
