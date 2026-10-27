"use client";

import { useActionState } from "react";
import type { GuideFormState } from "@/app/admin/(panel)/ghiduri/types";
import type { GuideEditData } from "@/lib/db/admin-guides";
import type { Option } from "@/lib/db/admin-casinos";
import { MediaField } from "@/components/admin/MediaField";
import { AuthorshipFields } from "@/components/admin/AuthorshipFields";

interface Props {
  mode: "create" | "edit";
  action: (state: GuideFormState, formData: FormData) => Promise<GuideFormState>;
  initial?: GuideEditData | null;
  categories: Option[];
}

const input =
  "h-10 rounded-sm border border-border bg-field px-3 text-sm text-ink outline-none focus-visible:border-accent";
const area =
  "min-h-24 rounded-sm border border-border bg-field px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent";
const mono =
  "min-h-56 rounded-sm border border-border bg-field px-3 py-2 font-mono text-[13px] leading-relaxed text-ink outline-none focus-visible:border-accent";

const SECTIONS_PLACEHOLDER = `## Ce este rulajul
Rulajul reprezintă de câte ori trebuie să pariezi bonusul înainte de retragere.

Cu cât rulajul este mai mic, cu atât e mai avantajos.

## Cum se calculează
Se înmulțește valoarea bonusului cu numărul rulajului.

### Exemplu
Bonus 100 RON × x30 = 3.000 RON de pariat.`;

export function GuideForm({ mode, action, initial, categories }: Props) {
  const [state, formAction, pending] = useActionState<GuideFormState, FormData>(action, {
    error: null,
  });

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">
          Slug {mode === "edit" ? "(nu se poate schimba)" : "*"}
        </span>
        {mode === "edit" ? (
          <input readOnly defaultValue={initial?.slug} className={`${input} cursor-not-allowed text-ink-muted`} />
        ) : (
          <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="ex. cum-functioneaza-rulajul" className={input} />
        )}
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Titlu *</span>
          <input name="title" required defaultValue={initial?.title} className={input} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Categorie *</span>
          <select name="category_id" required defaultValue={initial?.categoryId ?? ""} className={input}>
            <option value="" disabled>
              — alege categorie —
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Autor</span>
          <input name="author" defaultValue={initial?.author} className={input} placeholder="Echipa CasinOnline" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Reading time</span>
          <input name="reading_time" defaultValue={initial?.readingTime} className={input} placeholder="5 min" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Publicat la</span>
          <input name="published_at" type="date" defaultValue={initial?.publishedAt} className={input} />
        </label>
      </div>

      <MediaField label="Imagine" name="image_url" defaultValue={initial?.imageUrl} folder="guides" />

      <AuthorshipFields
        initial={{
          authorSlug: initial?.authorSlug,
          verifierSlug: initial?.verifierSlug,
          verifiedAt: initial?.editorialVerifiedAt,
        }}
      />

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Excerpt</span>
        <textarea name="excerpt" defaultValue={initial?.excerpt} className={area} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Intro</span>
        <textarea name="intro" defaultValue={initial?.intro} className={area} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Secțiuni</span>
        <textarea
          name="sections"
          defaultValue={initial?.sectionsText}
          placeholder={SECTIONS_PLACEHOLDER}
          className={mono}
        />
        <span className="text-xs text-ink-muted">
          <code>## Titlu</code> = secțiune (H2), <code>### Titlu</code> = subsecțiune (H3). O linie goală
          separă paragrafele. ID-urile se generează automat din titluri.
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Related links (o linie: /rută | Etichetă)</span>
        <textarea
          name="related_links"
          defaultValue={initial?.relatedLinksText}
          placeholder={"/bonusuri-casino | Vezi toate bonusurile\n/cazinouri-online | Cazinouri recomandate"}
          className={area}
        />
        <span className="text-xs text-ink-muted">
          Doar rute interne (încep cu un singur <code>/</code>). Linkurile externe sunt respinse la salvare.
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">FAQ (o linie: Întrebare | Răspuns)</span>
        <textarea
          name="faq"
          defaultValue={initial?.faq.map((f) => `${f.question} | ${f.answer}`).join("\n")}
          className={area}
        />
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
          {pending ? "Se salvează…" : mode === "edit" ? "Salvează modificările" : "Creează ghidul"}
        </button>
        <a href="/admin/ghiduri" className="text-sm text-ink-secondary hover:text-ink">
          Anulează
        </a>
      </div>
    </form>
  );
}
