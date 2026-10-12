"use client";

import { useActionState } from "react";
import type { RedirectFormState } from "@/app/admin/(panel)/redirects/types";
import type { RedirectRow } from "@/lib/db/admin-redirects";

interface Props {
  mode: "create" | "edit";
  action: (state: RedirectFormState, formData: FormData) => Promise<RedirectFormState>;
  initial?: RedirectRow | null;
}

const input =
  "h-10 rounded-sm border border-border bg-field px-3 text-sm text-ink outline-none focus-visible:border-accent";

export function RedirectForm({ mode, action, initial }: Props) {
  const [state, formAction, pending] = useActionState<RedirectFormState, FormData>(action, {
    error: null,
  });

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">De la (from_path) *</span>
        <input name="from_path" required defaultValue={initial?.fromPath} placeholder="/vechi-ghid" className={input} />
        <span className="text-xs text-ink-muted">Cale internă. Nu /admin, /go, /api, /_next sau asset.</span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Către (to_path) *</span>
        <input name="to_path" required defaultValue={initial?.toPath} placeholder="/ghiduri/nou-ghid" className={input} />
        <span className="text-xs text-ink-muted">Cale internă relativă (v1 nu permite URL-uri externe).</span>
      </label>

      <div className="flex flex-wrap items-end gap-6">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Cod</span>
          <select name="status_code" defaultValue={String(initial?.statusCode ?? 301)} className={input}>
            <option value="301">301 (permanent)</option>
            <option value="302">302 (temporar)</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="is_active" defaultChecked={initial?.isActive ?? true} />
          Activ
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Notă (opțional)</span>
        <input name="note" defaultValue={initial?.note} className={input} />
      </label>

      {state.error ? <p role="alert" className="text-sm font-medium text-danger">{state.error}</p> : null}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="h-10 rounded-sm bg-accent px-5 text-sm font-semibold text-[#06110a] hover:bg-accent-hover disabled:opacity-50">
          {pending ? "Se salvează…" : mode === "edit" ? "Salvează" : "Creează redirect"}
        </button>
        <a href="/admin/redirects" className="text-sm text-ink-secondary hover:text-ink">Anulează</a>
      </div>
    </form>
  );
}
