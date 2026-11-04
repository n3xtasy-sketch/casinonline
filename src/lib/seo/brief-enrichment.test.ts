import { test } from "node:test";
import assert from "node:assert/strict";

import { buildEntityRegistry } from "@/lib/seo/entity-registry";
import { buildEntityRelations } from "@/lib/seo/entity-relations";
import { topicalCoverage } from "@/lib/seo/topical-coverage";
import { enrichBrief } from "@/lib/seo/brief-enrichment";
import { buildBriefDraft, mergeBriefDraft, mergeEntityLists, type BriefDraft, type BriefEntity, type BriefValues, type Provenance, type BriefClusterInput } from "@/lib/seo/brief";
import type { UrlEntry, UrlType } from "@/lib/db/url-inventory";

// ── fixtures ──────────────────────────────────────────────────────────────────
const REG = buildEntityRegistry({
  casinos: [
    { id: "u-sb", name: "Superbet Casino", slug: "superbet-casino", status: "published", license: "ONJN" },
    { id: "u-plain", name: "Plain Casino", slug: "plain-casino", status: "published", license: null }, // no relations
  ],
  bonuses: [{ id: "u-offer", offer: "Superbet 100% până la 1000 RON", slug: "superbet-bonus-bun-venit", status: "published" }],
  games: [{ id: "u-sweet", name: "Sweet Bonanza", slug: "sweet-bonanza", status: "published" }],
  providers: [{ id: "u-prag", name: "Pragmatic Play", slug: "pragmatic-play", status: "published" }],
  payments: [{ id: "u-skrill", name: "Skrill", slug: "skrill", status: "published" }],
  bonusTypes: [{ id: "u-nodep", label: "Fără depunere", slug: "fara-depunere" }],
  gameCategories: [],
  tags: [{ id: "u-tag", label: "Retrageri rapide", slug: "retrageri-rapide" }],
});
const BY_ID = new Map(REG.map((e) => [e.id, e] as const));
const KNOWN = new Set(REG.map((e) => e.id));
const REL = buildEntityRelations({
  bonuses: [{ id: "u-offer", casinoId: "u-sb", bonusTypeId: "u-nodep" }],
  casinoGames: [{ casinoId: "u-sb", gameId: "u-sweet" }],
  games: [{ id: "u-sweet", providerId: "u-prag" }],
  casinoPayments: [{ casinoId: "u-sb", paymentMethodId: "u-skrill" }],
  casinoTags: [{ casinoId: "u-sb", tagId: "u-tag" }],
  casinoLicenses: [{ casinoId: "u-sb", license: "ONJN" }],
}, KNOWN);

const u = (url: string, status: "existing" | "planned", type: UrlType = "casino"): UrlEntry => ({ url, type, title: url, source: "t", status });
const REVIEW = "/cazinouri-online/superbet-casino";
const OPERATOR = "/cazinouri-online/superbet-casino/bonus-fara-depunere";
const OFFER_URL = "/bonusuri-casino/superbet-bonus-bun-venit";
const TOPICAL = (inv: UrlEntry[]) => topicalCoverage(REL, BY_ID, inv);
const enrich = (keywords: string[], existing: BriefEntity[] = [], inv: UrlEntry[] = [u(REVIEW, "existing")], targetUrl?: string) =>
  enrichBrief({ keywords, existingEntities: existing, targetUrl }, REG, REL, TOPICAL(inv));
const relTypes = (recs: { relationType?: string }[]): string[] => [...new Set(recs.map((r) => r.relationType).filter((x): x is string => !!x))].sort();

// ════════════════════════ ENRICHMENT ENGINE ════════════════════════
test("resolves confirmed CMS entities from keywords", () => {
  const exact = enrich(["superbet casino"]).entities.find((x) => x.entityId === "casino:u-sb")!;
  assert.equal(exact.provenance, "confirmed_cms");
  assert.equal(exact.confidence, "high"); // exact name/slug match
  // a broader keyword still resolves the entity, at a lower (subset) confidence
  const broader = enrich(["superbet casino bonus fara depunere"]).entities.find((x) => x.entityId === "casino:u-sb")!;
  assert.equal(broader.confidence, "medium");
});

test("secondary topics distinguish verified_db from derived_cms", () => {
  const e = enrich(["superbet casino"]);
  const payment = e.secondaryTopics.find((x) => x.relationType === "casino_payment")!;
  const btype = e.secondaryTopics.find((x) => x.relationType === "casino_bonus_type")!;
  const license = e.secondaryTopics.find((x) => x.relationType === "casino_license")!;
  assert.equal(payment.provenance, "verified_db");
  assert.equal(btype.provenance, "derived_cms");
  assert.equal(license.provenance, "derived_cms");
});

