import Link from "next/link";
import { Plus } from "lucide-react";
import { ExportButtons } from "@/components/admin/ExportButtons";
import { listAdminGuides } from "@/lib/db/admin-guides";
import { StatusTabs, parseStatusFilter } from "@/components/admin/StatusTabs";
import { StatusBadge, ContentStatusControl } from "@/components/admin/ContentStatusControl";
import { EditorialSummary } from "@/components/admin/EditorialSummary";
import { EditorialFilterBar } from "@/components/admin/EditorialFilterBar";
import { EditorialCells, fmtDate } from "@/components/admin/EditorialCells";
import {
  editorialFlags,
  matchesEditorialFilter,
  parseEditorialFilter,
  summarizeEditorial,
} from "@/lib/editorial-status";
import { setGuideStatus } from "./actions";

interface PageProps {
  searchParams: Promise<{ status?: string; editorial?: string }>;
}

export default async function AdminGuidesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filter = parseStatusFilter(sp.status);
  const editorialFilter = parseEditorialFilter(sp.editorial);
  const guides = await listAdminGuides(filter);

  const now = new Date();
  const withFlags = guides.map((g) => ({ g, flags: editorialFlags(g.editorial, now) }));
  const summary = summarizeEditorial(withFlags.map((x) => x.flags));
  const shown = withFlags.filter((x) => matchesEditorialFilter(x.flags, editorialFilter));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Ghiduri</h1>
          <p className="mt-1 text-sm text-ink-secondary">{guides.length} {guides.length === 1 ? "ghid" : "ghiduri"}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons entity="guides" status={filter} />
          <Link href="/admin/ghiduri/nou" className="inline-flex h-10 items-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-[#06110a] transition-colors hover:bg-accent-hover">
          <Plus size={16} />
          Adaugă ghid
        </Link>
        </div>
      </div>

      <StatusTabs basePath="/admin/ghiduri" current={filter} />
      <EditorialSummary summary={summary} />
      <EditorialFilterBar basePath="/admin/ghiduri" status={filter} current={editorialFilter} />

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-semibold">Titlu</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Categorie</th>
              <th className="px-4 py-3 font-semibold">Autor</th>
              <th className="px-4 py-3 font-semibold">Verificare editorială</th>
              <th className="px-4 py-3 font-semibold">Actualizat</th>
              <th className="px-4 py-3 font-semibold">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ g, flags }) => (
              <tr key={g.id} className="border-b border-border/60 align-top last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{g.title}</td>
                <td className="px-4 py-3"><StatusBadge status={g.status} /></td>
                <td className="px-4 py-3 text-ink-secondary">{g.category || "—"}</td>
                <EditorialCells view={g.editorial} flags={flags} />
                <td className="px-4 py-3 text-ink-muted">{fmtDate(g.editorial.updatedAt) || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <Link href={`/admin/ghiduri/${g.slug}/edit`} className="font-medium text-accent hover:text-link-hover">Editează</Link>
                    <ContentStatusControl id={g.id} status={g.status} action={setGuideStatus} />
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-ink-muted">Niciun ghid pentru acest filtru.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
