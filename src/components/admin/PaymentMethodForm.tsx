"use client";

import { useActionState } from "react";
import type { PaymentFormState } from "@/app/admin/(panel)/metode-de-plata/types";
import type { PaymentMethodEditData } from "@/lib/db/admin-payments";
import type { Option } from "@/lib/db/admin-casinos";

interface Props {
  mode: "create" | "edit";
  action: (state: PaymentFormState, formData: FormData) => Promise<PaymentFormState>;
  initial?: PaymentMethodEditData | null;
  paymentTypes: Option[];
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

export function PaymentMethodForm({ mode, action, initial, paymentTypes, casinos }: Props) {
  const [state, formAction, pending] = useActionState<PaymentFormState, FormData>(action, {
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
          <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="ex. apple-pay" className={input} />
        )}
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <Text label="Nume metodă *" name="name" defaultValue={initial?.name} required />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink-secondary">Tip metodă *</span>
          <select name="payment_type_id" required defaultValue={initial?.paymentTypeId ?? ""} className={input}>
            <option value="" disabled>
              — alege tip —
            </option>
            {paymentTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Text label="Logo (URL)" name="logo_url" type="url" defaultValue={initial?.logoUrl} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Text label="Viteză depunere" name="deposit_speed" defaultValue={initial?.depositSpeed} placeholder="Instant" />
        <Text label="Viteză retragere" name="withdrawal_speed" defaultValue={initial?.withdrawalSpeed} placeholder="1 – 3 zile" />
        <Text label="Comisioane" name="fees" defaultValue={initial?.fees} placeholder="Fără comisioane" />
        <Text label="Limită minimă" name="min_limit" defaultValue={initial?.minLimit} placeholder="20 RON" />
        <Text label="Limită maximă" name="max_limit" defaultValue={initial?.maxLimit} placeholder="50.000 RON" />
      </div>

      <Area label="Intro" name="intro" defaultValue={initial?.intro} />
      <Area label="Descriere depuneri" name="deposits" defaultValue={initial?.deposits} />
      <Area label="Descriere retrageri" name="withdrawals" defaultValue={initial?.withdrawals} />
      <Area label="Pro-uri (unul pe linie)" name="pros" defaultValue={initial?.pros.join("\n")} />
      <Area label="Contra (unul pe linie)" name="cons" defaultValue={initial?.cons.join("\n")} />
      <Area
        label="FAQ (o linie: Întrebare | Răspuns)"
        name="faq"
        defaultValue={initial?.faq.map((f) => `${f.question} | ${f.answer}`).join("\n")}
      />

      <CheckGroup
        legend="Cazinouri care acceptă metoda"
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
          {pending ? "Se salvează…" : mode === "edit" ? "Salvează modificările" : "Creează metoda"}
        </button>
        <a href="/admin/metode-de-plata" className="text-sm text-ink-secondary hover:text-ink">
          Anulează
        </a>
      </div>
    </form>
  );
}
