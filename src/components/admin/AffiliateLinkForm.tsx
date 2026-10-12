"use client";

import { useActionState } from "react";
import type { AffiliateFormState } from "@/app/admin/(panel)/affiliate-links/types";
import { AFFILIATE_PLACEMENTS } from "@/lib/affiliate-placements";
import type { AffiliateLinkEditData } from "@/lib/db/admin-affiliates";
import type { Option } from "@/lib/db/admin-casinos";

interface Props {
  mode: "create" | "edit";
  action: (state: AffiliateFormState, formData: FormData) => Promise<AffiliateFormState>;
  initial?: AffiliateLinkEditData | null;
  casinos: Option[];
}

const input =
  "h-10 rounded-sm border border-border bg-field px-3 text-sm text-ink outline-none focus-visible:border-accent";

export function AffiliateLinkForm({ mode, action, initial, casinos }: Props) {
  const [state, formAction, pending] = useActionState<AffiliateFormState, FormData>(action, {
    error: null,
  });

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Cazino *</span>
        <select name="casino_id" required defaultValue={initial?.casinoId ?? ""} className={input}>
          <option value="" disabled>
            — alege cazino —
          </option>
          {casinos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Placement *</span>
        <select name="placement" required defaultValue={initial?.placement ?? "review_cta"} className={input}>
          {AFFILIATE_PLACEMENTS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink-muted">
          <code>review_cta</code> (fără campanie) e linkul folosit de <code>/go/&lt;casino&gt;</code>.
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">URL operator *</span>
        <input
          name="url"
          type="url"
          required
          pattern="https://.*"
          placeholder="https://www.operator.ro/..."
          defaultValue={initial?.url}
          className={input}
        />
        <span className="text-xs text-ink-muted">Trebuie să înceapă cu https://</span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Campanie (opțional)</span>
        <input
          name="campaign"
          defaultValue={initial?.campaign}
          placeholder="ex. betano-fara-rulaj"
          className={input}
        />
        <span className="text-xs text-ink-muted">
          Gol = linkul implicit. Mai multe campanii active per placement sunt permise.
        </span>
      </label>

      <label className="flex items-center gap-2.5 text-sm text-ink">
        <input type="checkbox" name="is_active" defaultChecked={initial?.isActive ?? true} />
        Activ
      </label>

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-sm bg-accent px-5 text-sm font-semibold text-[#06110a] transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "Se salvează…" : mode === "edit" ? "Salvează modificările" : "Creează linkul"}
        </button>
        <a href="/admin/affiliate-links" className="text-sm text-ink-secondary hover:text-ink">
          Anulează
        </a>
      </div>
    </form>
  );
}
