import { Download } from "lucide-react";

/** CSV + JSON download links for an entity (full, re-importable export via the route). */
export function ExportButtons({ entity, status }: { entity: string; status?: string }) {
  const q = status && status !== "all" ? `&status=${status}` : "";
  const cls =
    "inline-flex h-9 items-center gap-1.5 rounded-sm border border-border px-3 text-sm font-medium text-ink hover:bg-elevated";
  return (
    <div className="flex items-center gap-2">
      <a href={`/admin/export/${entity}?format=csv${q}`} className={cls}>
        <Download size={15} /> CSV
      </a>
      <a href={`/admin/export/${entity}?format=json${q}`} className={cls}>
        <Download size={15} /> JSON
      </a>
    </div>
  );
}
