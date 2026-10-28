import Link from "next/link";
import { cn } from "@/lib/cn";
import { EDITORIAL_FILTERS, type EditorialFilter } from "@/lib/editorial-status";

/**
 * Editorial filter chips for an Admin list. Preserves the current content-status tab
 * via the `status` query param. Orthogonal to StatusTabs (status = draft/published/…).
 */
export function EditorialFilterBar({
  basePath,
  status,
  current,
}: {
  basePath: string;
  status: string; // "all" | "draft" | "published" | "archived"
  current: EditorialFilter;
}) {
  const href = (f: EditorialFilter) => {
    const params = new URLSearchParams();
    if (status && status !== "all") params.set("status", status);
    if (f !== "all") params.set("editorial", f);
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  return (
    <nav aria-label="Filtru editorial" className="flex flex-wrap gap-2">
      {EDITORIAL_FILTERS.map((f) => (
        <Link
          key={f.value}
          href={href(f.value)}
          className={cn(
            "rounded-sm border px-3 py-1.5 text-sm transition-colors",
            f.value === current
              ? "border-accent bg-accent/12 text-accent"
              : "border-border text-ink-secondary hover:bg-elevated",
          )}
        >
          {f.label}
        </Link>
      ))}
    </nav>
  );
}
