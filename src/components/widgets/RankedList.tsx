import { Star } from "lucide-react";
import type { RankedRow } from "@/types/widget";

/** Compact ranked list used inside right-sidebar widgets. */
export function RankedList({ rows }: { rows: RankedRow[] }) {
  return (
    <ol className="flex flex-col">
      {rows.map((row, i) => (
        <li
          key={row.name}
          className="flex h-[54px] items-center gap-3 border-b border-border/60 last:border-0"
        >
          <span className="w-5 text-sm font-bold tabular-nums text-ink-muted">{i + 1}</span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{row.name}</span>
          <span className="flex items-center gap-1 text-sm font-semibold text-gold">
            <Star size={13} className="fill-gold text-gold" />
            {row.rating.toFixed(1)}
          </span>
        </li>
      ))}
    </ol>
  );
}
