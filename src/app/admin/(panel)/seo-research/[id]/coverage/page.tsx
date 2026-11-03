import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeoProject } from "@/lib/db/admin-seo-research";
import { loadCoverageData } from "@/lib/db/admin-coverage";
import {
  buildDashboardRows, aggregateKpis, filterAndSortRows, intentFacets, type DashboardRow,
} from "@/lib/seo/coverage-dashboard";
import type { CoverageState } from "@/lib/seo/coverage";

export const metadata = { title: "Content Coverage — SEO Research — Admin" };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ state?: string; confidence?: string; intent?: string; dir?: string }>;
}

const STATE_TONE: Record<CoverageState, string> = {
  covered: "bg-accent/12 text-accent",
  planned: "bg-gold/15 text-gold",
  candidate: "bg-link/12 text-link",
  gap: "bg-danger/15 text-danger",
  ambiguous: "bg-elevated text-ink-secondary",
};
const CONF_TONE: Record<string, string> = { high: "text-accent", medium: "text-gold", low: "text-ink-muted" };
const STATE_LABEL: Record<CoverageState, string> = {
  covered: "Covered", planned: "Planned (draft)", candidate: "Candidate", gap: "Gap", ambiguous: "Ambiguous",
};

export default async function CoveragePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const project = await getSeoProject(id);
  if (!project) notFound(); // project isolation: RLS-scoped getSeoProject → not found/inaccessible

  const { clusters, metricsByCluster, inventory } = await loadCoverageData(id);
  const allRows = buildDashboardRows(clusters, metricsByCluster, inventory);
  const kpis = aggregateKpis(allRows); // KPIs over the full set (unfiltered)
  const rows = filterAndSortRows(allRows, { state: sp.state, confidence: sp.confidence, intent: sp.intent, dir: sp.dir === "asc" ? "asc" : "desc" });
  const intents = intentFacets(allRows);

  const base = `/admin/seo-research/${id}`;
  const kpiCards: { label: string; value: number; state?: CoverageState }[] = [
    { label: "Total clustere", value: kpis.total },
    { label: "Covered", value: kpis.covered, state: "covered" },
    { label: "Candidate", value: kpis.candidate, state: "candidate" },
    { label: "Planned", value: kpis.planned, state: "planned" },
    { label: "Gap", value: kpis.gap, state: "gap" },
    { label: "Ambiguous", value: kpis.ambiguous, state: "ambiguous" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href={base} className="text-[13px] text-ink-muted hover:text-ink-secondary">← {project.name}</Link>
        <h1 className="text-2xl font-bold text-ink">Content Coverage</h1>
        <p className="max-w-[70ch] text-sm text-ink-secondary">
          Acoperirea clusterelor de keyworduri vs. paginile existente (determinist, fără SERP/GSC). Covered = mapare
          confirmată către pagină publicată; lexical ≠ covered; Planned = pagina există ca draft. Scorul de oportunitate
          e un ghid de prioritizare, nu o metrică de trafic real.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpiCards.map((c) => (
          <div key={c.label} className="rounded-md border border-border bg-surface p-4">
            <div className="text-2xl font-bold tabular-nums text-ink">{c.value}</div>
            <div className="mt-0.5 text-xs text-ink-muted">{c.label}</div>
          </div>
        ))}
      </section>

      <nav className="flex flex-wrap gap-2">
        <Link href={`${base}/clusters`} className="inline-flex h-9 items-center rounded-sm border border-border px-4 text-sm font-medium text-ink hover:bg-elevated">Clustere →</Link>
        <Link href={`${base}/url-mapping`} className="inline-flex h-9 items-center rounded-sm border border-border px-4 text-sm font-medium text-ink hover:bg-elevated">URL Mapping →</Link>
        <Link href={`${base}/briefs`} className="inline-flex h-9 items-center rounded-sm border border-border px-4 text-sm font-medium text-ink hover:bg-elevated">Brief-uri →</Link>
      </nav>

      {clusters.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface p-8 text-center text-sm text-ink-muted">
          Niciun cluster în proiect. Creează clustere în <Link href={`${base}/clusters`} className="text-link hover:underline">workbench-ul de clustere</Link> pentru a vedea acoperirea.
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <select name="state" defaultValue={sp.state ?? ""} className="h-9 rounded-sm border border-border bg-field px-2 text-sm text-ink">
              <option value="">Toate stările</option>
              {(["gap", "planned", "candidate", "ambiguous", "covered"] as CoverageState[]).map((s) => <option key={s} value={s}>{STATE_LABEL[s]}</option>)}
            </select>
            <select name="confidence" defaultValue={sp.confidence ?? ""} className="h-9 rounded-sm border border-border bg-field px-2 text-sm text-ink">
              <option value="">Orice confidence</option>
              {["high", "medium", "low"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {intents.length ? (
              <select name="intent" defaultValue={sp.intent ?? ""} className="h-9 rounded-sm border border-border bg-field px-2 text-sm text-ink">
                <option value="">Orice intenție</option>
                {intents.map((it) => <option key={it} value={it}>{it}</option>)}
              </select>
            ) : null}
            <select name="dir" defaultValue={sp.dir === "asc" ? "asc" : "desc"} className="h-9 rounded-sm border border-border bg-field px-2 text-sm text-ink">
              <option value="desc">Scor: mare → mic</option>
              <option value="asc">Scor: mic → mare</option>
            </select>
            <button type="submit" className="h-9 rounded-sm border border-border px-3 text-sm font-medium text-ink hover:bg-elevated">Filtrează</button>
            <Link href={`${base}/coverage`} className="h-9 px-2 text-sm leading-9 text-ink-secondary hover:text-ink">Reset</Link>
          </form>

          {rows.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-surface p-6 text-center text-sm text-ink-muted">Niciun cluster pentru filtrele curente.</div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border bg-surface">
              <table className="w-full min-w-[980px] text-sm">
                <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2 font-semibold">Cluster</th>
                  <th className="px-3 py-2 font-semibold">Keyword principal</th>
                  <th className="px-3 py-2 font-semibold">Intent</th>
                  <th className="px-3 py-2 font-semibold">Coverage</th>
                  <th className="px-3 py-2 font-semibold">Confidence</th>
                  <th className="px-3 py-2 font-semibold">URL țintă</th>
                  <th className="px-3 py-2 font-semibold">Scor</th>
                  <th className="px-3 py-2 font-semibold">Detalii</th>
                </tr></thead>
                <tbody>
                  {rows.map((r) => <Row key={r.clusterId} r={r} base={base} />)}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Row({ r, base }: { r: DashboardRow; base: string }) {
  const cov = r.coverage;
  return (
    <tr className="border-b border-border/60 align-top last:border-0">
      <td className="px-3 py-2 font-medium text-ink">{r.clusterName}</td>
      <td className="px-3 py-2 text-ink-secondary">{r.primaryKeyword || "—"}</td>
      <td className="px-3 py-2 text-ink-secondary">{r.intent || "—"}</td>
      <td className="px-3 py-2">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATE_TONE[cov.state]}`}>{STATE_LABEL[cov.state]}</span>
      </td>
      <td className={`px-3 py-2 font-medium ${CONF_TONE[r.opportunity.confidence]}`}>{r.opportunity.confidence}</td>
      <td className="px-3 py-2 text-ink-muted">
        {cov.targetUrl ? (
          <span>
            <span className="font-mono text-[12px]">{cov.targetUrl}</span>
            {cov.targetScope ? <span className="ml-1 rounded-full bg-elevated px-1.5 py-0.5 text-[10px] text-ink-secondary">{cov.targetScope}</span> : null}
            {cov.targetStatus === "planned" ? <span className="ml-1 text-[10px] text-gold">draft</span> : null}
          </span>
        ) : "—"}
      </td>
      <td className="px-3 py-2 tabular-nums">
        {r.insufficientData ? (
          <span className="text-xs text-ink-muted" title="Date insuficiente — nu e prioritizat">insufficient data</span>
        ) : (
          <span className="font-semibold text-ink">{r.opportunity.score}</span>
        )}
        <span className="ml-1 text-[10px] text-ink-muted">{r.opportunity.opportunityType}</span>
      </td>
      <td className="px-3 py-2">
        <details>
          <summary className="cursor-pointer text-xs text-link">breakdown / motive</summary>
          <div className="mt-1 flex flex-col gap-1 text-[11px] text-ink-secondary">
            <div>
              {r.opportunity.breakdown.map((b) => (
                <div key={b.factor}>
                  {b.factor}: {b.availability === "missing" ? "lipsă" : `${b.contribution} pct (val ${b.normalizedValue})`}
                </div>
              ))}
              {r.opportunity.missingFactors.length ? <div className="text-ink-muted">missing: {r.opportunity.missingFactors.join(", ")}</div> : null}
            </div>
            {cov.reasons.length ? <div className="border-t border-border/60 pt-1">{cov.reasons.map((x, i) => <div key={i}>• {x}</div>)}</div> : null}
            <div className="flex gap-2 pt-1">
              <Link href={`${base}/url-mapping`} className="text-link hover:underline">URL Mapping</Link>
              <Link href={`${base}/clusters`} className="text-link hover:underline">Clustere</Link>
              <Link href={`${base}/briefs`} className="text-link hover:underline">Brief-uri</Link>
            </div>
          </div>
        </details>
      </td>
    </tr>
  );
}
