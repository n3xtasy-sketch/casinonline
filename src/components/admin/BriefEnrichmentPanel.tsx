import type { BriefEnrichment, BriefRecommendation, RecProvenance } from "@/lib/seo/brief-enrichment";

/**
 * KE-2C read-only semantic recommendations panel for the SEO Brief Workbench. Server component, no
 * state, no writes: it SHOWS registry entities, verified/derived relations, grounded FAQ questions
 * and topical gaps so the editor can incorporate them MANUALLY. It never mutates the brief, so it
 * cannot overwrite manual/confirmed entities or reintroduce content. Entities already in the brief
 * are marked, not re-proposed.
 */

const PROV_BADGE: Record<RecProvenance, { label: string; cls: string }> = {
  confirmed_cms: { label: "CMS verificat", cls: "bg-accent/12 text-accent" },
  verified_db: { label: "DB verificat", cls: "bg-accent/12 text-accent" },
  derived_cms: { label: "derivat CMS", cls: "bg-link/12 text-link" },
  suggested: { label: "sugerat", cls: "bg-gold/15 text-gold" },
};

function Item({ r }: { r: BriefRecommendation }) {
  const b = PROV_BADGE[r.provenance];
  return (
    <li className="flex flex-col gap-1 rounded-sm border border-border bg-field px-3 py-2">
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink">{r.label}</span>
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${b.cls}`}>{b.label}</span>
        <span className="text-[11px] text-ink-muted">· {r.confidence}</span>
        {r.editorialAction ? <span className="inline-flex rounded-full bg-elevated px-2 py-0.5 text-[11px] text-ink-secondary">{r.editorialAction}</span> : null}
        {r.alreadyInBrief ? <span className="inline-flex rounded-full bg-elevated px-2 py-0.5 text-[11px] text-ink-muted">deja în brief</span> : null}
      </span>
      {r.reasons.length ? <span className="text-[11px] text-ink-muted">{r.reasons[0]}</span> : null}
    </li>
  );
}

function Section({ title, hint, items }: { title: string; hint: string; items: BriefRecommendation[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <div>
        <h3 className="text-sm font-semibold text-ink-secondary">{title}</h3>
        <p className="text-[11px] text-ink-muted">{hint}</p>
      </div>
      <ul className="flex flex-col gap-1.5">{items.map((r) => <Item key={r.id} r={r} />)}</ul>
    </div>
  );
}

export function BriefEnrichmentPanel({ enrichment }: { enrichment: BriefEnrichment }) {
  const total = enrichment.entities.length + enrichment.secondaryTopics.length + enrichment.questions.length + enrichment.gaps.length;
  return (
    <section className="flex flex-col gap-5 rounded-md border border-border bg-surface p-4">
      <div>
        <h2 className="text-base font-semibold text-ink">
          Recomandări semantice (KE-2C)
          <span className="ml-2 inline-flex rounded-full bg-elevated px-2 py-0.5 align-middle text-[11px] font-medium text-ink-secondary">scope: {enrichment.scope}</span>
        </h2>
        <p className="mt-0.5 text-[12px] text-ink-muted">
          Doar sugestii, din CMS/relații verificate — fără validare SERP/AI. Le adaugi manual în câmpuri; nimic nu se scrie automat.
          Filtrate editorial după tipul paginii (scope). Recomandările nu sunt persistate (recalculate la fiecare încărcare).
        </p>
      </div>
      {total === 0 ? (
        <p className="text-sm text-ink-muted">Nicio recomandare semantică pentru keywordurile curente ale brief-ului.</p>
      ) : (
        <>
          <Section title="Entități din CMS" hint="Entități reale rezolvate din keywordurile brief-ului." items={enrichment.entities} />
          <Section title="Topicuri secundare" hint="Relații verificate (DB) sau derivate (CMS) ale entităților — candidate la secțiuni, nu dovadă de acoperire." items={enrichment.secondaryTopics} />
          <Section title="Întrebări FAQ" hint="Întrebări fundamentate pe relații verificate; răspunsurile se scriu editorial." items={enrichment.questions} />
          <Section title="Goluri tematice" hint="Topicuri relevante neacoperite editorial, cu acțiunea recomandată din KE-2B." items={enrichment.gaps} />
        </>
      )}
    </section>
  );
}
