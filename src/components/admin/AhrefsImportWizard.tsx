"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dryRunAhrefsAction, applyAhrefsAction } from "@/app/admin/(panel)/seo-research/import-actions";
import type { AhrefsDryRun, ColumnMapping, AhrefsField } from "@/lib/io/ahrefs-import";

const MAX_BYTES = 2 * 1024 * 1024;
const FIELDS: { key: AhrefsField; label: string; required?: boolean }[] = [
  { key: "keyword", label: "Keyword", required: true },
  { key: "volume", label: "Volume" },
  { key: "difficulty", label: "KD" },
  { key: "traffic_potential", label: "Traffic Potential" },
  { key: "intent", label: "Intent" },
  { key: "cpc", label: "CPC" },
  { key: "parent_topic", label: "Parent Topic" },
  { key: "country", label: "Country" },
];
const input = "h-9 rounded-sm border border-border bg-field px-2 text-sm text-ink outline-none focus-visible:border-accent";

export function AhrefsImportWizard({ projectId, defaultCountry }: { projectId: string; defaultCountry: string }) {
  const router = useRouter();
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [countryMode, setCountryMode] = useState<"wizard" | "csv">("wizard");
  const [report, setReport] = useState<AhrefsDryRun | null>(null);
  const [outcome, setOutcome] = useState<{ created: number; updated: number; processed: number; total: number; partial: boolean; message?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() { setReport(null); setOutcome(null); setError(null); setMapping(null); }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    reset(); setCsvText(""); setFileName("");
    if (!f) return;
    if (f.size > MAX_BYTES) { setError("Fișier prea mare (max 2 MB)."); return; }
    setCsvText(await f.text());
    setFileName(f.name);
  }

  function runDryRun() {
    setError(null); setOutcome(null);
    start(async () => {
      const res = await dryRunAhrefsAction(projectId, csvText, mapping, defaultCountry, countryMode);
      if ("error" in res) { setError(res.error); setReport(null); }
      else { setReport(res); setMapping(res.mapping); }
    });
  }

  function runApply() {
    if (!report || !mapping) return;
    start(async () => {
      const res = await applyAhrefsAction(projectId, fileName, csvText, mapping, defaultCountry, countryMode, report.hash);
      if (!("status" in res)) { setError(res.error); return; }
      setOutcome({ created: res.created, updated: res.updated, processed: res.processed, total: res.total, partial: res.partial, message: res.error });
      setReport(null);
      router.refresh();
    });
  }

  const stat = (label: string, value: number, tone = "text-ink") => (
    <span className="rounded-sm border border-border bg-surface px-3 py-1.5 text-sm text-ink-secondary">
      {label}: <strong className={tone}>{value}</strong>
    </span>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink-secondary">Fișier CSV Ahrefs (max 2 MB / 5000 rânduri)</span>
          <input type="file" accept=".csv,text/csv" onChange={onFile} className="text-sm text-ink-secondary" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink-secondary">Țară</span>
          <select value={countryMode} onChange={(e) => { setCountryMode(e.target.value as "wizard" | "csv"); setReport(null); }} className={input}>
            <option value="wizard">Folosește {defaultCountry.toUpperCase()} (din wizard)</option>
            <option value="csv">Folosește țara din fișier (dacă există)</option>
          </select>
        </label>
        <button type="button" disabled={pending || !csvText} onClick={runDryRun} className="h-9 rounded-sm border border-border px-4 text-sm font-medium text-ink hover:bg-elevated disabled:opacity-50">
          {pending ? "Se verifică…" : "Verifică (dry-run)"}
        </button>
      </div>
      {fileName ? <p className="text-xs text-ink-muted">Fișier: {fileName}</p> : null}
      <p className="text-xs text-ink-muted">
        Regulă țară: {countryMode === "wizard" ? `toate rândurile → ${defaultCountry.toUpperCase()}` : "coloana Country din fișier; unde lipsește → " + defaultCountry.toUpperCase()}.
      </p>

      {error ? <p role="alert" className="text-sm font-medium text-danger">{error}</p> : null}

      {report ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {stat("Total", report.total)}
            {stat("Valide", report.valid, "text-accent")}
            {stat("Invalide", report.invalid, report.invalid ? "text-danger" : "text-ink")}
            {stat("Noi", report.toCreate)}
            {stat("Actualizate", report.toUpdate)}
            {stat("Duplicate în fișier", report.dupInFile)}
          </div>

          <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4">
            <p className="text-sm font-semibold text-ink">Mapare coloane (verifică/corectează)</p>
            <p className="text-xs text-ink-muted">Delimitator detectat: {report.delimiter === "\t" ? "TAB" : report.delimiter}. Coloane ignorate: {report.ignoredColumns.join(", ") || "—"}.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <label key={f.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-ink-secondary">{f.label}{f.required ? " *" : ""}</span>
                  <select
                    value={mapping?.[f.key] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...(m as ColumnMapping), [f.key]: e.target.value || null }))}
                    className={`${input} w-48`}
                  >
                    <option value="">— ignoră —</option>
                    {report.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button type="button" disabled={pending} onClick={runDryRun} className="h-9 rounded-sm border border-border px-3 text-sm font-medium text-ink hover:bg-elevated disabled:opacity-50">
                Re-verifică maparea
              </button>
              <button type="button" disabled={pending || report.valid === 0 || !mapping?.keyword} onClick={runApply} className="h-9 rounded-sm bg-accent px-5 text-sm font-semibold text-[#06110a] hover:bg-accent-hover disabled:opacity-50">
                {pending ? "Se importă…" : `Importă (${report.toCreate} noi · ${report.toUpdate} actualizate)`}
              </button>
            </div>
          </div>

          {report.errors.length ? (
            <div className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm">
              <p className="font-medium text-ink">{report.invalid} rânduri invalide (nu se importă). Primele:</p>
              <ul className="mt-1 flex max-h-40 flex-col gap-0.5 overflow-y-auto text-xs text-ink-secondary">
                {report.errors.map((e) => <li key={e.line}>linia {e.line}: {e.messages.join("; ")}</li>)}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {outcome ? (
        outcome.partial ? (
          <div className="rounded-md border border-gold/40 bg-gold/5 p-4 text-sm text-ink">
            <p className="font-medium">Import parțial: {outcome.processed} din {outcome.total} rânduri salvate.</p>
            <p className="mt-1 text-ink-secondary">{outcome.message}</p>
          </div>
        ) : (
          <div className="rounded-md border border-accent/40 bg-accent/5 p-4 text-sm text-ink">
            Import complet: <strong>{outcome.created}</strong> keyworduri noi · <strong>{outcome.updated}</strong> actualizate ({outcome.processed} din {outcome.total}).
          </div>
        )
      ) : null}
    </div>
  );
}
