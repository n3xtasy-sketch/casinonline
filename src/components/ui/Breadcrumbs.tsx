import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

/** Compact breadcrumb trail (DESIGN.md "Breadcrumbs"). Last item is the current page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-[13px]">
        {items.map((crumb, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-2">
              {crumb.href && !last ? (
                <Link href={crumb.href} className="text-ink-muted transition-colors hover:text-ink-secondary">
                  {crumb.label}
                </Link>
              ) : (
                <span className={last ? "text-ink-secondary" : "text-ink-muted"} aria-current={last ? "page" : undefined}>
                  {crumb.label}
                </span>
              )}
              {!last ? <ChevronRight size={14} className="text-ink-muted" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
