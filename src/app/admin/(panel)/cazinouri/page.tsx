import Link from "next/link";
import { Plus } from "lucide-react";
import { ExportButtons } from "@/components/admin/ExportButtons";
import { listAdminCasinos, listTags } from "@/lib/db/admin-casinos";
import { BulkCasinoTable } from "@/components/admin/BulkCasinoTable";
import { EditorialSummary } from "@/components/admin/EditorialSummary";
import { EditorialFilterBar } from "@/components/admin/EditorialFilterBar";
import {
  editorialFlags,
  matchesEditorialFilter,
  parseEditorialFilter,
  summarizeEditorial,
  type EditorialFlags,
} from "@/lib/editorial-status";
import { cn } from "@/lib/cn";

type Filter = "all" | "draft" | "published" | "archived";

const TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "Toate" },
  { key: "draft", label: "Draft" },
  { key: "published", label: "Publicate" },
  { key: "archived", label: "Arhivate" },
];

interface PageProps {
  searchParams: Promise<{ status?: string; editorial?: string }>;
}

export default async function AdminCasinosPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filter: Filter =
    sp.status === "draft" || sp.status === "published" || sp.status === "archived" ? sp.status : "all";
  const editorialFilter = parseEditorialFilter(sp.editorial);
  const [casinos, tags] = await Promise.all([listAdminCasinos(filter), listTags()]);

  // Flags computed server-side (now) and passed down → stable, no hydration drift.
  const now = new Date();
  const flagsById: Record<string, EditorialFlags> = {};
  for (const c of casinos) flagsById[c.id] = editorialFlags(c.editorial, now);
  const summary = summarizeEditorial(casinos.map((c) => flagsById[c.id]));
  const shown = casinos.filter((c) => matchesEditorialFilter(flagsById[c.id], editorialFilter));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Cazinouri</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {casinos.length} {casinos.length === 1 ? "cazino" : "cazinouri"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons entity="casinos" status={filter} />
          <Link
          href="/admin/cazinouri/nou"
          className="inline-flex h-10 items-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-[#06110a] transition-colors hover:bg-accent-hover"
        >
          <Plus size={16} />
          Adaugă cazino
        </Link>
        </div>
      </div>

      <div className="flex gap-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/admin/cazinouri" : `/admin/cazinouri?status=${t.key}`}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm font-medium",
              filter === t.key ? "bg-accent/12 text-ink" : "text-ink-secondary hover:bg-elevated hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <EditorialSummary summary={summary} />
      <EditorialFilterBar basePath="/admin/cazinouri" status={filter} current={editorialFilter} />

      <BulkCasinoTable rows={shown} tags={tags} flagsById={flagsById} />
    </div>
  );
}
