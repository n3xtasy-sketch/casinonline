import Link from "next/link";
import { listCategories } from "@/lib/db/admin-seo-categories";
import { categoryPath, type CategoryNamespace } from "@/lib/seo-categories";

export const metadata = { title: "Categorii SEO — Admin" };

const NS_LABEL: Record<CategoryNamespace, string> = { bonus: "Bonusuri", game: "Păcănele", casino: "Cazinouri" };

export default async function SeoCategoriesPage() {
  const cats = await listCategories();
  const byNs = { bonus: cats.filter((c) => c.namespace === "bonus"), game: cats.filter((c) => c.namespace === "game"), casino: cats.filter((c) => c.namespace === "casino") };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Categorii SEO</h1>
          <p className="mt-1 max-w-[70ch] text-sm text-ink-secondary">
            Pagini de categorie pentru cele 3 pillar-uri. Doar categoriile <strong>published</strong> apar în sitemap
            și sunt indexabile. Categoriile noi rămân <strong>draft</strong> până au conținut editorial + entități.
          </p>
        </div>
        <Link href="/admin/seo-categories/nou" className="h-10 shrink-0 rounded-sm bg-accent px-4 text-sm font-semibold leading-10 text-[#06110a] hover:bg-accent-hover">
          + Categorie nouă
        </Link>
      </div>

      {(["bonus", "game", "casino"] as CategoryNamespace[]).map((ns) => (
        <section key={ns} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-ink">{NS_LABEL[ns]} ({byNs[ns].length})</h2>
          {byNs[ns].length ? (
            <div className="overflow-x-auto rounded-md border border-border bg-surface">
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-2 font-semibold">Nume</th><th className="px-4 py-2 font-semibold">URL</th>
                  <th className="px-4 py-2 font-semibold">Selector</th><th className="px-4 py-2 font-semibold">Status</th><th className="px-4 py-2" />
                </tr></thead>
                <tbody>
                  {byNs[ns].map((c) => {
                    const tone = c.status === "published" ? "bg-accent/12 text-accent" : c.status === "draft" ? "bg-gold/15 text-gold" : "bg-elevated text-ink-secondary";
                    return (
                      <tr key={c.id} className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-2 font-medium text-ink">{c.name}</td>
                        <td className="px-4 py-2 text-ink-muted">{categoryPath(c.namespace, c.slug)}</td>
                        <td className="px-4 py-2 text-ink-muted"><code>{c.selector}</code></td>
                        <td className="px-4 py-2"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>{c.status}</span></td>
                        <td className="px-4 py-2 text-right"><Link href={`/admin/seo-categories/${c.id}/edit`} className="text-sm text-link hover:underline">editează</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border bg-surface p-4 text-sm text-ink-muted">Nicio categorie.</p>
          )}
        </section>
      ))}
    </div>
  );
}
