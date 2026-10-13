"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { IO_IMPORT_ENTITIES } from "@/lib/io/entities";
import { dryRunAction, runImportAction } from "@/app/admin/(panel)/import/actions";
import type { ImportReport, ImportOutcome } from "@/lib/db/io";
import type { RowLevel } from "@/lib/io/validate";

const MAX_BYTES = 2 * 1024 * 1024;
const LEVEL_DOT: Record<RowLevel, string> = { valid: "bg-accent", warning: "bg-gold", error: "bg-danger" };

export function ImportWizard() {
  const router = useRouter();
  const [entity, setEntity] = useState<string>(IO_IMPORT_ENTITIES[0]);
  const [csvText, setCsvText] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [report, setReport] = useState<ImportReport | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setReport(null);
    setOutcome(null);
    setError(null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    reset();
    setCsvText("");
    setFileName("");
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setError("Fișier prea mare (max 2 MB).");
      return;
    }
    setCsvText(await f.text());
    setFileName(f.name);
  }

  function dryRun() {
    reset();
    start(async () => {
      const res = await dryRunAction(entity, csvText);
      if ("error" in res) setError(res.error);
      else setReport(res);
    });
  }

  function confirmImport() {
    if (!report) return;
    start(async () => {
      const res = await runImportAction(entity, csvText, report.hash);
      if ("error" in res) setError(res.error);
      else {
        setOutcome(res);
        setReport(null);
        router.refresh();
      }
    });
  }

  const importable = report && report.total - report.errors > 0;

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink-secondary">Entitate</span>
          <select
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value);
              reset();
            }}
            className="h-10 rounded-sm border border-border bg-field px-3 text-sm text-ink"
          >
            {IO_IMPORT_ENTITIES.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-ink-secondary">Fișier CSV (max 1000 rânduri / 2 MB)</span>
          <input type="file" accept=".csv,text/csv" onChange={onFile} className="text-sm text-ink-secondary" />
        </label>
        <button
          type="button"
          disabled={pending || !csvText}
          onClick={dryRun}
          className="h-10 rounded-sm border border-border px-4 text-sm font-medium text-ink hover:bg-elevated disabled:opacity-50"
        >
          {pending ? "Se verifică…" : "Verifică (dry-run)"}
        </button>
      </div>
      {fileName ? <p className="text-xs text-ink-muted">Fișier: {fileName}</p> : null}

      {error ? <p role="alert" className="text-sm font-medium text-danger">{error}</p> : null}

      {report ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold text-ink">{report.total} rânduri</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" />{report.valid} valide</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gold" />{report.warning} warning</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger" />{report.errors} erori</span>
          </div>
          <div className="max-h-80 overflow-y-auto rounded-md border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2">Linie</th>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Nivel</th>
                  <th className="px-3 py-2">Mesaje</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.line} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2 tabular-nums text-ink-muted">{r.line}</td>
                    <td className="px-3 py-2 font-mono text-xs text-ink">{r.slug || "—"}</td>
                    <td className="px-3 py-2"><span className={cn("inline-block h-2.5 w-2.5 rounded-full", LEVEL_DOT[r.level])} /></td>
                    <td className="px-3 py-2 text-ink-secondary">{r.messages.join("; ") || "ok"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={pending || !importable}
              onClick={confirmImport}
              className="h-10 rounded-sm bg-accent px-5 text-sm font-semibold text-[#06110a] hover:bg-accent-hover disabled:opacity-50"
            >
              {pending ? "Se importă…" : `Confirmă import (${report.total - report.errors} rânduri, ca draft)`}
            </button>
            <span className="text-xs text-ink-muted">Erorile nu se importă. Totul intră ca draft.</span>
          </div>
        </div>
      ) : null}

      {outcome ? (
        <div className="rounded-md border border-accent/40 bg-accent/5 p-4 text-sm">
          <p className="font-medium text-ink">
            Import terminat: {outcome.created} create · {outcome.skipped} sărite · {outcome.failed} eșuate
          </p>
          <ul className="mt-2 flex max-h-60 flex-col gap-1 overflow-y-auto text-xs text-ink-secondary">
            {outcome.rows.map((r) => (
              <li key={r.line}>linia {r.line} · {r.slug || "—"} → {r.outcome}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
