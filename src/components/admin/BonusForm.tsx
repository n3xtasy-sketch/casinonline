"use client";

import { useActionState } from "react";
import type { BonusFormState } from "@/app/admin/(panel)/bonusuri/types";
import type { BonusEditData } from "@/lib/db/admin-bonuses";
import type { Option } from "@/lib/db/admin-casinos";

interface Props {
  mode: "create" | "edit";
  action: (state: BonusFormState, formData: FormData) => Promise<BonusFormState>;
  initial?: BonusEditData | null;
  casinos: Option[];
  bonusTypes: Option[];
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

export function BonusForm({ mode, action, initial, casinos, bonusTypes }: Props) {
  const [state, formAction, pending] = useActionState<BonusFormState, FormData>(action, {
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
          <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="ex. superbet-bonus-bun-venit" className={input} />
        )}
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
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
          <span className="font-medium text-ink-secondary">Tip bonus</span>
          <select name="bonus_type_id" defaultValue={initial?.bonusTypeId ?? ""} className={input}>
            <option value="">— niciunul —</option>
            {bonusTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Text label="Ofertă *" name="offer" defaultValue={initial?.offer} required placeholder="100% până la 1.000 RON" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Text label="Free spins" name="free_spins" type="number" min="0" step="1" defaultValue={initial?.freeSpins} />
        <Text label="Wagering" name="wagering" defaultValue={initial?.wagering} placeholder="x35" />
        <Text label="Depunere minimă" name="min_deposit" defaultValue={initial?.minDeposit} />
        <Text label="Valabilitate" name="validity" defaultValue={initial?.validity} placeholder="30 zile" />
        <Text label="Cod promo" name="code" defaultValue={initial?.code} />
      </div>

      <Area label="Intro" name="intro" defaultValue={initial?.intro} />
      <Area label="Termeni (unul pe linie)" name="terms" defaultValue={initial?.terms.join("\n")} />
      <Area label="Pro-uri (unul pe linie)" name="pros" defaultValue={initial?.pros.join("\n")} />
      <Area label="Contra (unul pe linie)" name="cons" defaultValue={initial?.cons.join("\n")} />
      <Area label="Cum revendici (un pas pe linie)" name="how_to_claim" defaultValue={initial?.howToClaim.join("\n")} />
      <Area
        label="FAQ (o linie: Întrebare | Răspuns)"
        name="faq"
        defaultValue={initial?.faq.map((f) => `${f.question} | ${f.answer}`).join("\n")}
      />

      <p className="text-xs text-ink-muted">
        Link-ul de revendicare se derivă automat din cazino: <code>/go/&lt;casino-slug&gt;</code>.
      </p>

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
          {pending ? "Se salvează…" : mode === "edit" ? "Salvează modificările" : "Creează bonusul"}
        </button>
        <a href="/admin/bonusuri" className="text-sm text-ink-secondary hover:text-ink">
          Anulează
        </a>
      </div>
    </form>
  );
}