test("FAQ questions only where a verified relation class exists; grounded, not invented", () => {
  const e = enrich(["superbet casino"]);
  assert.ok(e.questions.some((q) => /metode de plată acceptă Superbet Casino/.test(q.label))); // casino_payment exists
  assert.ok(e.questions.every((q) => q.provenance === "verified_db"));
  // Plain Casino has NO relations → no questions
  const plain = enrich(["plain casino"]);
  assert.equal(plain.questions.length, 0);
});

test("topical gaps exclude covered; candidate/planned are surfaced", () => {
  const withGap = enrich(["superbet casino"]); // review only → bonus_type candidate
  assert.ok(withGap.gaps.some((g) => g.relationType === "casino_bonus_type" && /candidate/.test(g.label)));
  const covered = enrich(["superbet casino"], [], [u(REVIEW, "existing"), u(OPERATOR, "existing", "bonus")]);
  assert.ok(!covered.gaps.some((g) => g.relationType === "casino_bonus_type")); // now covered → not a gap
});

test("alreadyInBrief marks entities present in the brief (no duplicate proposal)", () => {
  const existing: BriefEntity[] = [{ name: "Superbet Casino", type: "casino", source: "confirmed", ref: "/cazinouri-online/superbet-casino" }];
  const sb = enrich(["superbet casino"], existing).entities.find((x) => x.entityId === "casino:u-sb")!;
  assert.equal(sb.alreadyInBrief, true);
});

test("generic keyword resolves to nothing → no recommendations (scoping, no noise)", () => {
  const e = enrich(["cele mai bune cazinouri online"]);
  assert.equal(e.entities.length, 0);
  assert.equal(e.secondaryTopics.length, 0);
  assert.equal(e.gaps.length, 0);
});

test("missing registry/relations → empty enrichment, no crash", () => {
  assert.deepEqual(enrichBrief({ keywords: ["superbet"], existingEntities: [] }, [], [], []), { scope: "other", entities: [], secondaryTopics: [], questions: [], gaps: [] });
});

// ════════════════════════ KE-2C.1 EDITORIAL RELEVANCE FILTERING ════════════════════════
const KW = ["superbet bonus de bun venit", "superbet casino"]; // resolves the casino + offer + types

test("scope OFFER: only the offer type + operator; NO operator games/payments/tags/FAQ", () => {
  const e = enrich(KW, [], [u(REVIEW, "existing"), u(OFFER_URL, "existing", "bonus")], OFFER_URL);
  assert.equal(e.scope, "offer");
  // topics limited to the offer's type + the operator link
  assert.deepEqual(relTypes(e.secondaryTopics), ["bonus_bonus_type", "casino_bonus"]);
  assert.ok(e.secondaryTopics.some((t) => /Operator: Superbet Casino/.test(t.label)));
  // the reported bug: operator's payment/game/tag must NOT be recommended for an individual offer
  assert.ok(!e.secondaryTopics.some((t) => ["casino_payment", "casino_game", "casino_tag"].includes(t.relationType!)));
  assert.equal(e.questions.length, 0); // no operator-wide FAQ on an offer
});

test("scope REVIEW: bonuses/games/payment/license topics; internal TAGS are metadata (excluded)", () => {
  const e = enrich(KW, [], [u(REVIEW, "existing")], REVIEW);
  assert.equal(e.scope, "review");
  assert.ok(relTypes(e.secondaryTopics).includes("casino_payment"));
  assert.ok(relTypes(e.secondaryTopics).includes("casino_game"));
  assert.ok(relTypes(e.secondaryTopics).includes("casino_license"));
  assert.ok(!relTypes(e.secondaryTopics).includes("casino_tag")); // tags = metadata, not a topic
  assert.ok(e.questions.length > 0); // review gets operator FAQ
});

test("scope OPERATOR evergreen: bonus-focused topics; NO games/payments/tags", () => {
  const e = enrich(KW, [], [u(REVIEW, "existing"), u(OPERATOR, "existing", "bonus")], OPERATOR);
  assert.equal(e.scope, "operator");
  assert.ok(relTypes(e.secondaryTopics).every((t) => ["casino_bonus", "casino_bonus_type", "casino_license"].includes(t)));
  assert.ok(!relTypes(e.secondaryTopics).some((t) => ["casino_game", "casino_payment", "casino_tag"].includes(t)));
  // FAQ limited to bonus type / license (not payments/games)
  assert.ok(e.questions.every((q) => ["casino_bonus_type", "casino_license"].includes(q.relationType!)));
});

