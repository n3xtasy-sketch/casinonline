import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import { getCasinos } from "@/lib/db/casinos";

/** Casino listing (Admin). Links to create + edit; no delete in this phase. */
export default async function AdminCasinosPage() {
  const casinos = await getCasinos();

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

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-semibold">Nume</th>
              <th className="px-4 py-3 font-semibold">Rating</th>
              <th className="px-4 py-3 font-semibold">Licență</th>
              <th className="px-4 py-3 font-semibold">Retrageri</th>
              <th className="px-4 py-3 font-semibold">Slug</th>
              <th className="px-4 py-3 font-semibold">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {casinos.map((c) => (
              <tr key={c.slug} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                <td className="px-4 py-3 tabular-nums text-ink-secondary">
                  {c.rating ? c.rating.toFixed(1) : "—"}
                </td>
                <td className="px-4 py-3 text-ink-secondary">{c.license ?? "—"}</td>
                <td className="px-4 py-3 text-ink-secondary">{c.payoutSpeed ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink-muted">{c.slug}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/cazinouri/${c.slug}/edit`}
                      className="font-medium text-accent hover:text-link-hover"
                    >
                      Editează
                    </Link>
                    <Link
                      href={c.reviewUrl}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-ink-muted hover:text-ink"
                      title={`Vezi pagina publică ${c.name}`}
                    >
                      <ExternalLink size={14} />
                      <span className="sr-only">Vezi pagina publică {c.name}</span>
                    </Link>
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
