"use client";

import { useActionState, useState } from "react";
import type { BonusFormState } from "@/app/admin/(panel)/bonusuri/types";
import type { BonusEditData, RewardStage } from "@/lib/db/admin-bonuses";
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
  label, name, defaultValue, type = "text", ...rest
}: { label: string; name: string; defaultValue?: string; type?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-md border border-border p-4">
      <legend className="px-1 text-sm font-semibold text-ink">{title}</legend>
      {children}
    </fieldset>
  );
}

/* ── Reward stages visual editor ──────────────────────────────────────────── */
type StageRow = {
  label: string; amount: string; free_spins: string; spin_value: string;
  wagering_multiplier: string; wagering_basis: string; trigger: string; within: string; note: string;
};
const EMPTY_ROW: StageRow = {
  label: "", amount: "", free_spins: "", spin_value: "", wagering_multiplier: "", wagering_basis: "", trigger: "", within: "", note: "",
};
function toRow(s: RewardStage): StageRow {
  return {
    label: s.label ?? "",
    amount: s.amount ?? "",
    free_spins: s.free_spins != null ? String(s.free_spins) : "",
    spin_value: s.spin_value != null ? String(s.spin_value) : "",
    wagering_multiplier: s.wagering_multiplier != null ? String(s.wagering_multiplier) : "",
    wagering_basis: s.wagering_basis ?? "",
    trigger: s.trigger ?? "",
    within: s.within ?? "",
    note: s.note ?? "",
  };
}
/** Serialize rows → JSON for the hidden input. Drops empty rows; omits empty keys; numbers parsed.
 *  No rows → "" (server maps empty → NULL; NULL ≠ []). */
function serialize(rows: StageRow[]): string {
  const num = (v: string) => { const n = Number(v); return v.trim() !== "" && Number.isFinite(n) ? n : undefined; };
  const out = rows
    .map((r) => {
      const o: Record<string, unknown> = {};
      if (r.label.trim()) o.label = r.label.trim();
      if (r.amount.trim()) o.amount = r.amount.trim();
      if (num(r.free_spins) !== undefined) o.free_spins = num(r.free_spins);
      if (num(r.spin_value) !== undefined) o.spin_value = num(r.spin_value);
      if (num(r.wagering_multiplier) !== undefined) o.wagering_multiplier = num(r.wagering_multiplier);
      if (r.wagering_basis.trim()) o.wagering_basis = r.wagering_basis.trim();
      if (r.trigger.trim()) o.trigger = r.trigger.trim();
      if (r.within.trim()) o.within = r.within.trim();
      if (r.note.trim()) o.note = r.note.trim();
      return o;
    })
    .filter((o) => Object.keys(o).length > 0);
  return out.length ? JSON.stringify(out) : "";
}

function RewardStagesEditor({ initial }: { initial: RewardStage[] }) {
  const [rows, setRows] = useState<StageRow[]>(initial.map(toRow));
  const set = (i: number, key: keyof StageRow, v: string) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)));
  const cell = "h-9 rounded-sm border border-border bg-field px-2 text-sm text-ink outline-none focus-visible:border-accent";

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="reward_stages" value={serialize(rows)} />
      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">Nicio tranșă (NULL). Adaugă o tranșă pentru oferte în mai multe etape.</p>
      ) : null}
      {rows.map((r, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-sm border border-border/60 bg-surface p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-secondary">Tranșa {i + 1}</span>
            <button type="button" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}
              className="text-xs text-danger hover:underline">Elimină</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <input aria-label="Etichetă" placeholder="Etichetă * (ex. Prima depunere)" value={r.label} onChange={(e) => set(i, "label", e.target.value)} className={`${cell} sm:col-span-3`} />
            <input aria-label="Valoare" placeholder="Valoare (text)" value={r.amount} onChange={(e) => set(i, "amount", e.target.value)} className={cell} />
            <input aria-label="Free spins" type="number" min="0" step="1" placeholder="Free spins" value={r.free_spins} onChange={(e) => set(i, "free_spins", e.target.value)} className={cell} />
            <input aria-label="Valoare rotire (RON)" type="number" min="0" step="any" placeholder="Val. rotire (RON)" value={r.spin_value} onChange={(e) => set(i, "spin_value", e.target.value)} className={cell} />
            <input aria-label="Multiplicator rulaj" type="number" min="0" step="any" placeholder="Rulaj ×" value={r.wagering_multiplier} onChange={(e) => set(i, "wagering_multiplier", e.target.value)} className={cell} />
            <input aria-label="Bază rulaj" placeholder="Bază rulaj" value={r.wagering_basis} onChange={(e) => set(i, "wagering_basis", e.target.value)} className={cell} />
            <input aria-label="Declanșator" placeholder="Declanșator (deposit/kyc/…)" value={r.trigger} onChange={(e) => set(i, "trigger", e.target.value)} className={cell} />
            <input aria-label="Fereastră" placeholder="Fereastră (ex. 7 zile)" value={r.within} onChange={(e) => set(i, "within", e.target.value)} className={cell} />
            <input aria-label="Notă" placeholder="Notă" value={r.note} onChange={(e) => set(i, "note", e.target.value)} className={`${cell} sm:col-span-3`} />
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setRows((rs) => [...rs, { ...EMPTY_ROW }])}
        className="h-9 w-fit rounded-sm border border-border px-3 text-sm font-medium text-ink hover:bg-elevated">
        + Adaugă tranșă
      </button>
    </div>
  );
}

