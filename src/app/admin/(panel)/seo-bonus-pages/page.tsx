import Link from "next/link";
import { listEvergreenPages } from "@/lib/db/admin-seo-bonus-pages";
import { intentLabel } from "@/lib/evergreen-bonus";

export const metadata = { title: "Pagini evergreen bonusuri — Admin" };

export default async function EvergreenPagesAdmin() {
  const pages = await listEvergreenPages();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Pagini evergreen bonusuri</h1>
          <p className="mt-1 max-w-[70ch] text-sm text-ink-secondary">
            Pagini `/cazinouri-online/[operator]/[intenție]` cu editorial stabil + ofertă comercială dinamică din
            <code> bonuses</code>. Doar <strong>published</strong> apar public/în sitemap. Nicio publicare automată.
          </p>
        </div>
        <Link href="/admin/seo-bonus-pages/nou" className="h-10 shrink-0 rounded-sm bg-accent px-4 text-sm font-semibold leading-10 text-[#06110a] hover:bg-accent-hover">
          + Pagină nouă
        </Link>
      </div>

      {pages.length ? (
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2 font-semibold">Operator</th><th className="px-4 py-2 font-semibold">Intenție</th>
              <th className="px-4 py-2 font-semibold">URL</th><th className="px-4 py-2 font-semibold">Featured</th>
              <th className="px-4 py-2 font-semibold">Status</th><th className="px-4 py-2" />
            </tr></thead>
            <tbody>
              {pages.map((p) => {
                const tone = p.status === "published" ? "bg-accent/12 text-accent" : p.status === "draft" ? "bg-gold/15 text-gold" : "bg-elevated text-ink-secondary";
                return (
                  <tr key={p.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2 font-medium text-ink">{p.casinoName}</td>
                    <td className="px-4 py-2 text-ink-secondary">{intentLabel(p.intent) ?? p.intent}</td>
                    <td className="px-4 py-2 text-ink-muted">/cazinouri-online/{p.casinoSlug}/{p.intent}</td>
                    <td className="px-4 py-2 text-ink-muted">{p.featuredBonusId ? "da" : "—"}</td>
                    <td className="px-4 py-2"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{p.status}</span></td>
                    <td className="px-4 py-2 text-right"><Link href={`/admin/seo-bonus-pages/${p.id}/edit`} className="text-sm text-link hover:underline">editează</Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border bg-surface p-6 text-center text-sm text-ink-muted">Nicio pagină evergreen. Creează prima mai sus.</p>
      )}
    </div>
  );
}
