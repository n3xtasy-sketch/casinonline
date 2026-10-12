"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AdminCasinoRow, Option } from "@/lib/db/admin-casinos";
import type { BulkResult } from "@/lib/bulk";
import { ContentStatusControl, StatusBadge } from "@/components/admin/ContentStatusControl";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { BulkResultBanner } from "@/components/admin/BulkResultBanner";
import { setCasinoStatus } from "@/app/admin/(panel)/cazinouri/actions";
import {
  bulkArchiveCasinos,
  bulkActivateCasinos,
  bulkAddTag,
  bulkRemoveTag,
} from "@/app/admin/(panel)/cazinouri/bulk-actions";

const CSV_COLUMNS = [
  { key: "name", label: "Nume" },
  { key: "status", label: "Status" },
  { key: "rating", label: "Rating" },
  { key: "license", label: "Licență" },
  { key: "slug", label: "Slug" },
];

export function BulkCasinoTable({ rows, tags }: { rows: AdminCasinoRow[]; tags: Option[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagId, setTagId] = useState("");
  const [result, setResult] = useState<BulkResult | null>(null);
  const [pending, start] = useTransition();

  const ids = [...selected];
  const allChecked = rows.length > 0 && selected.size === rows.length;

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));
  }
  function run(fn: () => Promise<BulkResult>, confirmMsg?: string) {
    if (!ids.length) return;
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    start(async () => {
      const res = await fn();
      setResult(res);
      setSelected(new Set());
      router.refresh();
    });
  }

  const btn = "h-9 rounded-sm px-3 text-sm font-medium disabled:opacity-50";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <ExportCsvButton rows={rows} columns={CSV_COLUMNS} filename="cazinouri.csv" />
        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2">
            <span className="text-sm font-medium text-ink">{selected.size} selectate</span>
            <button type="button" disabled={pending} onClick={() => run(() => bulkActivateCasinos(ids))} className={cn(btn, "bg-accent/12 text-accent hover:bg-accent/20")}>
              Publică
            </button>
            <button type="button" disabled={pending} onClick={() => run(() => bulkArchiveCasinos(ids), `Arhivezi ${ids.length} cazinouri? Nu vor mai fi vizibile public.`)} className={cn(btn, "bg-danger/10 text-danger hover:bg-danger/20")}>
              Arhivează
            </button>
            <select value={tagId} onChange={(e) => setTagId(e.target.value)} className="h-9 rounded-sm border border-border bg-field px-2 text-sm text-ink">
              <option value="">— tag —</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <button type="button" disabled={pending || !tagId} onClick={() => run(() => bulkAddTag(ids, tagId))} className={cn(btn, "border border-border text-ink hover:bg-elevated")}>
              Adaugă tag
            </button>
            <button type="button" disabled={pending || !tagId} onClick={() => run(() => bulkRemoveTag(ids, tagId))} className={cn(btn, "border border-border text-ink hover:bg-elevated")}>
              Elimină tag
            </button>
          </div>
        ) : null}
      </div>

      {result ? <BulkResultBanner result={result} onClose={() => setResult(null)} /> : null}

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3"><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Selectează tot" /></th>
              <th className="px-4 py-3 font-semibold">Nume</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Rating</th>
              <th className="px-4 py-3 font-semibold">Licență</th>
              <th className="px-4 py-3 font-semibold">Slug</th>
              <th className="px-4 py-3 font-semibold">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} aria-label={`Selectează ${c.name}`} /></td>
                <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 tabular-nums text-ink-secondary">{c.rating ? c.rating.toFixed(1) : "—"}</td>
                <td className="px-4 py-3 text-ink-secondary">{c.license ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{c.slug}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <Link href={`/admin/cazinouri/${c.slug}/edit`} className="font-medium text-accent hover:text-link-hover">Editează</Link>
                    <ContentStatusControl id={c.id} status={c.status} action={setCasinoStatus} />
                    {c.status === "published" ? (
                      <Link href={c.reviewUrl} target="_blank" className="inline-flex items-center gap-1 text-ink-muted hover:text-ink" title={`Vezi ${c.name}`}>
                        <ExternalLink size={14} />
                        <span className="sr-only">Vezi pagina publică {c.name}</span>
                      </Link>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
