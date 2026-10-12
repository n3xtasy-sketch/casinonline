"use client";

import { Download } from "lucide-react";
import { toCsv } from "@/lib/bulk";

interface Column {
  key: string;
  label: string;
}

interface Props<T extends object> {
  rows: readonly T[];
  columns: Column[];
  filename: string;
}

/** Client-side CSV export of the already-rendered (filtered) rows. Read-only. */
export function ExportCsvButton<T extends object>({ rows, columns, filename }: Props<T>) {
  function onExport() {
    const headers = columns.map((c) => c.label);
    const data = rows.map((r) =>
      columns.map((c) => {
        const v = (r as Record<string, unknown>)[c.key];
        if (typeof v === "boolean") return v ? "da" : "nu";
        return v as string | number | null | undefined;
      }),
    );
    const csv = toCsv(headers, data);
    // BOM so Excel reads UTF-8 (diacritics) correctly.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={onExport}
      disabled={rows.length === 0}
      className="inline-flex h-9 items-center gap-2 rounded-sm border border-border px-3 text-sm font-medium text-ink hover:bg-elevated disabled:opacity-50"
    >
      <Download size={15} />
      Export CSV
    </button>
  );
}
