import "server-only";
import { getBriefById } from "@/lib/db/admin-seo-briefs";
import { loadSemanticContext } from "@/lib/db/admin-relations";
import { loadCmsFactRows } from "@/lib/db/admin-cms-facts";
import { enrichBrief } from "@/lib/seo/brief-enrichment";
import { buildUrlInventory } from "@/lib/db/url-inventory";
import { scopeGenerationContext, type ScopedContext } from "@/lib/ai/context-scope";
import { buildCmsFacts, scopeCmsFacts, type CmsFact } from "@/lib/ai/cms-facts";
import { buildFactScopingDiagnostic, type FactScopingDiagnostic } from "@/lib/ai/fact-diagnostics";
import { AUTHOR_KNOWLEDGE, selectAuthorKnowledge, type AuthorKnowledge } from "@/lib/ai/author-knowledge";
import { buildABExperiment, type ABExperimentPlan } from "@/lib/ai/ab-experiment";
import { DATA_CAPS, listSections } from "@/lib/ai/content-prompt";
import type { BriefEnrichment } from "@/lib/seo/brief-enrichment";
import type { ContentBrief, ContentPageType, ContentPromptInput } from "@/lib/ai/content-prompt";

/**
 * AI-1 (server-only): assemble a ContentPromptInput from a REAL brief + CMS graph. All facts are
 * loaded server-side from the DB — the client never supplies brief content, CMS facts, or links.
 * Returns null when the brief does not exist (project-scoped read, RLS applies).
 */
function pageTypeFor(url: string | null): ContentPageType {
  if (!url) return "generic";
  if (/^\/ghiduri\//.test(url)) return "guide";
  if (/^\/cazinouri-online\/[^/]+\/[^/]+$/.test(url)) return "operator_evergreen";
  if (/^\/cazinouri-online\/[^/]+$/.test(url)) return "casino_review";
  if (/^\/bonusuri\/[^/]+$/.test(url)) return "bonus_category";
  return "generic";
}

/** Shared load + scope for a brief (used by both generation input and the fact-scoping diagnostic). */
async function assembleScopedBrief(projectId: string, briefId: string): Promise<{
  cb: ContentBrief;
  pageType: ContentPageType;
  enrichment: BriefEnrichment;
  scoped: ScopedContext;
  allFacts: CmsFact[];
  selectedFacts: CmsFact[];
  totalRelevant: number;
  confirmedEntityCount: number;
} | null> {
  const brief = await getBriefById(projectId, briefId);
  if (!brief) return null;

  const cb: ContentBrief = {
    title: brief.title ?? "",
    primaryKeyword: brief.primaryKeyword ?? "",
    secondaryKeywords: brief.secondaryKeywords,
    intent: brief.intent,
    targetUrl: brief.targetUrl,
    h1: brief.h1 ?? "",
    outline: brief.outline,
    entities: brief.entities,
    faq: brief.faq,
  };

  const [{ registry, relations, topical }, inventory, factRows] = await Promise.all([
    loadSemanticContext(),
    buildUrlInventory(), // published only → existing internal links
    loadCmsFactRows(), // AI-2.6: structured bonus/casino columns
  ]);
  const keywords = [cb.primaryKeyword, ...cb.secondaryKeywords, cb.title].filter(Boolean);
  const enrichment = enrichBrief({ keywords, existingEntities: brief.entities, targetUrl: brief.targetUrl }, registry, relations, topical);

  // AI-2.2: scope the context to the brief (not the whole CMS) to bound input tokens.
  // AI-2.6.1: scopeGenerationContext also reverse-discovers category entities (bonus_type → bonuses/casinos).
  const scoped = scopeGenerationContext(
    cb, enrichment, registry, relations,
    inventory.map((e) => ({ url: e.url, title: e.title, status: e.status })),
  );

  // AI-2.6: extract structured CMS facts, then scope them to the brief graph (never the whole CMS).
  const today = new Date().toISOString().slice(0, 10);
  const allFacts = buildCmsFacts(factRows, today);
  const { facts: selectedFacts, total: totalRelevant } = scopeCmsFacts(allFacts, scoped, DATA_CAPS.cmsFacts);

  return {
    cb,
    pageType: pageTypeFor(brief.targetUrl),
    enrichment,
    scoped,
    allFacts,
    selectedFacts,
    totalRelevant,
    confirmedEntityCount: cb.entities.filter((e) => e.source === "confirmed").length,
  };
}

export async function loadSectionGenerationInput(
  projectId: string,
  briefId: string,
  sectionId: string,
): Promise<ContentPromptInput | null> {
  const a = await assembleScopedBrief(projectId, briefId);
  if (!a) return null;

  // AI-2.9B: scope the author-knowledge to THIS section (deterministic, capped) — interpretation only.
  const section = listSections(a.cb).find((s) => s.id === sectionId);
  let authorKnowledge: AuthorKnowledge[] = [];
  if (section) {
    const relevantEntityIds = [...a.scoped.cmsEntities, ...a.scoped.discoveredEntities].map((e) => e.id);
    authorKnowledge = selectAuthorKnowledge(AUTHOR_KNOWLEDGE, {
      pageType: a.pageType,
      searchIntent: a.cb.intent,
      sectionKind: section.kind,
      sectionHeading: section.heading,
      primaryKeyword: a.cb.primaryKeyword,
      secondaryKeywords: a.cb.secondaryKeywords,
      relevantEntityIds,
    });
  }

  return {
    pageType: a.pageType,
    brief: a.cb,
    enrichment: a.enrichment,
    cmsEntities: a.scoped.cmsEntities,
    cmsRelations: a.scoped.cmsRelations,
    internalLinks: a.scoped.internalLinks,
    cmsFacts: a.selectedFacts,
    discoveredEntities: a.scoped.discoveredEntities, // AI-2.6.1: non-confirmed, for fact names only
    authorKnowledge, // AI-2.9B: scoped interpretation/guidance (never a factual source)
    sectionId,
  };
}

/**
 * AI-2.9D.2A (server-only): prepare the A/B experiment plan for one section — loads the REAL scoped
 * input (same path as generation) and builds both prompt variants, WITHOUT calling Anthropic. Returns
 * parity + token-delta metadata only (no full prompts, no secrets).
 */
export async function prepareSectionABExperiment(projectId: string, briefId: string, sectionId: string): Promise<ABExperimentPlan | null> {
  const input = await loadSectionGenerationInput(projectId, briefId, sectionId);
  if (!input) return null;
  return buildABExperiment(input);
}

/**
 * AI-2.6.1 (server-only) fact-scoping DIAGNOSTIC — no secrets, no prompt text. Returns the scoping
 * decision metadata for a brief (discovered/selected entities, available/excluded facts + reasons,
 * expired facts, empty-category flag) so an admin can see why a category did or did not get data.
 */
export async function loadFactScopingDiagnostic(projectId: string, briefId: string): Promise<FactScopingDiagnostic | null> {
  const a = await assembleScopedBrief(projectId, briefId);
  if (!a) return null;
  return buildFactScopingDiagnostic({
    pageType: a.pageType,
    targetUrl: a.cb.targetUrl,
    confirmedEntityCount: a.confirmedEntityCount,
    allFacts: a.allFacts,
    scoped: a.scoped,
    selectedFacts: a.selectedFacts,
    totalRelevant: a.totalRelevant,
  });
}
