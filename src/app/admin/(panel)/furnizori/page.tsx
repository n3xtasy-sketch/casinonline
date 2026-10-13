import Link from "next/link";
import { Plus } from "lucide-react";
import { ExportButtons } from "@/components/admin/ExportButtons";
import { listAdminProviders } from "@/lib/db/admin-providers";
import { StatusTabs, parseStatusFilter } from "@/components/admin/StatusTabs";
import { StatusBadge, ContentStatusControl } from "@/components/admin/ContentStatusControl";
import { setProviderStatus } from "./actions";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminProvidersPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filter = parseStatusFilter(sp.status);
  const providers = await listAdminProviders(filter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Furnizori</h1>
          <p className="mt-1 text-sm text-ink-secondary">{providers.length} {providers.length === 1 ? "furnizor" : "furnizori"}</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons entity="providers" status={filter} />
          <Link href="/admin/furnizori/nou" className="inline-flex h-10 items-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-[#06110a] transition-colors hover:bg-accent-hover">
          <Plus size={16} />
          Adaugă furnizor
        </Link>
        </div>
      </div>

      <StatusTabs basePath="/admin/furnizori" current={filter} />

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-semibold">Nume</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Categorie</th>
              <th className="px-4 py-3 font-semibold">Jocuri</th>
              <th className="px-4 py-3 font-semibold">Slug</th>
              <th className="px-4 py-3 font-semibold">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{p.name}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-ink-secondary">{p.category || "—"}</td>
                <td className="px-4 py-3 tabular-nums text-ink-secondary">{p.gameCount}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{p.slug}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <Link href={`/admin/furnizori/${p.slug}/edit`} className="font-medium text-accent hover:text-link-hover">Editează</Link>
                    <ContentStatusControl id={p.id} status={p.status} action={setProviderStatus} />
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
