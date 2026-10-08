"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { sidebarGroups } from "@/data/navigation";

interface Props {
  /** Called after a link is clicked (used to close the mobile drawer). */
  onNavigate?: () => void;
}

export function SidebarNav({ onNavigate }: Props) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6">
      {sidebarGroups.map((group, i) => (
        <div key={group.label ?? i} className="flex flex-col gap-1">
          {group.label ? (
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              {group.label}
            </p>
          ) : null}

          {group.items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(`${item.href}`));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-2.5 rounded-sm px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent/12 text-ink"
                    : "text-ink-secondary hover:bg-elevated hover:text-ink",
                )}
              >
                <Icon
                  size={19}
                  strokeWidth={1.9}
                  className={active ? "text-accent" : "text-ink-muted"}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
