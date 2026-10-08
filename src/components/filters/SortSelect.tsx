"use client";

import { ArrowUpDown, Check, ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import type { FilterOption } from "./FilterChips";

interface Props {
  options: FilterOption[];
  /** Value treated as the default (removed from the URL when selected). */
  defaultValue: string;
}

/** Reusable sort control writing `?sort=` to the URL. Built on the Dropdown primitive. */
export function SortSelect({ options, defaultValue }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("sort") ?? defaultValue;
  const currentLabel = options.find((o) => o.value === current)?.label ?? options[0]?.label;

  const setSort = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === defaultValue) next.delete("sort");
    else next.set("sort", value);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <Dropdown
      align="end"
      triggerClassName="inline-flex h-[38px] items-center gap-2 rounded-sm border border-panel-border bg-surface px-3.5 text-sm font-medium text-ink-secondary transition-colors hover:bg-raised hover:text-ink"
      trigger={
        <>
          <ArrowUpDown size={15} className="text-ink-muted" />
          Sortează: <span className="text-ink">{currentLabel}</span>
          <ChevronDown size={15} className="text-ink-muted" />
        </>
      }
    >
      {options.map((o) => (
        <DropdownItem key={o.value} active={o.value === current} onClick={() => setSort(o.value)}>
          <span className="flex-1">{o.label}</span>
          {o.value === current ? <Check size={15} className="text-accent" /> : null}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}
