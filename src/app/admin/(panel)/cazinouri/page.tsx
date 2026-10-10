import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getCasinos } from "@/lib/db/casinos";

/** Read-only casino listing (Admin Phase 2). No Add/Edit yet. */
export default async function AdminCasinosPage() {
  const casinos = await getCasinos();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Cazinouri</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {casinos.length} {casinos.length === 1 ? "cazino" : "cazinouri"} · doar citire
        </p>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-semibold">Nume</th>
              <th className="px-4 py-3 font-semibold">Rating</th>
              <th className="px-4 py-3 font-semibold">Licență</th>
              <th className="px-4 py-3 font-semibold">Retrageri</th>
              <th className="px-4 py-3 font-semibold">Slug</th>
              <th className="px-4 py-3 font-semibold">Pagină</th>
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
                  <Link
                    href={c.reviewUrl}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-accent hover:text-link-hover"
                  >
                    <ExternalLink size={14} />
                    <span className="sr-only">Vezi pagina publică {c.name}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
