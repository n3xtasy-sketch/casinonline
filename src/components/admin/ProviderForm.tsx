"use client";

import { useActionState } from "react";
import type { ProviderFormState } from "@/app/admin/(panel)/furnizori/types";
import type { ProviderEditData } from "@/lib/db/admin-providers";
import { MediaField } from "@/components/admin/MediaField";

interface Props {
  mode: "create" | "edit";
  action: (state: ProviderFormState, formData: FormData) => Promise<ProviderFormState>;
  initial?: ProviderEditData | null;
  categories: string[];
}

const input =
  "h-10 rounded-sm border border-border bg-field px-3 text-sm text-ink outline-none focus-visible:border-accent";
const area =
  "min-h-24 rounded-sm border border-border bg-field px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent";

function Text({
  label,
  name,
  defaultValue,
  type = "text",
  ...rest
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink-secondary">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} className={input} {...rest} />
    </label>
  );
}

export function ProviderForm({ mode, action, initial, categories }: Props) {
  const [state, formAction, pending] = useActionState<ProviderFormState, FormData>(action, {
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
          <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="ex. pragmatic-play" className={input} />
        )}
      </label>

      <Text label="Nume provider *" name="name" defaultValue={initial?.name} required />
      <MediaField label="Logo" name="logo_url" defaultValue={initial?.logoUrl} folder="providers" />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Categorie</span>
          <input name="category" list="provider-category-opts" defaultValue={initial?.category} className={input} placeholder="ex. Sloturi & Live" />
          <datalist id="provider-category-opts">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <Text label="An fondare" name="founded" type="number" min="1900" max="2100" step="1" defaultValue={initial?.founded} />
        <Text label="Țară / sediu" name="country" defaultValue={initial?.country} placeholder="ex. Malta" />
        <Text label="Specialitate" name="specialty" defaultValue={initial?.specialty} placeholder="ex. Sloturi & Live Casino" />
        <Text label="RTP mediu" name="rtp_range" defaultValue={initial?.rtpRange} placeholder="ex. 96% – 97%" />
      </div>

      {/* game_count is read-only here — maintained automatically from the games table. */}
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Număr jocuri (calculat automat)</span>
        <input
          readOnly
          value={mode === "edit" ? String(initial?.gameCount ?? 0) : "0"}
          className={`${input} cursor-not-allowed text-ink-muted`}
        />
        <span className="text-xs text-ink-muted">
          Se actualizează singur din jocurile atribuite acestui furnizor — nu se editează manual.
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Descriere / intro</span>
        <textarea name="intro" defaultValue={initial?.intro} className={area} />
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
          {pending ? "Se salvează…" : mode === "edit" ? "Salvează modificările" : "Creează furnizorul"}
        </button>
        <a href="/admin/furnizori" className="text-sm text-ink-secondary hover:text-ink">
          Anulează
        </a>
      </div>
    </form>
  );
}
