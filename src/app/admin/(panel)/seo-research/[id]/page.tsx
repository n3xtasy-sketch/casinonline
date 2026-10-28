import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getSeoProject,
  getSeoProjectStats,
  listSeoImports,
  listSeoKeywords,
  type KeywordSort,
} from "@/lib/db/admin-seo-research";
import { AhrefsImportWizard } from "@/components/admin/AhrefsImportWizard";

export const metadata = { title: "Proiect SEO Research — Admin" };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; country?: string; intent?: string; sort?: string; dir?: string; page?: string }>;
}

const SORTS: KeywordSort[] = ["volume", "difficulty", "keyword", "updated_at"];
function fmtDate(iso: string): string {
  const d = iso.slice(0, 10).split("-");
  return d.length === 3 ? `${d[2]}.${d[1]}.${d[0]}` : iso;
}

export default async function SeoProjectPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const project = await getSeoProject(id);
  if (!project) notFound();

  const sort = (SORTS.includes(sp.sort as KeywordSort) ? sp.sort : "volume") as KeywordSort;
  const dir = sp.dir === "asc" ? "asc" : "desc";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const [stats, imports, kw] = await Promise.all([
    getSeoProjectStats(id),
    listSeoImports(id),
    listSeoKeywords(id, { search: sp.q, country: sp.country, intent: sp.intent, sort, dir, page }),
  ]);

  const indicators = [
    { label: "Keyworduri", value: stats.keywords },
    { label: "Clustere", value: stats.clusters },
    { label: "Importuri", value: stats.imports },
    { label: "Brief-uri", value: stats.briefs },
  ];

  // Build hrefs preserving the current filters.
  const base = `/admin/seo-research/${id}`;
  const qp = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: sp.q, country: sp.country, intent: sp.intent, sort, dir, page, ...over };
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== "" && !(k === "page" && v === 1) && !(k === "sort" && v === "volume" && merged.dir === "desc"))
        p.set(k, String(v));
    }
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };
  const sortHref = (col: KeywordSort) => qp({ sort: col, dir: sort === col && dir === "desc" ? "asc" : "desc", page: 1 });
  const totalPages = Math.max(1, Math.ceil(kw.total / kw.pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href="/admin/seo-research" className="text-[13px] text-ink-muted hover:text-ink-secondary">← SEO Research</Link>
        <h1 className="text-2xl font-bold text-ink">{project.name}</h1>
        <p className="text-sm text-ink-secondary">Țară implicită: {project.defaultCountry.toUpperCase()}</p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {indicators.map((i) => (
          <div key={i.label} className="rounded-md border border-border bg-surface p-4">
            <div className="text-2xl font-bold tabular-nums text-ink">{i.value}</div>
            <div className="mt-0.5 text-xs text-ink-muted">{i.label}</div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">Import keyworduri (Ahrefs CSV)</h2>
        <AhrefsImportWizard projectId={id} defaultCountry={project.defaultCountry} />
      </section>

      {imports.length ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-ink">Istoric importuri</h2>
          <div className="overflow-x-auto rounded-md border border-border bg-surface">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-2 font-semibold">Fișier</th><th className="px-4 py-2 font-semibold">Sursă</th>
                <th className="px-4 py-2 font-semibold">Rânduri</th><th className="px-4 py-2 font-semibold">Data</th>
              </tr></thead>
              <tbody>
                {imports.map((im) => (
                  <tr key={im.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2 text-ink">{im.filename || "—"}</td>
                    <td className="px-4 py-2 text-ink-secondary">{im.source}</td>
                    <td className="px-4 py-2 tabular-nums text-ink-secondary">{im.rowCount}</td>
                    <td className="px-4 py-2 text-ink-muted">{fmtDate(im.importedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">Keyworduri ({kw.total})</h2>
        <form method="get" className="flex flex-wrap items-end gap-2">
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Caută keyword…" className="h-9 w-56 rounded-sm border border-border bg-field px-3 text-sm text-ink" />
          {kw.countries.length ? (
            <select name="country" defaultValue={sp.country ?? ""} className="h-9 rounded-sm border border-border bg-field px-2 text-sm text-ink">
              <option value="">Toate țările</option>
              {kw.countries.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
            </select>
          ) : null}
          {kw.intents.length ? (
            <select name="intent" defaultValue={sp.intent ?? ""} className="h-9 rounded-sm border border-border bg-field px-2 text-sm text-ink">
              <option value="">Toate intențiile</option>
              {kw.intents.map((it) => <option key={it} value={it}>{it}</option>)}
            </select>
          ) : null}
          <button type="submit" className="h-9 rounded-sm border border-border px-3 text-sm font-medium text-ink hover:bg-elevated">Filtrează</button>
          <Link href={base} className="h-9 px-2 text-sm leading-9 text-ink-secondary hover:text-ink">Reset</Link>
        </form>

        {kw.total === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface p-8 text-center text-sm text-ink-muted">
            Niciun keyword. Importă un CSV Ahrefs mai sus pentru a începe.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border border-border bg-surface">
              <table className="w-full min-w-[920px] text-sm">
                <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-4 py-2 font-semibold"><Link href={sortHref("keyword")} className="hover:text-ink">Keyword</Link></th>
                  <th className="px-4 py-2 font-semibold">Țară</th>
                  <th className="px-4 py-2 font-semibold"><Link href={sortHref("volume")} className="hover:text-ink">Volume</Link></th>
                  <th className="px-4 py-2 font-semibold"><Link href={sortHref("difficulty")} className="hover:text-ink">KD</Link></th>
                  <th className="px-4 py-2 font-semibold">TP</th>
                  <th className="px-4 py-2 font-semibold">Intent</th>
                  <th className="px-4 py-2 font-semibold">Parent Topic</th>
                  <th className="px-4 py-2 font-semibold">Cluster</th>
                  <th className="px-4 py-2 font-semibold">URL</th>
                  <th className="px-4 py-2 font-semibold"><Link href={sortHref("updated_at")} className="hover:text-ink">Actualizat</Link></th>
                </tr></thead>
                <tbody>
                  {kw.rows.map((r) => (
                    <tr key={r.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2 font-medium text-ink">{r.keyword}</td>
                      <td className="px-4 py-2 text-ink-muted">{r.country.toUpperCase()}</td>
                      <td className="px-4 py-2 tabular-nums text-ink-secondary">{r.volume ?? "—"}</td>
                      <td className="px-4 py-2 tabular-nums text-ink-secondary">{r.difficulty ?? "—"}</td>
                      <td className="px-4 py-2 tabular-nums text-ink-secondary">{r.trafficPotential ?? "—"}</td>
                      <td className="px-4 py-2 text-ink-secondary">{r.intent || "—"}</td>
                      <td className="px-4 py-2 text-ink-secondary">{r.parentTopic || "—"}</td>
                      <td className="px-4 py-2 text-ink-muted">—</td>
                      <td className="px-4 py-2 text-ink-muted">{r.mappedUrl ? r.mappingStatus : "—"}</td>
                      <td className="px-4 py-2 text-ink-muted">{fmtDate(r.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-sm text-ink-secondary">
              <span>Pagina {kw.page} / {totalPages}</span>
              <div className="flex gap-2">
                {kw.page > 1 ? <Link href={qp({ page: kw.page - 1 })} className="rounded-sm border border-border px-3 py-1 hover:bg-elevated">← Anterior</Link> : null}
                {kw.page < totalPages ? <Link href={qp({ page: kw.page + 1 })} className="rounded-sm border border-border px-3 py-1 hover:bg-elevated">Următor →</Link> : null}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
