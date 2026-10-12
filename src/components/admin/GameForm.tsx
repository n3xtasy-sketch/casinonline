"use client";

import { useActionState } from "react";
import type { GameFormState } from "@/app/admin/(panel)/jocuri/types";
import type { GameEditData } from "@/lib/db/admin-games";
import type { Option } from "@/lib/db/admin-casinos";
import { MediaField } from "@/components/admin/MediaField";

interface Props {
  mode: "create" | "edit";
  action: (state: GameFormState, formData: FormData) => Promise<GameFormState>;
  initial?: GameEditData | null;
  providers: Option[];
  categories: Option[];
  casinos: Option[];
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

function Area({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink-secondary">{label}</span>
      <textarea name={name} defaultValue={defaultValue} className={area} />
    </label>
  );
}

function CheckGroup({
  legend,
  name,
  options,
  selected,
}: {
  legend: string;
  name: string;
  options: Option[];
  selected: string[];
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-ink-secondary">{legend}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map((o) => (
          <label key={o.id} className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name={name} value={o.id} defaultChecked={selected.includes(o.id)} />
            {o.label}
          </label>
        ))}
        {options.length === 0 ? <span className="text-sm text-ink-muted">— niciunul —</span> : null}
      </div>
    </fieldset>
  );
}

export function GameForm({ mode, action, initial, providers, categories, casinos }: Props) {
  const [state, formAction, pending] = useActionState<GameFormState, FormData>(action, {
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
          <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="ex. sweet-bonanza" className={input} />
        )}
      </label>

      <Text label="Nume joc *" name="name" defaultValue={initial?.name} required />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Furnizor *</span>
          <select name="provider_id" required defaultValue={initial?.providerId ?? ""} className={input}>
            <option value="" disabled>
              — alege furnizor —
            </option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
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
      </div>

      <MediaField label="Imagine / thumbnail" name="thumbnail_url" defaultValue={initial?.thumbnailUrl} folder="games" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Text label="RTP (%)" name="rtp" type="number" min="0" max="100" step="0.01" defaultValue={initial?.rtp} placeholder="96.5" />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Volatilitate</span>
          <input name="volatility" list="volatility-opts" defaultValue={initial?.volatility} className={input} placeholder="Mică / Medie / Mare" />
          <datalist id="volatility-opts">
            <option value="Mică" />
            <option value="Medie" />
            <option value="Mare" />
          </datalist>
        </label>
        <Text label="Max win" name="max_win" defaultValue={initial?.maxWin} placeholder="21.100x miza" />
        <Text label="Anul lansării" name="release_year" type="number" min="1990" max="2100" step="1" defaultValue={initial?.releaseYear} />
        <Text label="Role" name="reels" defaultValue={initial?.reels} placeholder="6 role" />
        <Text label="Linii / mod" name="paylines" defaultValue={initial?.paylines} placeholder="Scatter Pays" />
        <Text label="Interval pariu" name="bet_range" defaultValue={initial?.betRange} placeholder="0,20 – 100 RON" />
      </div>

      <Area label="Intro" name="intro" defaultValue={initial?.intro} />
      <Area label="Mecanici" name="mechanics" defaultValue={initial?.mechanics} />
      <Area label="Funcții bonus (una pe linie)" name="bonus_features" defaultValue={initial?.bonusFeatures.join("\n")} />
      <Area
        label="FAQ (o linie: Întrebare | Răspuns)"
        name="faq"
        defaultValue={initial?.faq.map((f) => `${f.question} | ${f.answer}`).join("\n")}
      />

      <CheckGroup
        legend="Cazinouri unde jocul este disponibil"
        name="casinoIds"
        options={casinos}
        selected={initial?.casinoIds ?? []}
      />

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
          {pending ? "Se salvează…" : mode === "edit" ? "Salvează modificările" : "Creează jocul"}
        </button>
        <a href="/admin/jocuri" className="text-sm text-ink-secondary hover:text-ink">
          Anulează
        </a>
      </div>
    </form>
  );
}
