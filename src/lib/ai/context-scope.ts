/**
 * AI-2.2 context scoping — PURE, no I/O. Reduces the generation input from the WHOLE CMS graph /
 * URL inventory down to the subset RELEVANT to the brief, without dropping grounding: the KE-2
 * enrichment already resolves the brief-relevant entities/relations; we keep those + the brief's own
 * confirmed entities, their relations, and a capped set of relevant internal links. This is what
 * cut the ~9548-token input (the loader previously passed the entire registry + every published URL).
 */

import type { BriefEnrichment } from "@/lib/seo/brief-enrichment";
import type { EntityRecord } from "@/lib/seo/entity-registry";
import type { EntityRelation } from "@/lib/seo/entity-relations";
import type { ContentBrief, InternalLink } from "@/lib/ai/content-prompt";

export interface InventoryUrl {
  url: string;
  title: string;
  status: string;
}

export interface ScopedContext {
  cmsEntities: EntityRecord[];
  cmsRelations: EntityRelation[];
  internalLinks: InternalLink[];
}

export function scopeGenerationContext(
  brief: ContentBrief,
  enrichment: BriefEnrichment | null,
  registry: EntityRecord[],
  relations: EntityRelation[],
  inventory: InventoryUrl[],
  opts: { maxLinks?: number } = {},
): ScopedContext {
  const maxLinks = opts.maxLinks ?? 20;

  // Relevant entity ids: KE-2 enrichment (entities + secondary-topic endpoints) + brief confirmed.
  const relevant = new Set<string>();
  for (const e of enrichment?.entities ?? []) if (e.entityId) relevant.add(e.entityId);
  for (const t of enrichment?.secondaryTopics ?? []) { if (t.entityId) relevant.add(t.entityId); if (t.targetEntityId) relevant.add(t.targetEntityId); }
  const byUrl = new Map(registry.filter((r) => r.publicUrl).map((r) => [r.publicUrl as string, r.id] as const));
  const byName = new Map(registry.map((r) => [r.name.toLowerCase(), r.id] as const));
  for (const be of brief.entities) {
    if (be.source !== "confirmed") continue;
    const id = (be.ref && byUrl.get(be.ref)) || byName.get(be.name.toLowerCase());
    if (id) relevant.add(id);
  }

  const cmsEntities = registry.filter((e) => relevant.has(e.id));
  const cmsRelations = relations.filter((r) => relevant.has(r.sourceEntityId));

  // Internal links: relevant entities' pages + the brief target + keyword-relevant pages, capped.
  const invExisting = new Map(inventory.filter((i) => i.status === "existing").map((i) => [i.url, i] as const));
  const links: InternalLink[] = [];
  const add = (url: string, title: string) => {
    const inv = invExisting.get(url);
    if (inv && !links.some((l) => l.url === url)) links.push({ url, title: inv.title || title });
  };
  for (const e of cmsEntities) if (e.publicUrl) add(e.publicUrl, e.name);
  if (brief.targetUrl) add(brief.targetUrl, brief.title || brief.targetUrl);
  if (links.length < maxLinks) {
    const kwTokens = new Set(
      [brief.primaryKeyword, ...brief.secondaryKeywords].flatMap((k) => k.toLowerCase().split(/\s+/)).filter((w) => w.length >= 4),
    );
    for (const i of inventory) {
      if (i.status !== "existing" || links.some((l) => l.url === i.url)) continue;
      const slugTokens = (i.url.split("/").filter(Boolean).pop() ?? "").split("-");
      if (slugTokens.some((t) => kwTokens.has(t))) {
        links.push({ url: i.url, title: i.title });
        if (links.length >= maxLinks) break;
      }
    }
  }

  return { cmsEntities, cmsRelations, internalLinks: links.slice(0, maxLinks) };
}
