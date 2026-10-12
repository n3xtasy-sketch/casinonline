import Link from "next/link";
import { Plus } from "lucide-react";
import { listAdminPayments } from "@/lib/db/admin-payments";
import { StatusTabs, parseStatusFilter } from "@/components/admin/StatusTabs";
import { StatusBadge, ContentStatusControl } from "@/components/admin/ContentStatusControl";
import { setPaymentStatus } from "./actions";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filter = parseStatusFilter(sp.status);
  const methods = await listAdminPayments(filter);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Metode de plată</h1>
          <p className="mt-1 text-sm text-ink-secondary">{methods.length} {methods.length === 1 ? "metodă" : "metode"}</p>
        </div>
        <Link href="/admin/metode-de-plata/nou" className="inline-flex h-10 items-center gap-2 rounded-sm bg-accent px-4 text-sm font-semibold text-[#06110a] transition-colors hover:bg-accent-hover">
          <Plus size={16} />
          Adaugă metodă
        </Link>
      </div>

      <StatusTabs basePath="/admin/metode-de-plata" current={filter} />

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-semibold">Nume</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Tip</th>
              <th className="px-4 py-3 font-semibold">Slug</th>
              <th className="px-4 py-3 font-semibold">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {methods.map((m) => (
              <tr key={m.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{m.name}</td>
                <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                <td className="px-4 py-3 text-ink-secondary">{m.type || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{m.slug}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-4">
                    <Link href={`/admin/metode-de-plata/${m.slug}/edit`} className="font-medium text-accent hover:text-link-hover">Editează</Link>
                    <ContentStatusControl id={m.id} status={m.status} action={setPaymentStatus} />
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