test("scope GENERAL category page: entity-level only, no operator relations/FAQ", () => {
  const e = enrich(KW, [], [u(REVIEW, "existing")], "/bonusuri/bonus-de-bun-venit");
  assert.equal(e.scope, "general");
  assert.equal(e.secondaryTopics.length, 0);
  assert.equal(e.questions.length, 0);
  assert.ok(e.entities.length > 0); // entities still surfaced
});

test("negative: an individual offer never recommends Skrill (operator payment) as a topic", () => {
  const e = enrich(KW, [], [u(REVIEW, "existing"), u(OFFER_URL, "existing", "bonus")], OFFER_URL);
  assert.ok(!e.secondaryTopics.some((t) => /Skrill/i.test(t.label)));
});

test("back-compat: no targetUrl → scope 'other' (keyword-driven expansion, tags still excluded)", () => {
  const e = enrich(["superbet casino"]);
  assert.equal(e.scope, "other");
  assert.ok(!relTypes(e.secondaryTopics).includes("casino_tag")); // tags excluded everywhere
});

test("enrichment is deterministic", () => {
  assert.deepEqual(enrich(["superbet casino"]), enrich(["superbet casino"]));
});

// ════════════════════════ KE-0 MERGE PROTECTION (regenerate) ════════════════════════
const PROV_ALL = (p: Provenance) => Object.fromEntries(["title", "primary_keyword", "secondary_keywords", "intent", "target_url", "h1", "outline", "entities", "faq"].map((f) => [f, p])) as Record<string, Provenance>;
function draft(entities: BriefEntity[]): BriefDraft {
  return {
    title: "Fresh", primaryKeyword: "fresh pk", secondaryKeywords: ["a"], intent: null, targetUrl: null, h1: "Fresh H1",
    outline: [], entities, faq: [], fieldProvenance: PROV_ALL("suggested"), reviewFlags: [],
    sources: { clusterId: null, importIds: [], generatedFrom: "cluster" },
  };
}
function existingValues(entities: BriefEntity[], prov: Record<string, Provenance>): BriefValues & { fieldProvenance: Record<string, Provenance> } {
  return { title: "Old", primaryKeyword: "old pk", secondaryKeywords: ["x"], intent: "commercial", targetUrl: "/u", h1: "Old H1", outline: [], entities, faq: [], fieldProvenance: prov };
}
const CONFIRMED: BriefEntity = { name: "Superbet Casino", type: "casino", source: "confirmed", ref: "/cazinouri-online/superbet-casino" };
const MANUAL_TERM: BriefEntity = { name: "verificare kyc", type: "termen", source: "suggested", ref: null };
const FRESH_TERM: BriefEntity = { name: "rotiri gratuite", type: "termen", source: "suggested", ref: null };

test("regenerate UNION-merges entities — confirmed + manual survive, fresh added (no overwrite)", () => {
  const r = mergeBriefDraft(existingValues([CONFIRMED, MANUAL_TERM], PROV_ALL("suggested")), draft([FRESH_TERM]), []);
  const names = r.values.entities.map((e) => e.name);
  assert.ok(names.includes("Superbet Casino")); // confirmed preserved
  assert.ok(names.includes("verificare kyc")); // manual-added preserved
  assert.ok(names.includes("rotiri gratuite")); // fresh added
  assert.ok(r.values.entities.find((e) => e.name === "Superbet Casino")!.source === "confirmed"); // source intact
});

test("regenerate dedupes entities (same ref not duplicated)", () => {
  const dupeFresh: BriefEntity = { name: "Superbet Casino", type: "casino", source: "suggested", ref: "/cazinouri-online/superbet-casino" };
  const r = mergeBriefDraft(existingValues([CONFIRMED], PROV_ALL("suggested")), draft([dupeFresh]), []);
  assert.equal(r.values.entities.filter((e) => e.ref === "/cazinouri-online/superbet-casino").length, 1);
  assert.equal(r.values.entities[0].source, "confirmed"); // existing wins
});

test("locked entities field fully preserved — fresh ignored", () => {
  const r = mergeBriefDraft(existingValues([CONFIRMED], PROV_ALL("suggested")), draft([FRESH_TERM]), ["entities"]);
  assert.deepEqual(r.values.entities, [CONFIRMED]); // locked → untouched
});

