"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import type { AffiliateLinkRow } from "@/lib/db/admin-affiliates";
import { placementLabel } from "@/lib/affiliate-placements";
import type { BulkResult } from "@/lib/bulk";
import { AffiliateActiveButton } from "@/components/admin/AffiliateActiveButton";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { BulkResultBanner } from "@/components/admin/BulkResultBanner";
import {
  bulkActivateAffiliate,
  bulkDeactivateAffiliate,
} from "@/app/admin/(panel)/affiliate-links/bulk-actions";

const CSV_COLUMNS = [
  { key: "casinoName", label: "Cazino" },
  { key: "placementLabel", label: "Placement" },
  { key: "url", label: "URL" },
  { key: "campaign", label: "Campanie" },
  { key: "isActive", label: "Activ" },
];

export function BulkAffiliateTable({ rows }: { rows: AffiliateLinkRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<BulkResult | null>(null);
  const [pending, start] = useTransition();

  const ids = [...selected];
  const allChecked = rows.length > 0 && selected.size === rows.length;
  const csvRows = rows.map((r) => ({ ...r, placementLabel: placementLabel(r.placement) }));

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
        <ExportCsvButton rows={csvRows} columns={CSV_COLUMNS} filename="affiliate-links.csv" />
        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2">
            <span className="text-sm font-medium text-ink">{selected.size} selectate</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => bulkActivateAffiliate(ids))}
              className={cn(btn, "bg-accent/12 text-accent hover:bg-accent/20")}
            >
              Activează
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => bulkDeactivateAffiliate(ids), `Dezactivezi ${ids.length} linkuri? Nu vor mai fi folosite public.`)}
              className={cn(btn, "bg-danger/10 text-danger hover:bg-danger/20")}
            >
              Dezactivează
            </button>
          </div>
        ) : null}
      </div>

      {result ? <BulkResultBanner result={result} onClose={() => setResult(null)} /> : null}

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3">
                <input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Selectează tot" />
              </th>
              <th className="px-4 py-3 font-semibold">Cazino</th>
              <th className="px-4 py-3 font-semibold">Placement</th>
              <th className="px-4 py-3 font-semibold">URL</th>
              <th className="px-4 py-3 font-semibold">Campanie</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(l.id)}
                    onChange={() => toggle(l.id)}
                    aria-label={`Selectează ${l.casinoName}`}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-ink">{l.casinoName}</td>
                <td className="px-4 py-3 text-ink-secondary">{placementLabel(l.placement)}</td>
                <td className="max-w-[220px] truncate px-4 py-3 font-mono text-xs text-ink-muted" title={l.url}>{l.url}</td>
                <td className="px-4 py-3 text-ink-secondary">{l.campaign || "—"}</td>
                <td className="px-4 py-3">
                  <span className={l.isActive ? "inline-flex items-center rounded-full bg-accent/12 px-2 py-0.5 text-xs font-medium text-accent" : "inline-flex items-center rounded-full bg-ink-muted/15 px-2 py-0.5 text-xs font-medium text-ink-muted"}>
                    {l.isActive ? "Activ" : "Inactiv"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <Link href={`/admin/affiliate-links/${l.id}/edit`} className="font-medium text-accent hover:text-link-hover">
                      Editează
                    </Link>
                    <AffiliateActiveButton id={l.id} isActive={l.isActive} label={`${l.casinoName} · ${placementLabel(l.placement)}`} />
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
