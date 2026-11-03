import Link from "next/link";
import { notFound } from "next/navigation";
import { getSeoProject } from "@/lib/db/admin-seo-research";
import { loadEntityDashboardData } from "@/lib/db/admin-entity-dashboard";
import {
  buildEntityDashboard, filterEntityRows, entityTypeFacets, TOPICAL_STATES, type EntityDashboardRow,
} from "@/lib/seo/entity-dashboard";
import type { EntityRecord } from "@/lib/seo/entity-registry";
import type { TopicalState } from "@/lib/seo/topical-coverage";
import type { EntityRelation } from "@/lib/seo/entity-relations";

export const metadata = { title: "Entități & Topical — SEO Research — Admin" };

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string; topical?: string; provenance?: string; confidence?: string }>;
}

const STATE_TONE: Record<TopicalState, string> = {
  covered: "bg-accent/12 text-accent",
  candidate: "bg-link/12 text-link",
  planned: "bg-gold/15 text-gold",
  identified: "bg-elevated text-ink-secondary",
  gap: "bg-danger/15 text-danger",
  ambiguous: "bg-elevated text-ink-muted",
};
const STATE_LABEL: Record<TopicalState, string> = {
  covered: "Covered", candidate: "Candidate", planned: "Planned", identified: "Identified", gap: "Gap", ambiguous: "Ambiguous",
};
const CONF_TONE: Record<string, string> = { high: "text-accent", medium: "text-gold", low: "text-ink-muted" };
const PROV_TONE: Record<EntityRelation["provenance"], string> = {
  verified_db: "bg-accent/12 text-accent", derived_cms: "bg-link/12 text-link", inferred_rule: "bg-gold/15 text-gold",
};
const PROV_LABEL: Record<EntityRelation["provenance"], string> = {
  verified_db: "DB verificat", derived_cms: "derivat CMS", inferred_rule: "inferat",
};

