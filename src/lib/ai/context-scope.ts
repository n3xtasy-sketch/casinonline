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
  /** AI-2.6.1: entities reached by REVERSE discovery (e.g. the bonuses/casinos that HAVE a relevant
   *  bonus_type). Kept SEPARATE from cmsEntities so they never silently become confirmed/mentionable —
   *  they only surface their facts + resolve relation-triple names. */
  discoveredEntities: EntityRecord[];
}

/**
 * AI-2.6.1 — relation types whose TARGET is a taxonomy anchor (bonus_type / tag). Reverse discovery is
 * limited to exactly these, so a bonus-category page can reach the bonuses/casinos that actually have
 * that type. NO inferred/unsupported relation is created. `casino_bonus_type` means the casino has AT
 * LEAST ONE bonus of the type — we surface the casino (license), but NEVER forward-expand it to all its
 * bonuses (that would wrongly treat every bonus of the casino as belonging to the category).
 */
const REVERSE_DISCOVERY_TYPES = new Set(["bonus_bonus_type", "casino_bonus_type", "casino_tag"]);

export function scopeGenerationContext(
  brief: ContentBrief,
  enrichment: BriefEnrichment | null,
  registry: EntityRecord[],
  relations: EntityRelation[],
  inventory: InventoryUrl[],
  opts: { maxLinks?: number; maxDiscovered?: number } = {},
): ScopedContext {
  const maxLinks = opts.maxLinks ?? 20;
  const maxDiscovered = opts.maxDiscovered ?? 40;

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
  const forwardRelations = relations.filter((r) => relevant.has(r.sourceEntityId));

  // ── AI-2.6.1 REVERSE DISCOVERY ──────────────────────────────────────────────────
  // For relevant anchors that are relation TARGETS (never sources — e.g. bonus_type/tag), pull in the
  // SOURCE entities of the allowed reverse-relation types. One hop only (no recursion), deduped, capped.
  const reverseBySource = new Map<string, EntityRelation[]>();
  for (const r of relations) {
    if (!REVERSE_DISCOVERY_TYPES.has(r.relationType)) continue;
    if (!relevant.has(r.targetEntityId) || relevant.has(r.sourceEntityId)) continue; // target is an anchor; source not already in scope
    const list = reverseBySource.get(r.sourceEntityId) ?? [];
    list.push(r);
    reverseBySource.set(r.sourceEntityId, list);
  }
  const discoveredIds = [...reverseBySource.keys()].sort().slice(0, maxDiscovered);
  const discoveredSet = new Set(discoveredIds);
  const discoveredEntities = registry.filter((e) => discoveredSet.has(e.id));
  const reverseRelations = discoveredIds.flatMap((id) => reverseBySource.get(id) ?? []);

  // Merge forward + reverse relations, deduped by (source|type|target), deterministic order.
  const relSeen = new Set<string>();
  const cmsRelations: EntityRelation[] = [];
  for (const r of [...forwardRelations, ...reverseRelations]) {
    const key = `${r.sourceEntityId}|${r.relationType}|${r.targetEntityId}`;
    if (relSeen.has(key)) continue;
    relSeen.add(key);
    cmsRelations.push(r);
  }
  cmsRelations.sort((a, b) => a.sourceEntityId.localeCompare(b.sourceEntityId) || a.relationType.localeCompare(b.relationType) || a.targetEntityId.localeCompare(b.targetEntityId));

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

  return { cmsEntities, cmsRelations, internalLinks: links.slice(0, maxLinks), discoveredEntities };
}
