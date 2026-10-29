"use client";

import { useActionState } from "react";
import { saveCategory, type CategoryFormState } from "@/app/admin/(panel)/seo-categories/actions";
import type { SeoCategory } from "@/lib/seo-categories";

const input = "h-10 rounded-sm border border-border bg-field px-3 text-sm text-ink outline-none focus-visible:border-accent";
const area = "min-h-20 rounded-sm border border-border bg-field px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent";

const SELECTOR_HINTS: Record<string, string> = {
  bonus: "bonus:no_deposit · bonus:no_deposit+free_spins · bonus:no_wagering · bonus:type=<slug>",
  game: "game:category=<slug> · game:gratis",
  casino: "casino:tag=<slug> · casino:license_onjn",
};

export function SeoCategoryForm({ initial }: { initial?: SeoCategory | null }) {
  const [state, action, pending] = useActionState<CategoryFormState, FormData>(saveCategory, { error: null });
  const ns = initial?.namespace ?? "bonus";

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4">
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Namespace *</span>
          <select name="namespace" defaultValue={ns} disabled={!!initial} className={input}>
            <option value="bonus">bonus → /bonusuri</option>
            <option value="game">game → /pacanele-online</option>
            <option value="casino">casino → /cazinouri-online</option>
          </select>
          {initial ? <input type="hidden" name="namespace" value={ns} /> : null}
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Status *</span>
          <select name="status" defaultValue={initial?.status ?? "draft"} className={input}>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Slug * (fără /categorie/)</span>
          <input name="slug" required defaultValue={initial?.slug} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="bonus-fara-depunere" className={input} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Nume *</span>
          <input name="name" required defaultValue={initial?.name} placeholder="Bonus fără depunere" className={input} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Selector *</span>
        <input name="selector" required defaultValue={initial?.selector} placeholder="bonus:no_deposit" className={input} />
        <span className="text-xs text-ink-muted">Exemple {ns}: {SELECTOR_HINTS[ns]}</span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Meta title</span>
          <input name="meta_title" defaultValue={initial?.metaTitle ?? ""} className={input} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">H1</span>
          <input name="h1" defaultValue={initial?.h1 ?? ""} className={input} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Meta description</span>
        <input name="meta_description" defaultValue={initial?.metaDescription ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Descriere (scurtă, pt listări)</span>
        <input name="description" defaultValue={initial?.description ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Intro (text editorial, sus pe pagină)</span>
        <textarea name="intro" defaultValue={initial?.intro ?? ""} className={area} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Conținut suplimentar (body)</span>
        <textarea name="body" defaultValue={initial?.body ?? ""} className={area} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">FAQ — câte o linie: Întrebare | Răspuns</span>
        <textarea name="faq" defaultValue={(initial?.faq ?? []).map((f) => `${f.question} | ${f.answer}`).join("\n")} className={area} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Sort order</span>
        <input name="sort_order" type="number" defaultValue={initial?.sortOrder ?? 0} className={`${input} w-28`} />
      </label>

      {state.error ? <p role="alert" className="text-sm font-medium text-danger">{state.error}</p> : null}
      <div>
        <button type="submit" disabled={pending} className="h-10 rounded-sm bg-accent px-5 text-sm font-semibold text-[#06110a] hover:bg-accent-hover disabled:opacity-50">
          {pending ? "Se salvează…" : initial ? "Salvează modificările" : "Creează categoria"}
        </button>
      </div>
    </form>
  );
}
