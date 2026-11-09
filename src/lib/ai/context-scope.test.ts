import { test } from "node:test";
import assert from "node:assert/strict";
import { scopeGenerationContext, type InventoryUrl } from "@/lib/ai/context-scope";
import type { ContentBrief } from "@/lib/ai/content-prompt";
import type { EntityRecord } from "@/lib/seo/entity-registry";
import type { EntityRelation } from "@/lib/seo/entity-relations";
import type { BriefEnrichment } from "@/lib/seo/brief-enrichment";

const reg = (id: string, name: string, url: string): EntityRecord =>
  ({ id, type: "casino", cmsId: id.split(":")[1], name, slug: url.split("/").pop()!, aliases: [], status: "published", publicUrl: url, provenance: "cms", attributes: {} });

const REGISTRY: EntityRecord[] = [
  reg("casino:sb", "Superbet Casino", "/cazinouri-online/superbet-casino"),
  reg("casino:nb", "Netbet Casino", "/cazinouri-online/netbet-casino"),
  reg("casino:un", "Unrelated Casino", "/cazinouri-online/unrelated-casino"), // not relevant
];
const RELATIONS: EntityRelation[] = [
  { sourceEntityId: "casino:sb", targetEntityId: "payment:x", relationType: "casino_payment", provenance: "verified_db", confidence: "high", reasons: [] },
  { sourceEntityId: "casino:un", targetEntityId: "payment:y", relationType: "casino_payment", provenance: "verified_db", confidence: "high", reasons: [] }, // unrelated
];
const INVENTORY: InventoryUrl[] = [
  { url: "/cazinouri-online/superbet-casino", title: "Superbet", status: "existing" },
  { url: "/cazinouri-online/netbet-casino", title: "Netbet", status: "existing" },
  { url: "/cazinouri-online/unrelated-casino", title: "Unrelated", status: "existing" },
  { url: "/bonusuri/fara-depunere", title: "Fara depunere", status: "existing" },
  { url: "/bonusuri/draft-only", title: "Draft", status: "planned" }, // not existing
];
const BRIEF: ContentBrief = {
  title: "Bonus fara depunere Superbet", primaryKeyword: "bonus fara depunere superbet", secondaryKeywords: [],
  intent: null, targetUrl: "/bonusuri/fara-depunere", h1: "H1",
  outline: [], faq: [],
  entities: [{ name: "Superbet Casino", type: "casino", source: "confirmed", ref: "/cazinouri-online/superbet-casino" }],
};
const ENRICHMENT: BriefEnrichment = {
  scope: "general", entities: [{ id: "e", type: "entity", label: "Netbet", provenance: "confirmed_cms", confidence: "high", reasons: [], entityId: "casino:nb" }],
  secondaryTopics: [], questions: [], gaps: [],
};

test("scope keeps brief-relevant entities (confirmed + enrichment), drops unrelated", () => {
  const s = scopeGenerationContext(BRIEF, ENRICHMENT, REGISTRY, RELATIONS, INVENTORY);
  const ids = s.cmsEntities.map((e) => e.id).sort();
  assert.deepEqual(ids, ["casino:nb", "casino:sb"]); // superbet (brief) + netbet (enrichment); NOT unrelated
});

test("scope keeps only relations whose source is relevant", () => {
  const s = scopeGenerationContext(BRIEF, ENRICHMENT, REGISTRY, RELATIONS, INVENTORY);
  assert.equal(s.cmsRelations.length, 1);
  assert.equal(s.cmsRelations[0].sourceEntityId, "casino:sb");
});

test("scope links: relevant-entity pages + brief target + keyword match; only 'existing'; capped", () => {
  const s = scopeGenerationContext(BRIEF, ENRICHMENT, REGISTRY, RELATIONS, INVENTORY, { maxLinks: 20 });
  const urls = s.internalLinks.map((l) => l.url);
  assert.ok(urls.includes("/cazinouri-online/superbet-casino")); // relevant entity
  assert.ok(urls.includes("/bonusuri/fara-depunere")); // brief target + keyword match
  assert.ok(!urls.includes("/cazinouri-online/unrelated-casino")); // unrelated entity not linked
  assert.ok(!urls.includes("/bonusuri/draft-only")); // not published
});

test("scope respects maxLinks cap", () => {
  const s = scopeGenerationContext(BRIEF, ENRICHMENT, REGISTRY, RELATIONS, INVENTORY, { maxLinks: 1 });
  assert.equal(s.internalLinks.length, 1);
});
