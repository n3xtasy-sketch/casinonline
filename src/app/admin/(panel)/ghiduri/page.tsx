import Link from "next/link";
import { Plus } from "lucide-react";
import { listAdminGuides } from "@/lib/db/admin-guides";
import { StatusTabs, parseStatusFilter } from "@/components/admin/StatusTabs";
import { StatusBadge, ContentStatusControl } from "@/components/admin/ContentStatusControl";
import { setGuideStatus } from "./actions";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminGuidesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filter = parseStatusFilter(sp.status);
  const guides = await listAdminGuides(filter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Ghiduri</h1>
          <p className="mt-1 text-sm text-ink-secondary">{guides.length} {guides.length === 1 ? "ghid" : "ghiduri"}</p>
        </div>
        <Link href="/admin/ghiduri/nou" className="inline-flex h-10 items-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-[#06110a] transition-colors hover:bg-accent-hover">
          <Plus size={16} />
          Adaugă ghid
        </Link>
      </div>

      <StatusTabs basePath="/admin/ghiduri" current={filter} />

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-semibold">Titlu</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Categorie</th>
              <th className="px-4 py-3 font-semibold">Autor</th>
              <th className="px-4 py-3 font-semibold">Slug</th>
              <th className="px-4 py-3 font-semibold">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {guides.map((g) => (
              <tr key={g.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{g.title}</td>
                <td className="px-4 py-3"><StatusBadge status={g.status} /></td>
                <td className="px-4 py-3 text-ink-secondary">{g.category || "—"}</td>
                <td className="px-4 py-3 text-ink-secondary">{g.author || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{g.slug}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <Link href={`/admin/ghiduri/${g.slug}/edit`} className="font-medium text-accent hover:text-link-hover">Editează</Link>
                    <ContentStatusControl id={g.id} status={g.status} action={setGuideStatus} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
