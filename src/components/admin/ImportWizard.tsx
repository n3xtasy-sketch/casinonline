"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { IO_IMPORT_ENTITIES } from "@/lib/io/entities";
import { dryRunAction, runImportAction } from "@/app/admin/(panel)/import/actions";
import type { ImportReport, ImportOutcome, ReportRow } from "@/lib/db/io";
import type { ImportMode, RowLevel } from "@/lib/io/validate";

const MAX_BYTES = 2 * 1024 * 1024;
const LEVEL_DOT: Record<RowLevel, string> = { valid: "bg-accent", warning: "bg-gold", error: "bg-danger" };

type Category = "create" | "update" | "unchanged" | "error";

const CAT_BADGE: Record<Category, { label: string; cls: string }> = {
  create: { label: "NOU", cls: "bg-accent/15 text-accent" },
  update: { label: "ACTUALIZAT", cls: "bg-gold/15 text-gold" },
  unchanged: { label: "NESCHIMBAT", cls: "bg-elevated text-ink-muted" },
  error: { label: "EROARE", cls: "bg-danger/15 text-danger" },
};

function categoryOf(r: ReportRow): Category {
  if (r.level === "error") return "error";
  if (r.operation === "create") return "create";
  if (r.operation === "update") return r.diff?.hasChanges ? "update" : "unchanged";
  return "error";
}

function RowDiffView({ r }: { r: ReportRow }) {
  const d = r.diff;
  if (!d || !d.hasChanges) return <span className="text-ink-muted">—</span>;
  return (
    <div className="flex flex-col gap-1">
      {d.fields.map((f) => (
        <div key={f.col} className="flex flex-wrap items-baseline gap-1.5 text-xs">
          <span className="font-mono text-ink-secondary">{f.col}</span>
          {f.cleared ? (
            <span className="rounded-sm bg-danger/15 px-1.5 py-0.5 font-medium text-danger">golit (__CLEAR__)</span>
          ) : (
            <>
              <span className="text-ink-muted line-through">{f.before || "∅"}</span>
              <span className="text-ink-muted">→</span>
              <span className="font-medium text-ink">{f.after || "∅"}</span>
            </>
          )}
          {f.sensitive ? <span className="text-ink-muted">· mascat</span> : null}
        </div>
      ))}
      {d.relations.map((rel) => (
        <div key={rel.col} className="flex flex-wrap items-baseline gap-1.5 text-xs">
          <span className="font-mono text-ink-secondary">{rel.col}</span>
          {rel.added.length ? <span className="text-accent">+ {rel.added.join(", ")}</span> : null}
          {rel.removed.length ? <span className="text-danger line-through">− {rel.removed.join(", ")}</span> : null}
        </div>
      ))}
    </div>
  );
}

export function ImportWizard() {
  const router = useRouter();
  const [entity, setEntity] = useState<string>(IO_IMPORT_ENTITIES[0]);
  const [mode, setMode] = useState<ImportMode>("create");
  const [csvText, setCsvText] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [report, setReport] = useState<ImportReport | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  const [confirmPublished, setConfirmPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setReport(null);
    setOutcome(null);
    setError(null);
    setConfirmPublished(false);
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
      const res = await dryRunAction(entity, csvText, mode);
      if ("error" in res) setError(res.error);
      else setReport(res);
    });
  }

  function confirmImport() {
    if (!report) return;
    start(async () => {
      const res = await runImportAction(entity, csvText, report.hash, mode, confirmPublished);
      if ("error" in res) setError(res.error);
      else {
        setOutcome(res);
        setReport(null);
        router.refresh();
      }
    });
  }

  const applicable = report ? report.total - report.errors : 0;
  const needsPublishConfirm = (report?.publishedChanges ?? 0) > 0;
  const canApply = !!report && applicable > 0 && (!needsPublishConfirm || confirmPublished);

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
          <span className="font-medium text-ink-secondary">Mod</span>
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as ImportMode);
              reset();
            }}
            className="h-10 rounded-sm border border-border bg-field px-3 text-sm text-ink"
          >
            <option value="create">CREATE (doar înregistrări noi)</option>
            <option value="upsert">UPSERT (creează + actualizează)</option>
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
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" />{report.toCreate} de creat</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gold" />{report.toUpdate} de actualizat</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink-muted" />{report.toUnchanged} neschimbate</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger" />{report.errors} erori</span>
          </div>
          <div className="max-h-96 overflow-y-auto rounded-md border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2">Linie</th>
                  <th className="px-3 py-2">Slug</th>
                  <th className="px-3 py-2">Acțiune</th>
                  <th className="px-3 py-2">Modificări / Mesaje</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((r) => {
                  const cat = categoryOf(r);
                  const badge = CAT_BADGE[cat];
                  return (
                    <tr key={r.line} className="border-b border-border/60 align-top last:border-0">
                      <td className="px-3 py-2 tabular-nums text-ink-muted">{r.line}</td>
                      <td className="px-3 py-2 font-mono text-xs text-ink">{r.slug || "—"}</td>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2">
                          <span className={cn("inline-block h-2.5 w-2.5 rounded-full", LEVEL_DOT[r.level])} />
                          <span className={cn("rounded-sm px-1.5 py-0.5 text-[10px] font-semibold tracking-wide", badge.cls)}>
                            {badge.label}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-ink-secondary">
                        {cat === "update" ? (
                          <RowDiffView r={r} />
                        ) : (
                          <span>{r.messages.join("; ") || (cat === "unchanged" ? "fără modificări" : "ok")}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {needsPublishConfirm ? (
            <label className="flex items-start gap-2 rounded-md border border-gold/40 bg-gold/5 p-3 text-sm">
              <input
                type="checkbox"
                checked={confirmPublished}
                onChange={(e) => setConfirmPublished(e.target.checked)}
                className="mt-0.5"
              />
              <span className="text-ink-secondary">
                <strong className="text-ink">{report.publishedChanges}</strong> înregistrare(i) <strong>publicată(e)</strong>{" "}
                ar fi modificate (conținut). Confirmă explicit modificarea conținutului publicat. Statusul nu se schimbă prin import.
              </span>
            </label>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={pending || !canApply}
              onClick={confirmImport}
              className="h-10 rounded-sm bg-accent px-5 text-sm font-semibold text-[#06110a] hover:bg-accent-hover disabled:opacity-50"
            >
              {pending
                ? "Se aplică…"
                : `Aplică (${report.toCreate} noi · ${report.toUpdate} actualizate)`}
            </button>
            <span className="text-xs text-ink-muted">
              Erorile nu se aplică. Celulele goale păstrează valorile. Noile înregistrări intră ca draft.
            </span>
          </div>
        </div>
      ) : null}

      {outcome ? (
        <div className="rounded-md border border-accent/40 bg-accent/5 p-4 text-sm">
          <p className="font-medium text-ink">
            Import terminat: {outcome.created} create · {outcome.updated} actualizate · {outcome.unchanged} neschimbate ·{" "}
            {outcome.skipped} sărite · {outcome.failed} eșuate
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
