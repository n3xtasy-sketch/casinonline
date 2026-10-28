import type { EditorialSummary as Summary } from "@/lib/editorial-status";

/** Simple editorial indicators for an Admin list (no dashboards). Counts reflect the
 *  current status-filtered set. "Fără autor" / "Neverificate" are neutral — not errors. */
export function EditorialSummary({ summary }: { summary: Summary }) {
  const chip = "rounded-sm border border-border bg-surface px-3 py-1.5 text-sm";
  return (
    <div className="flex flex-wrap gap-2 text-ink-secondary">
      <span className={chip}>
        Total: <strong className="text-ink">{summary.total}</strong>
      </span>
      <span className={chip}>
        Fără autor: <strong className="text-ink">{summary.faraAutor}</strong>
      </span>
      <span className={chip}>
        Neverificate editorial: <strong className="text-ink">{summary.neverificate}</strong>
      </span>
      <span className={chip}>
        Necesită reverificare: <strong className={summary.reverificare ? "text-gold" : "text-ink"}>{summary.reverificare}</strong>
      </span>
    </div>
  );
}