export default async function EntitiesPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const project = await getSeoProject(id);
  if (!project) notFound(); // project isolation: RLS-scoped getSeoProject → not found/inaccessible

  const { projectKeywords, registry, relations, topical } = await loadEntityDashboardData(id);
  const byId = new Map(registry.map((e) => [e.id, e] as const));
  const { rows: allRows, kpis } = buildEntityDashboard(projectKeywords, registry, relations, topical);
  const rows = filterEntityRows(allRows, sp);
  const types = entityTypeFacets(allRows);

  const base = `/admin/seo-research/${id}`;
  const headCards = [
    { label: "Entități identificate", value: kpis.entities },
    { label: "Relații verificate (DB)", value: kpis.relationsVerified },
    { label: "Relații derivate (CMS)", value: kpis.relationsDerived },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link href={base} className="text-[13px] text-ink-muted hover:text-ink-secondary">← {project.name}</Link>
        <h1 className="text-2xl font-bold text-ink">Entități & Topical Coverage</h1>
        <p className="max-w-[72ch] text-sm text-ink-secondary">
          Entitățile CMS relevante pentru keywordurile acestui proiect, cu relațiile lor (verificate vs derivate) și
          acoperirea tematică (KE-2B). Determinist, fără SERP/GSC. Prezența în CMS ≠ acoperire editorială: „covered”
          cere dovadă explicită publicată; o pagină publicată nu probează automat fiecare relație.
        </p>
      </div>

      <section className="grid grid-cols-3 gap-3">
        {headCards.map((c) => (
          <div key={c.label} className="rounded-md border border-border bg-surface p-4">
            <div className="text-2xl font-bold tabular-nums text-ink">{c.value}</div>
            <div className="mt-0.5 text-xs text-ink-muted">{c.label}</div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {TOPICAL_STATES.map((s) => (
          <div key={s} className="rounded-md border border-border bg-surface p-3">
            <div className="text-xl font-bold tabular-nums text-ink">{kpis.topical[s]}</div>
            <div className="mt-0.5 text-[11px] text-ink-muted">{STATE_LABEL[s]}</div>
          </div>
        ))}
      </section>

      <nav className="flex flex-wrap gap-2">
        <Link href={`${base}/coverage`} className="inline-flex h-9 items-center rounded-sm border border-border px-4 text-sm font-medium text-ink hover:bg-elevated">Content Coverage →</Link>
        <Link href={`${base}/clusters`} className="inline-flex h-9 items-center rounded-sm border border-border px-4 text-sm font-medium text-ink hover:bg-elevated">Clustere →</Link>
        <Link href={`${base}/briefs`} className="inline-flex h-9 items-center rounded-sm border border-border px-4 text-sm font-medium text-ink hover:bg-elevated">Brief-uri →</Link>
      </nav>

      {projectKeywords.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface p-8 text-center text-sm text-ink-muted">
          Proiectul nu are încă keyworduri/clustere. Importă keyworduri și creează clustere pentru a identifica entitățile relevante.
        </div>
      ) : allRows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-surface p-8 text-center text-sm text-ink-muted">
          Nicio entitate CMS relevantă pentru keywordurile curente ale proiectului (termeni generici nu devin entități).
        </div>
      ) : (
        <section className="flex flex-col gap-3">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <select name="type" defaultValue={sp.type ?? ""} className="h-9 rounded-sm border border-border bg-field px-2 text-sm text-ink">
              <option value="">Toate tipurile</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select name="topical" defaultValue={sp.topical ?? ""} className="h-9 rounded-sm border border-border bg-field px-2 text-sm text-ink">
              <option value="">Orice status topical</option>
              {TOPICAL_STATES.map((s) => <option key={s} value={s}>{STATE_LABEL[s]}</option>)}
            </select>
            <select name="provenance" defaultValue={sp.provenance ?? ""} className="h-9 rounded-sm border border-border bg-field px-2 text-sm text-ink">
              <option value="">Orice proveniență</option>
              <option value="verified_db">DB verificat</option>
              <option value="derived_cms">derivat CMS</option>
            </select>
            <select name="confidence" defaultValue={sp.confidence ?? ""} className="h-9 rounded-sm border border-border bg-field px-2 text-sm text-ink">
              <option value="">Orice confidence</option>
              {["high", "medium", "low"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="submit" className="h-9 rounded-sm border border-border px-3 text-sm font-medium text-ink hover:bg-elevated">Filtrează</button>
            <Link href={`${base}/entities`} className="h-9 px-2 text-sm leading-9 text-ink-secondary hover:text-ink">Reset</Link>
          </form>

          {rows.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-surface p-6 text-center text-sm text-ink-muted">Nicio entitate pentru filtrele curente.</div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border bg-surface">
              <table className="w-full min-w-[920px] text-sm">
                <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2 font-semibold">Entitate</th>
                  <th className="px-3 py-2 font-semibold">Tip</th>
                  <th className="px-3 py-2 font-semibold">Confidence</th>
                  <th className="px-3 py-2 font-semibold">Relații</th>
                  <th className="px-3 py-2 font-semibold">Topical</th>
                  <th className="px-3 py-2 font-semibold">Pagină</th>
                  <th className="px-3 py-2 font-semibold">Detalii</th>
                </tr></thead>
                <tbody>
                  {rows.map((r) => <Row key={r.entityId} r={r} byId={byId} base={base} />)}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function targetLabel(rel: { relationType: string; targetEntityId: string }, byId: Map<string, EntityRecord>): string {
  if (rel.relationType === "casino_license") return `Licență ${rel.targetEntityId.replace("license:", "").toUpperCase()}`;
  return byId.get(rel.targetEntityId)?.name ?? rel.targetEntityId;
}

function Row({ r, byId, base }: { r: EntityDashboardRow; byId: Map<string, EntityRecord>; base: string }) {
  return (
    <tr className="border-b border-border/60 align-top last:border-0">
      <td className="px-3 py-2">
        <div className="font-medium text-ink">{r.name}</div>
        <div className="font-mono text-[11px] text-ink-muted">{r.slug}{r.status !== "published" ? ` · ${r.status}` : ""}</div>
      </td>
      <td className="px-3 py-2 text-ink-secondary">{r.type}</td>
      <td className={`px-3 py-2 font-medium ${CONF_TONE[r.confidence]}`}>{r.confidence}</td>
      <td className="px-3 py-2 text-ink-secondary tabular-nums">
        {r.relations.length ? <span><span className="text-accent">{r.verifiedCount}</span> / <span className="text-link">{r.derivedCount}</span></span> : "—"}
      </td>
      <td className="px-3 py-2">
        {r.topical.length ? (
          <span className="flex flex-wrap gap-1">
            {TOPICAL_STATES.filter((s) => r.topicalCounts[s] > 0).map((s) => (
              <span key={s} className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATE_TONE[s]}`}>{STATE_LABEL[s]} {r.topicalCounts[s]}</span>
            ))}
          </span>
        ) : <span className="text-ink-muted">—</span>}
      </td>
      <td className="px-3 py-2 text-ink-muted">
        {r.publicUrl && r.status === "published" ? (
          <Link href={r.publicUrl} className="font-mono text-[12px] text-link hover:underline">{r.publicUrl}</Link>
        ) : r.publicUrl ? (
          <span className="font-mono text-[12px]" title="Pagina nu e publicată">{r.publicUrl}</span>
        ) : "—"}
      </td>
      <td className="px-3 py-2">
        {r.relations.length || r.topical.length ? (
          <details>
            <summary className="cursor-pointer text-xs text-link">relații / topical</summary>
            <div className="mt-1 flex flex-col gap-2 text-[11px] text-ink-secondary">
              {r.relations.length ? (
                <div className="flex flex-col gap-1">
                  <div className="font-semibold text-ink-muted">Relații</div>
                  {r.relations.map((rel, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-1.5">
                      <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${PROV_TONE[rel.provenance]}`}>{PROV_LABEL[rel.provenance]}</span>
                      <span>{rel.relationType.replace(/_/g, " ")} → {targetLabel(rel, byId)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              {r.topical.length ? (
                <div className="flex flex-col gap-1 border-t border-border/60 pt-1">
                  <div className="font-semibold text-ink-muted">Topical</div>
                  {r.topical.map((t, i) => (
                    <div key={i} className="flex flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATE_TONE[t.state]}`}>{STATE_LABEL[t.state]}</span>
                        <span>{targetLabel(t.relation, byId)}</span>
                        <span className="rounded-full bg-elevated px-1.5 py-0.5 text-[10px] text-ink-secondary">{t.editorialAction}</span>
                        {t.dedicatedUrl && STATE_LABEL[t.state] === "Covered" ? <Link href={t.dedicatedUrl} className="text-link hover:underline">pagină</Link> : null}
                      </span>
                      {t.reasons[0] ? <span className="text-ink-muted">{t.reasons[0]}</span> : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="flex gap-2 border-t border-border/60 pt-1">
                <Link href={`${base}/clusters`} className="text-link hover:underline">Clustere</Link>
                <Link href={`${base}/briefs`} className="text-link hover:underline">Brief-uri</Link>
                <Link href={`${base}/coverage`} className="text-link hover:underline">Coverage</Link>
              </div>
            </div>
          </details>
        ) : <span className="text-[11px] text-ink-muted">identificată (fără relații)</span>}
      </td>
    </tr>
  );
}
