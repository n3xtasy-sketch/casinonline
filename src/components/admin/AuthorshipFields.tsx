"use client";

import { authorOptions } from "@/lib/authors";

/**
 * Reusable CMS fields for editorial authorship: author, verifier, verification date.
 * Field names: author_slug, verifier_slug, verified_at. Shared by the casino/bonus/guide
 * forms. Validation (author != verifier, verified_at requires a verifier) runs server-side
 * via validateAuthorship — this is just the input surface.
 */
const input =
  "h-10 rounded-sm border border-border bg-field px-3 text-sm text-ink outline-none focus-visible:border-accent";

export interface AuthorshipInitial {
  authorSlug?: string;
  verifierSlug?: string;
  /** YYYY-MM-DD for the date input (empty when none). */
  verifiedAt?: string;
}

export function AuthorshipFields({ initial }: { initial?: AuthorshipInitial }) {
  const options = authorOptions();
  return (
    <fieldset className="flex flex-col gap-4 rounded-md border border-border p-4">
      <legend className="px-1 text-sm font-semibold text-ink">Autor si verificare editoriala</legend>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Autor</span>
          <select name="author_slug" defaultValue={initial?.authorSlug ?? ""} className={input}>
            <option value="">— niciunul —</option>
            {options.map((o) => (
              <option key={o.slug} value={o.slug}>{o.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Verificator</span>
          <select name="verifier_slug" defaultValue={initial?.verifierSlug ?? ""} className={input}>
            <option value="">— niciunul —</option>
            {options.map((o) => (
              <option key={o.slug} value={o.slug}>{o.name}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex max-w-xs flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Data verificarii</span>
        <input type="date" name="editorial_verified_at" defaultValue={initial?.verifiedAt ?? ""} className={input} />
      </label>
      <p className="text-xs text-ink-muted">
        Autorul si verificatorul trebuie sa fie persoane diferite. &bdquo;Verificat de&rdquo; apare public doar
        daca exista un verificator si o data a verificarii. Nu completa verificari care nu au avut loc.
      </p>
    </fieldset>
  );
}
