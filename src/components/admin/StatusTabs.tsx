import Link from "next/link";
import { cn } from "@/lib/cn";

const TABS = [
  { key: "all", label: "Toate" },
  { key: "draft", label: "Draft" },
  { key: "published", label: "Publicate" },
  { key: "archived", label: "Arhivate" },
];

/** Status filter tabs for an admin listing (server component — plain links). */
export function StatusTabs({ basePath, current }: { basePath: string; current: string }) {
  return (
    <div className="flex gap-1">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.key === "all" ? basePath : `${basePath}?status=${t.key}`}
          className={cn(
            "rounded-sm px-3 py-1.5 text-sm font-medium",
            current === t.key ? "bg-accent/12 text-ink" : "text-ink-secondary hover:bg-elevated hover:text-ink",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export function parseStatusFilter(v: string | undefined): "all" | "draft" | "published" | "archived" {
  return v === "draft" || v === "published" || v === "archived" ? v : "all";
}