export function BonusForm({ mode, action, initial, casinos, bonusTypes }: Props) {
  const [state, formAction, pending] = useActionState<BonusFormState, FormData>(action, { error: null });

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-5">
      {/* Slug (identificator) */}
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-ink-secondary">Slug {mode === "edit" ? "(nu se poate schimba)" : "*"}</span>
        {mode === "edit" ? (
          <input readOnly defaultValue={initial?.slug} className={`${input} cursor-not-allowed text-ink-muted`} />
        ) : (
          <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="ex. superbet-bonus-bun-venit" className={input} />
        )}
      </label>

      {/* A. Informații generale */}
      <Section title="A. Informații generale">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink-secondary">Cazino *</span>
            <select name="casino_id" required defaultValue={initial?.casinoId ?? ""} className={input}>
              <option value="" disabled>— alege cazino —</option>
              {casinos.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink-secondary">Tip bonus</span>
            <select name="bonus_type_id" defaultValue={initial?.bonusTypeId ?? ""} className={input}>
              <option value="">— niciunul —</option>
              {bonusTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
        </div>
        <Text label="Ofertă *" name="offer" defaultValue={initial?.offer} required placeholder="100% până la 1.000 RON" />
        <Text label="Cod promo" name="code" defaultValue={initial?.code} />
        <Area label="Intro" name="intro" defaultValue={initial?.intro} />
      </Section>

      {/* B. Valoarea bonusului */}
      <Section title="B. Valoarea bonusului">
        <Text label="Sumă (text)" name="amount" defaultValue={initial?.amount} placeholder="100% până la 500 RON" />
        <div className="grid gap-5 sm:grid-cols-3">
          <Text label="Free spins" name="free_spins" type="number" min="0" step="1" defaultValue={initial?.freeSpins} />
          <Text label="Valoare rotire (RON)" name="spin_value" type="number" min="0" step="any" defaultValue={initial?.spinValue} />
          <Text label="Câștig maxim (RON)" name="max_win" type="number" min="0" step="any" defaultValue={initial?.maxWin} />
        </div>
        <Area label="Sloturi eligibile (unul pe linie) — gol = necompletat" name="eligible_slots" defaultValue={initial?.eligibleSlots.join("\n")} />
      </Section>

      {/* C. Condiții și rulaj */}
      <Section title="C. Condiții și rulaj">
        <div className="grid gap-5 sm:grid-cols-2">
          <Text label="Rulaj (text editorial)" name="wagering" defaultValue={initial?.wagering} placeholder="x35" />
          <Text label="Multiplicator rulaj (0 = fără, gol = necunoscut)" name="wagering_multiplier" type="number" min="0" step="any" defaultValue={initial?.wageringMultiplier} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink-secondary">Bază rulaj</span>
            <input name="wagering_basis" list="wagering-basis-options" defaultValue={initial?.wageringBasis} className={input} placeholder="bonus / deposit / …" />
            <datalist id="wagering-basis-options">
              <option value="bonus" /><option value="deposit" /><option value="bonus_deposit" /><option value="winnings" />
            </datalist>
          </label>
          <Text label="Depunere minimă" name="min_deposit" defaultValue={initial?.minDeposit} />
          <Text label="Valabilitate (text editorial)" name="validity" defaultValue={initial?.validity} placeholder="30 zile" />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink-secondary">KYC obligatoriu</span>
            <select name="kyc_required" defaultValue={initial?.kycRequired ?? ""} className={input}>
              <option value="">Necunoscut</option>
              <option value="true">Da</option>
              <option value="false">Nu</option>
            </select>
          </label>
        </div>
      </Section>

      {/* D. Tranșe și activare */}
      <Section title="D. Tranșe și activare (reward_stages)">
        <RewardStagesEditor initial={initial?.rewardStages ?? []} />
      </Section>

      {/* E. Verificare și termeni */}
      <Section title="E. Verificare și termeni">
        <div className="grid gap-5 sm:grid-cols-2">
          <Text label="URL termeni (T&C)" name="terms_url" type="url" defaultValue={initial?.termsUrl} placeholder="https://…" />
          <Text label="Verificat la" name="verified_at" type="date" defaultValue={initial?.verifiedAt} />
          <Text label="Expiră la" name="expires_at" type="date" defaultValue={initial?.expiresAt} />
        </div>
        <Area label="Termeni (unul pe linie)" name="terms" defaultValue={initial?.terms.join("\n")} />
        <Area label="Cum revendici (un pas pe linie)" name="how_to_claim" defaultValue={initial?.howToClaim.join("\n")} />
      </Section>

      {/* F. Conținut editorial (SEO centralizat — gestionat separat în /admin/seo) */}
      <Section title="F. Conținut editorial">
        <Area label="Pro-uri (unul pe linie)" name="pros" defaultValue={initial?.pros.join("\n")} />
        <Area label="Contra (unul pe linie)" name="cons" defaultValue={initial?.cons.join("\n")} />
        <Area label="FAQ (o linie: Întrebare | Răspuns)" name="faq" defaultValue={initial?.faq.map((f) => `${f.question} | ${f.answer}`).join("\n")} />
      </Section>

      <p className="text-xs text-ink-muted">
        Link-ul de revendicare se derivă automat din cazino: <code>/go/&lt;casino-slug&gt;</code>. SEO (meta/OG) se gestionează centralizat în <code>/admin/seo</code>.
      </p>

      {state.error ? <p role="alert" className="text-sm font-medium text-danger">{state.error}</p> : null}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending}
          className="h-10 rounded-sm bg-accent px-5 text-sm font-semibold text-[#06110a] transition-colors hover:bg-accent-hover disabled:opacity-50">
          {pending ? "Se salvează…" : mode === "edit" ? "Salvează modificările" : "Creează bonusul"}
        </button>
        <a href="/admin/bonusuri" className="text-sm text-ink-secondary hover:text-ink">Anulează</a>
      </div>
    </form>
  );
}