test("manual-provenance entities field preserved as-is", () => {
  const prov = { ...PROV_ALL("suggested"), entities: "manual" as Provenance };
  const r = mergeBriefDraft(existingValues([CONFIRMED, MANUAL_TERM], prov), draft([FRESH_TERM]), []);
  assert.deepEqual(r.values.entities, [CONFIRMED, MANUAL_TERM]);
});

test("old KE-0 brief (entities provenance 'suggested') still preserves confirmed across regenerate", () => {
  const r = mergeBriefDraft(existingValues([CONFIRMED], PROV_ALL("suggested")), draft([FRESH_TERM]), []);
  assert.ok(r.values.entities.some((e) => e.source === "confirmed" && e.name === "Superbet Casino"));
});

test("backward-compat: non-entities fields keep KE-0 merge semantics", () => {
  // not locked/manual → refreshed from fresh
  const refreshed = mergeBriefDraft(existingValues([], PROV_ALL("suggested")), draft([]), []);
  assert.equal(refreshed.values.title, "Fresh");
  assert.equal(refreshed.values.h1, "Fresh H1");
  // manual title → preserved
  const prov = { ...PROV_ALL("suggested"), title: "manual" as Provenance };
  const kept = mergeBriefDraft(existingValues([], prov), draft([]), []);
  assert.equal(kept.values.title, "Old");
});

test("mergeEntityLists: empty sides + dedupe", () => {
  assert.deepEqual(mergeEntityLists([], [FRESH_TERM]), [FRESH_TERM]);
  assert.deepEqual(mergeEntityLists([CONFIRMED], []), [CONFIRMED]);
  assert.equal(mergeEntityLists([MANUAL_TERM], [MANUAL_TERM]).length, 1); // name+type dedupe
});

// ── KE-2C risk analysis (A/B/C) — pinned behavior ──────────────────────────────
test("KE-2C risk A: a removed suggested entity REAPPEARS on regenerate (no persisted rejection) unless locked", () => {
  const afterRemoval = existingValues([CONFIRMED], PROV_ALL("suggested")); // editor removed FRESH_TERM
  const regen = mergeBriefDraft(afterRemoval, draft([FRESH_TERM]), []); // generator still yields it
  assert.ok(regen.values.entities.some((e) => e.name === "rotiri gratuite")); // reappears
  const locked = mergeBriefDraft(afterRemoval, draft([FRESH_TERM]), ["entities"]);
  assert.ok(!locked.values.entities.some((e) => e.name === "rotiri gratuite")); // lock prevents it
});

test("KE-2C risk B: a slug rename does NOT duplicate a confirmed entity (keyed on name+type, not ref)", () => {
  const oldRef: BriefEntity = { name: "Superbet Casino", type: "casino", source: "confirmed", ref: "/cazinouri-online/superbet-casino" };
  const newRef: BriefEntity = { name: "Superbet Casino", type: "casino", source: "suggested", ref: "/cazinouri-online/superbet-ro" };
  const merged = mergeEntityLists([oldRef], [newRef]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].source, "confirmed"); // existing wins
});

test("KE-2C risk C: identical name+type dedupe to one (existing precedence, case-insensitive)", () => {
  const a: BriefEntity = { name: "Skrill", type: "payment", source: "confirmed", ref: "/metode-de-plata/skrill" };
  const b: BriefEntity = { name: "skrill", type: "payment", source: "suggested", ref: null };
  const merged = mergeEntityLists([a], [b]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].source, "confirmed");
});

// ════════════════════════ KE-0 compatibility (unchanged generation) ════════════════════════
test("buildBriefDraft still emits suggested lexical entities (KE-0 behavior intact)", () => {
  const input: BriefClusterInput = {
    clusterId: "c1", clusterName: "Bonus", clusterPrimaryKeyword: null, clusterIntent: null,
    keywords: [
      { id: "k1", keyword: "bonus rotiri gratuite", normalized: "bonus rotiri gratuite", intent: null, volume: 10, parentTopic: null },
      { id: "k2", keyword: "rotiri gratuite casino", normalized: "rotiri gratuite casino", intent: null, volume: 5, parentTopic: null },
    ],
    mapping: { url: null, status: "none" }, importIds: [],
  };
  const d = buildBriefDraft(input, []);
  assert.ok(d.entities.some((e) => e.source === "suggested")); // df≥2 lexical term, e.g. "rotiri"/"gratuite"
  assert.equal(d.fieldProvenance.entities, "suggested"); // field provenance unchanged
});
