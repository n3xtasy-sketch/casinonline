"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

export interface FilterOption {
  value: string;
  label: string;
}

interface Props {
  /** URL query param this control writes to. */
  param: string;
  options: FilterOption[];
  allLabel?: string;
  /** Optional group label shown before the chips. */
  label?: string;
}

/**
 * Reusable single-select filter chips driven by a URL query param.
 * Server components read the same param to filter content (SEO-friendly).
 */
export function FilterChips({ param, options, allLabel = "Toate", label }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get(param) ?? "";

  const select = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(param, value);
    else next.delete(param);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const chip = (active: boolean) =>
    cn(
      "h-[38px] rounded-sm border px-3.5 text-sm font-medium transition-colors",
      active
        ? "border-accent/40 bg-accent/12 text-ink"
        : "border-panel-border bg-surface text-ink-secondary hover:bg-raised hover:text-ink",
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {label ? (
        <span className="mr-1 text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">
          {label}
        </span>
      ) : null}
      <button type="button" onClick={() => select("")} className={chip(!current)}>
        {allLabel}
      </button>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => select(o.value)}
          className={chip(current === o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
