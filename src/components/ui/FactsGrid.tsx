import type { LucideIcon } from "lucide-react";

export interface Fact {
  icon: LucideIcon;
  label: string;
  /** Rows without a value are omitted. */
  value?: string;
}

/** Reusable key-facts grid (casino specs, game specs, …). */
export function FactsGrid({ facts }: { facts: Fact[] }) {
  const items = facts.filter((f) => f.value);
  if (!items.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ icon: Icon, label, value }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-md border border-border bg-surface p-4"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-elevated text-accent">
            <Icon size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-ink-muted">{label}</p>
            <p className="truncate text-sm font-semibold text-ink">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
