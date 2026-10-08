import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Presentational search field for the header.
 * Real search is implemented in a later phase (TASKS.md Phase 8).
 */
export function SearchInput({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Search
        size={18}
        strokeWidth={1.9}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
      />
      <input
        type="search"
        aria-label="Caută"
        placeholder="Caută cazinouri, jocuri, bonusuri..."
        className="h-[42px] w-full rounded-md border border-border-strong bg-surface pl-10 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-accent"
      />
    </div>
  );
}
