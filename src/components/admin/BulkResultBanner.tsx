"use client";

import type { BulkResult } from "@/lib/bulk";

/** Success/failure summary shown after a bulk run. */
export function BulkResultBanner({ result, onClose }: { result: BulkResult; onClose: () => void }) {
  const hasFailed = result.failed.length > 0;
  return (
    <div
      role="status"
      className={`rounded-md border p-3 text-sm ${
        hasFailed ? "border-gold/40 bg-gold/5" : "border-accent/40 bg-accent/5"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-ink">
          {result.ok} reușite · {result.failed.length} eșuate
        </span>
        <button type="button" onClick={onClose} className="text-xs text-ink-muted hover:text-ink">
          Închide
        </button>
      </div>
      {hasFailed ? (
        <ul className="mt-2 flex flex-col gap-1 text-xs text-gold">
          {result.failed.slice(0, 8).map((f, i) => (
            <li key={`${f.id}-${i}`}>• {f.reason}</li>
          ))}
          {result.failed.length > 8 ? <li>+ încă {result.failed.length - 8}…</li> : null}
        </ul>
      ) : null}
    </div>
  );
}
