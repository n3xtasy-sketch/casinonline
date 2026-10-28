import Link from "next/link";
import { Plus } from "lucide-react";
import { ExportButtons } from "@/components/admin/ExportButtons";
import { listAdminBonuses } from "@/lib/db/admin-bonuses";
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
import { setBonusStatus } from "./actions";

interface PageProps {
  searchParams: Promise<{ status?: string; editorial?: string }>;
}

export default async function AdminBonusesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filter = parseStatusFilter(sp.status);
  const editorialFilter = parseEditorialFilter(sp.editorial);
  const bonuses = await listAdminBonuses(filter);

  const now = new Date();
  const withFlags = bonuses.map((b) => ({ b, flags: editorialFlags(b.editorial, now) }));
  const summary = summarizeEditorial(withFlags.map((x) => x.flags));
  const shown = withFlags.filter((x) => matchesEditorialFilter(x.flags, editorialFilter));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Bonusuri</h1>
          <p className="mt-1 text-sm text-ink-secondary">{bonuses.length} {bonuses.length === 1 ? "bonus" : "bonusuri"}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons entity="bonuses" status={filter} />
          <Link href="/admin/bonusuri/nou" className="inline-flex h-10 items-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-[#06110a] transition-colors hover:bg-accent-hover">
          <Plus size={16} />
          Adaugă bonus
        </Link>
        </div>
      </div>

      <StatusTabs basePath="/admin/bonusuri" current={filter} />
      <EditorialSummary summary={summary} />
      <EditorialFilterBar basePath="/admin/bonusuri" status={filter} current={editorialFilter} />

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[1020px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-semibold">Ofertă</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Cazino</th>
              <th className="px-4 py-3 font-semibold">Autor</th>
              <th className="px-4 py-3 font-semibold">Verificare editorială</th>
              <th className="px-4 py-3 font-semibold">Actualizat</th>
              <th className="px-4 py-3 font-semibold">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(({ b, flags }) => (
              <tr key={b.id} className="border-b border-border/60 align-top last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{b.offer}</td>
                <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                <td className="px-4 py-3 text-ink-secondary">
                  {b.casinoName}
                  {b.casinoArchived ? <span className="ml-2 inline-flex items-center rounded-full bg-ink-muted/15 px-2 py-0.5 text-xs font-medium text-ink-muted">cazino arhivat</span> : null}
                </td>
                <EditorialCells view={b.editorial} flags={flags} />
                <td className="px-4 py-3 text-ink-muted">{fmtDate(b.editorial.updatedAt) || "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <Link href={`/admin/bonusuri/${b.slug}/edit`} className="font-medium text-accent hover:text-link-hover">Editează</Link>
                    <ContentStatusControl id={b.id} status={b.status} action={setBonusStatus} />
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-ink-muted">Niciun bonus pentru acest filtru.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
