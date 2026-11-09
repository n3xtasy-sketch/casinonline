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

// ════════════════════════ AI-2.6.1 REVERSE (BIDIRECTIONAL) DISCOVERY ════════════════════════
const ent = (id: string, type: EntityRecord["type"], name: string, url: string | null): EntityRecord =>
  ({ id, type, cmsId: id.split(":")[1], name, slug: (url ?? name).split("/").pop()!, aliases: [], status: url ? "published" : "taxonomy", publicUrl: url, provenance: "cms", attributes: {} });

// A bonus_type category anchor (taxonomy, publicUrl null) + the bonuses/casinos that HAVE it.
const CAT_REGISTRY: EntityRecord[] = [
  ent("bonus_type:nodep", "bonus_type", "Bonus fara depunere", null),
  ent("bonus:b1", "bonus", "Bonus Netbet fara depunere", "/bonusuri-casino/netbet-nodep"),
  ent("casino:c1", "casino", "Netbet Casino", "/cazinouri-online/netbet-casino"),
  ent("bonus:bOther", "bonus", "Bonus depunere Netbet", "/bonusuri-casino/netbet-dep"),
  ent("bonus_type:other", "bonus_type", "Bonus cu depunere", null),
];
const rel = (s: string, t: string, type: EntityRelation["relationType"], prov: EntityRelation["provenance"]): EntityRelation =>
  ({ sourceEntityId: s, targetEntityId: t, relationType: type, provenance: prov, confidence: "high", reasons: [] });
const CAT_RELATIONS: EntityRelation[] = [
  rel("bonus:b1", "bonus_type:nodep", "bonus_bonus_type", "verified_db"),   // b1 IS a no-deposit bonus
  rel("casino:c1", "bonus_type:nodep", "casino_bonus_type", "derived_cms"), // c1 OFFERS no-deposit bonuses
  rel("casino:c1", "bonus:bOther", "casino_bonus", "verified_db"),          // c1 also has a non-category bonus
  rel("bonus:bOther", "bonus_type:other", "bonus_bonus_type", "verified_db"), // bOther is a different type
];
// Category brief: NO confirmed entities; keyword resolved only to the bonus_type anchor.
const CAT_BRIEF: ContentBrief = {
  title: "Bonus fara depunere la cazinouri online", primaryKeyword: "bonus fara depunere casino", secondaryKeywords: [],
  intent: null, targetUrl: "/bonusuri/bonus-fara-depunere", h1: "H1", outline: [], faq: [], entities: [],
};
const CAT_ENRICH: BriefEnrichment = {
  scope: "general", entities: [{ id: "e", type: "entity", label: "Bonus fara depunere", provenance: "confirmed_cms", confidence: "high", reasons: [], entityId: "bonus_type:nodep" }],
  secondaryTopics: [], questions: [], gaps: [],
};

test("reverse discovery: a bonus_type category discovers its bonuses + casinos (no confirmed entities)", () => {
  const s = scopeGenerationContext(CAT_BRIEF, CAT_ENRICH, CAT_REGISTRY, CAT_RELATIONS, []);
  const disc = s.discoveredEntities.map((e) => e.id).sort();
  assert.deepEqual(disc, ["bonus:b1", "casino:c1"]); // discovered via reverse relations
  // discovered entities are kept OUT of cmsEntities (stay non-confirmed / non-mentionable)
  assert.ok(!s.cmsEntities.some((e) => e.id === "bonus:b1" || e.id === "casino:c1"));
  assert.deepEqual(s.cmsEntities.map((e) => e.id), ["bonus_type:nodep"]);
  // reverse relations are surfaced for fact scoping
  assert.ok(s.cmsRelations.some((r) => r.sourceEntityId === "bonus:b1" && r.relationType === "bonus_bonus_type"));
  assert.ok(s.cmsRelations.some((r) => r.sourceEntityId === "casino:c1" && r.relationType === "casino_bonus_type"));
});

test("reverse discovery does NOT forward-expand a discovered casino to its non-category bonuses", () => {
  const s = scopeGenerationContext(CAT_BRIEF, CAT_ENRICH, CAT_REGISTRY, CAT_RELATIONS, []);
  // bOther is a bonus of casino c1 but of a DIFFERENT type → must not be discovered
  assert.ok(!s.discoveredEntities.some((e) => e.id === "bonus:bOther"));
  assert.ok(!s.cmsRelations.some((r) => r.sourceEntityId === "casino:c1" && r.relationType === "casino_bonus"));
});

test("category with no relations → no discovery (empty category)", () => {
  const s = scopeGenerationContext(CAT_BRIEF, CAT_ENRICH, CAT_REGISTRY, [], []);
  assert.deepEqual(s.discoveredEntities, []);
});

test("duplicate reverse relations are deduped", () => {
  const dup = [...CAT_RELATIONS, rel("bonus:b1", "bonus_type:nodep", "bonus_bonus_type", "verified_db")];
  const s = scopeGenerationContext(CAT_BRIEF, CAT_ENRICH, CAT_REGISTRY, dup, []);
  const b1Rels = s.cmsRelations.filter((r) => r.sourceEntityId === "bonus:b1" && r.relationType === "bonus_bonus_type");
  assert.equal(b1Rels.length, 1);
  assert.equal(s.discoveredEntities.filter((e) => e.id === "bonus:b1").length, 1);
});

test("reverse discovery respects maxDiscovered cap (no unbounded CMS injection)", () => {
  const manyReg: EntityRecord[] = [ent("bonus_type:nodep", "bonus_type", "Bonus fara depunere", null)];
  const manyRel: EntityRelation[] = [];
  for (let i = 0; i < 60; i++) {
    manyReg.push(ent(`bonus:x${i}`, "bonus", `Bonus ${i}`, `/bonusuri-casino/x${i}`));
    manyRel.push(rel(`bonus:x${i}`, "bonus_type:nodep", "bonus_bonus_type", "verified_db"));
  }
  const s = scopeGenerationContext(CAT_BRIEF, CAT_ENRICH, manyReg, manyRel, [], { maxDiscovered: 10 });
  assert.equal(s.discoveredEntities.length, 10);
});

test("brief WITH a confirmed entity: confirmed stays in cmsEntities, discovery is additive + separate", () => {
  const brief: ContentBrief = { ...CAT_BRIEF, entities: [{ name: "Netbet Casino", type: "casino", source: "confirmed", ref: "/cazinouri-online/netbet-casino" }] };
  const s = scopeGenerationContext(brief, CAT_ENRICH, CAT_REGISTRY, CAT_RELATIONS, []);
  assert.ok(s.cmsEntities.some((e) => e.id === "casino:c1")); // confirmed → in cmsEntities (mentionable)
  // c1 now confirmed, so it is NOT also listed as discovered (already in scope)
  assert.ok(!s.discoveredEntities.some((e) => e.id === "casino:c1"));
  assert.ok(s.discoveredEntities.some((e) => e.id === "bonus:b1")); // the bonus still discovered
});
