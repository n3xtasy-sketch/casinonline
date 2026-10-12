import Link from "next/link";
import { listSeoForType } from "@/lib/db/admin-seo";
import { SEO_TYPES, seoTypeLabel, type SeoType } from "@/lib/seo";
import { cn } from "@/lib/cn";

const DOT: Record<string, string> = { green: "bg-accent", yellow: "bg-gold", red: "bg-danger" };

interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function AdminSeoPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const active: SeoType = (SEO_TYPES as readonly string[]).includes(sp.type ?? "")
    ? (sp.type as SeoType)
    : "casino";
  const rows = await listSeoForType(active);

  const counts = {
    red: rows.filter((r) => r.indicator === "red").length,
    yellow: rows.filter((r) => r.indicator === "yellow").length,
    green: rows.filter((r) => r.indicator === "green").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">SEO Manager</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Override meta/OG/robots per entitate, cu fallback automat la metadata curentă.
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {SEO_TYPES.map((t) => (
          <Link
            key={t}
            href={`/admin/seo?type=${t}`}
            className={cn(
              "rounded-sm px-3 py-1.5 text-sm font-medium",
              active === t ? "bg-accent/12 text-ink" : "text-ink-secondary hover:bg-elevated hover:text-ink",
            )}
          >
            {seoTypeLabel(t)}
          </Link>
        ))}
      </div>

      <div className="flex gap-4 text-sm">
        <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${DOT.green}`} />{counts.green}</span>
        <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${DOT.yellow}`} />{counts.yellow}</span>
        <span className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${DOT.red}`} />{counts.red}</span>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Entitate (title efectiv)</th>
              <th className="px-4 py-3 font-semibold">Override</th>
              <th className="px-4 py-3 font-semibold">Probleme</th>
              <th className="px-4 py-3 font-semibold">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3"><span className={`inline-block h-2.5 w-2.5 rounded-full ${DOT[r.indicator]}`} /></td>
                <td className="px-4 py-3 text-ink">{r.label}</td>
                <td className="px-4 py-3 text-ink-secondary">{r.hasOverride ? "custom" : "fallback"}</td>
                <td className="px-4 py-3 tabular-nums text-ink-secondary">{r.issueCount || "—"}</td>
                <td className="px-4 py-3">
                  <Link href={`/admin/seo/${r.type}/${r.id}/edit`} className="font-medium text-accent hover:text-link-hover">
                    Editează SEO
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
