"use client";

import { useActionState, useState } from "react";
import { saveEvergreenPage, type EvergreenFormState } from "@/app/admin/(panel)/seo-bonus-pages/actions";
import { EVERGREEN_INTENTS } from "@/lib/evergreen-bonus";
import type { EvergreenPageRow, OperatorOption, BonusOption } from "@/lib/db/admin-seo-bonus-pages";

const input = "h-10 rounded-sm border border-border bg-field px-3 text-sm text-ink outline-none focus-visible:border-accent";
const area = "min-h-20 rounded-sm border border-border bg-field px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent";

export function EvergreenBonusPageForm({
  initial,
  operators,
  bonuses,
}: {
  initial?: EvergreenPageRow | null;
  operators: OperatorOption[];
  bonuses: BonusOption[];
}) {
  const [state, action, pending] = useActionState<EvergreenFormState, FormData>(saveEvergreenPage, { error: null });
  const [casinoId, setCasinoId] = useState(initial?.casinoId ?? "");
  const featuredOptions = bonuses.filter((b) => b.casinoId === casinoId);

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4">
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Operator * (doar published)</span>
          <select name="casino_id" required value={casinoId} onChange={(e) => setCasinoId(e.target.value)} className={input}>
            <option value="">— alege —</option>
            {operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Intenție SEO *</span>
          <select name="intent" required defaultValue={initial?.intent ?? ""} className={input}>
            <option value="">— alege —</option>
            {Object.entries(EVERGREEN_INTENTS).map(([slug, v]) => <option key={slug} value={slug}>{v.label} ({slug})</option>)}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Ofertă featured (opțional — doar oferte ale operatorului selectat)</span>
        <select name="featured_bonus_id" defaultValue={initial?.featuredBonusId ?? ""} className={input} disabled={!casinoId}>
          <option value="">— fără ofertă featured —</option>
          {featuredOptions.map((b) => <option key={b.id} value={b.id}>{b.offer} · {b.typeSlug}</option>)}
        </select>
        <span className="text-xs text-ink-muted">Compatibilitatea cu intenția e validată la salvare (server-side).</span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Status *</span>
        <select name="status" defaultValue={initial?.status ?? "draft"} className={`${input} w-40`}>
          <option value="draft">draft</option>
          <option value="published">published</option>
          <option value="archived">archived</option>
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">H1</span>
          <input name="h1" defaultValue={initial?.h1 ?? ""} className={input} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Meta title</span>
          <input name="meta_title" defaultValue={initial?.metaTitle ?? ""} className={input} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Meta description</span>
        <input name="meta_description" defaultValue={initial?.metaDescription ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Introducere editorială</span>
        <textarea name="intro" defaultValue={initial?.intro ?? ""} className={area} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Conținut editorial (body) — ghid revendicare, explicații (fără date comerciale hardcodate)</span>
        <textarea name="body" defaultValue={initial?.body ?? ""} className={`${area} min-h-40`} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">FAQ — câte o linie: Întrebare | Răspuns</span>
        <textarea name="faq" defaultValue={(initial?.faq ?? []).map((f) => `${f.question} | ${f.answer}`).join("\n")} className={area} />
      </label>
      <input type="hidden" name="sort_order" value="0" />

      {state.error ? <p role="alert" className="text-sm font-medium text-danger">{state.error}</p> : null}
      <div>
        <button type="submit" disabled={pending} className="h-10 rounded-sm bg-accent px-5 text-sm font-semibold text-[#06110a] hover:bg-accent-hover disabled:opacity-50">
          {pending ? "Se salvează…" : initial ? "Salvează" : "Creează pagina"}
        </button>
      </div>
    </form>
  );
}
