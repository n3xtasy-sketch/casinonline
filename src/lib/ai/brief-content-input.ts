import "server-only";
import { getBriefById } from "@/lib/db/admin-seo-briefs";
import { loadSemanticContext } from "@/lib/db/admin-relations";
import { enrichBrief } from "@/lib/seo/brief-enrichment";
import { buildUrlInventory } from "@/lib/db/url-inventory";
import { scopeGenerationContext } from "@/lib/ai/context-scope";
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

export async function loadSectionGenerationInput(
  projectId: string,
  briefId: string,
  sectionId: string,
): Promise<ContentPromptInput | null> {
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

  const [{ registry, relations, topical }, inventory] = await Promise.all([
    loadSemanticContext(),
    buildUrlInventory(), // published only → existing internal links
  ]);
  const keywords = [cb.primaryKeyword, ...cb.secondaryKeywords, cb.title].filter(Boolean);
  const enrichment = enrichBrief({ keywords, existingEntities: brief.entities, targetUrl: brief.targetUrl }, registry, relations, topical);

  // AI-2.2: scope the context to the brief (not the whole CMS) to bound input tokens.
  const scoped = scopeGenerationContext(
    cb, enrichment, registry, relations,
    inventory.map((e) => ({ url: e.url, title: e.title, status: e.status })),
  );

  return {
    pageType: pageTypeFor(brief.targetUrl),
    brief: cb,
    enrichment,
    cmsEntities: scoped.cmsEntities,
    cmsRelations: scoped.cmsRelations,
    internalLinks: scoped.internalLinks,
    sectionId,
  };
}
