"use client";

import { useActionState } from "react";
import type { CasinoFormState } from "@/app/admin/(panel)/cazinouri/types";
import type { CasinoEditData, Option } from "@/lib/db/admin-casinos";

interface Props {
  mode: "create" | "edit";
  action: (state: CasinoFormState, formData: FormData) => Promise<CasinoFormState>;
  initial?: CasinoEditData | null;
  tags: Option[];
  paymentMethods: Option[];
  games: Option[];
}

const input =
  "h-10 rounded-sm border border-border bg-field px-3 text-sm text-ink outline-none focus-visible:border-accent";
const area =
  "min-h-24 rounded-sm border border-border bg-field px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent";

function Field({
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

export function CasinoForm({ mode, action, initial, tags, paymentMethods, games }: Props) {
  const [state, formAction, pending] = useActionState<CasinoFormState, FormData>(action, {
    error: null,
  });

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-5">
      {/* Slug */}
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">
          Slug {mode === "edit" ? "(nu se poate schimba)" : "*"}
        </span>
        {mode === "edit" ? (
          <input
            readOnly
            defaultValue={initial?.slug}
            className={`${input} cursor-not-allowed text-ink-muted`}
          />
        ) : (
          <input
            name="slug"
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="ex. betano-casino"
            className={input}
          />
        )}
      </label>

      <Field label="Nume *" name="name" defaultValue={initial?.name} required />
      <Field label="Logo URL" name="logo_url" type="url" defaultValue={initial?.logoUrl} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Rating (0–5)" name="rating" type="number" min="0" max="5" step="0.1" defaultValue={initial?.rating} />
        <Field label="Scor editorial (0–10)" name="editor_score" type="number" min="0" max="10" step="0.1" defaultValue={initial?.editorScore} />
        <Field label="Licență" name="license" defaultValue={initial?.license} />
        <Field label="Viteză retrageri" name="payout_speed" defaultValue={initial?.payoutSpeed} />
        <Field label="Timp retragere" name="withdrawal_time" defaultValue={initial?.withdrawalTime} />
        <Field label="Verificat la" name="verified_at" type="date" defaultValue={initial?.verifiedAt} />
        <Field label="Depunere minimă" name="min_deposit" defaultValue={initial?.minDeposit} />
        <Field label="KYC" name="kyc" defaultValue={initial?.kyc} />
        <Field label="Suport" name="support" defaultValue={initial?.support} />
        <Field label="Mobil" name="mobile" defaultValue={initial?.mobile} />
      </div>

      <Field label="URL operator (afiliat)" name="affiliateUrl" type="url" defaultValue={initial?.affiliateUrl} />
      <p className="-mt-3 text-xs text-ink-muted">
        Link-ul public rămâne <code>/go/{mode === "edit" ? initial?.slug : "&lt;slug&gt;"}</code> →
        redirect 302 către acest URL.
      </p>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Intro</span>
        <textarea name="intro" defaultValue={initial?.intro} className={area} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Recenzie editor</span>
        <textarea name="editor_review" defaultValue={initial?.editorReview} className={area} />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Pro-uri (unul pe linie)</span>
        <textarea name="pros" defaultValue={initial?.pros.join("\n")} className={area} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Contra (unul pe linie)</span>
        <textarea name="cons" defaultValue={initial?.cons.join("\n")} className={area} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">FAQ (o linie: Întrebare | Răspuns)</span>
        <textarea
          name="faq"
          defaultValue={initial?.faq.map((f) => `${f.question} | ${f.answer}`).join("\n")}
          className={area}
        />
      </label>

      <CheckGroup legend="Tag-uri" name="tagIds" options={tags} selected={initial?.tagIds ?? []} />
      <CheckGroup legend="Metode de plată" name="paymentMethodIds" options={paymentMethods} selected={initial?.paymentMethodIds ?? []} />
      <CheckGroup legend="Jocuri" name="gameIds" options={games} selected={initial?.gameIds ?? []} />

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
          {pending ? "Se salvează…" : mode === "edit" ? "Salvează modificările" : "Creează cazinoul"}
        </button>
        <a href="/admin/cazinouri" className="text-sm text-ink-secondary hover:text-ink">
          Anulează
        </a>
      </div>
    </form>
  );
}
