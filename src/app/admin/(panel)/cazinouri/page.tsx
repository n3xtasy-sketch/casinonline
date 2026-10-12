import Link from "next/link";
import { Plus } from "lucide-react";
import { listAdminCasinos, listTags } from "@/lib/db/admin-casinos";
import { BulkCasinoTable } from "@/components/admin/BulkCasinoTable";
import { cn } from "@/lib/cn";

type Filter = "all" | "active" | "archived";

const TABS: { key: Filter; label: string }[] = [
  { key: "all", label: "Toate" },
  { key: "active", label: "Active" },
  { key: "archived", label: "Arhivate" },
];

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminCasinosPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filter: Filter = sp.status === "active" || sp.status === "archived" ? sp.status : "all";
  const [casinos, tags] = await Promise.all([listAdminCasinos(filter), listTags()]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Cazinouri</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {casinos.length} {casinos.length === 1 ? "cazino" : "cazinouri"}
          </p>
        </div>
        <Link
          href="/admin/cazinouri/nou"
          className="inline-flex h-10 items-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-[#06110a] transition-colors hover:bg-accent-hover"
        >
          <Plus size={16} />
          Adaugă cazino
        </Link>
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

      <BulkCasinoTable rows={casinos} tags={tags} />
    </div>
  );
}
