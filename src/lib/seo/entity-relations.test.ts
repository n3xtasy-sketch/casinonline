import { test } from "node:test";
import assert from "node:assert/strict";

import { buildEntityRegistry, type RegistryInput, type EntityRecord } from "@/lib/seo/entity-registry";
import { buildEntityRelations, relationsBySource, licenseEntityId, type RelationInput } from "@/lib/seo/entity-relations";
import { topicalCoverage } from "@/lib/seo/topical-coverage";
import type { UrlEntry, UrlType } from "@/lib/db/url-inventory";

// ── fixtures (mirror real DEV shapes) ─────────────────────────────────────────────
const REG_INPUT: RegistryInput = {
  casinos: [
    { id: "u-sb", name: "Superbet Casino", slug: "superbet-casino", status: "published", license: "ONJN" },
    { id: "u-prima", name: "Prima Test Casino", slug: "prima-test-casino", status: "draft", license: null },
  ],
  bonuses: [{ id: "u-offer", offer: "Superbet 100% până la 1000 RON", slug: "superbet-bonus-bun-venit", status: "published" }],
  games: [{ id: "u-sweet", name: "Sweet Bonanza", slug: "sweet-bonanza", status: "published" }],
  providers: [{ id: "u-prag", name: "Pragmatic Play", slug: "pragmatic-play", status: "published" }],
  payments: [{ id: "u-skrill", name: "Skrill", slug: "skrill", status: "published" }],
  bonusTypes: [
    { id: "u-nodep", label: "Fără depunere", slug: "fara-depunere" },
    { id: "u-cashback", label: "Cashback", slug: "cashback" },
  ],
  gameCategories: [],
  tags: [{ id: "u-fast", label: "Retrageri rapide", slug: "retrageri-rapide" }],
};
const REG: EntityRecord[] = buildEntityRegistry(REG_INPUT);
const KNOWN = new Set(REG.map((e) => e.id));
const byId = new Map(REG.map((e) => [e.id, e] as const));

const REL_INPUT: RelationInput = {
  bonuses: [{ id: "u-offer", casinoId: "u-sb", bonusTypeId: "u-nodep" }],
  casinoGames: [{ casinoId: "u-sb", gameId: "u-sweet" }],
  games: [{ id: "u-sweet", providerId: "u-prag" }],
  casinoPayments: [{ casinoId: "u-sb", paymentMethodId: "u-skrill" }],
  casinoTags: [{ casinoId: "u-sb", tagId: "u-fast" }],
  casinoLicenses: [{ casinoId: "u-sb", license: "ONJN" }],
};
const REL = buildEntityRelations(REL_INPUT, KNOWN);
const find = (type: string, tgt?: string) => REL.find((r) => r.relationType === type && (tgt ? r.targetEntityId === tgt : true));

function uentry(url: string, status: "existing" | "planned", type: UrlType = "casino"): UrlEntry {
  return { url, type, title: url, source: "test", status };
}

// ════════════════════════════ RELATION ENGINE ════════════════════════════
test("verified_db for FKs/junctions; derived_cms for join + license; nothing mislabeled", () => {
  assert.equal(find("casino_bonus")!.provenance, "verified_db");
  assert.equal(find("casino_game")!.provenance, "verified_db");
  assert.equal(find("game_provider")!.provenance, "verified_db");
  assert.equal(find("casino_payment")!.provenance, "verified_db");
  assert.equal(find("casino_tag")!.provenance, "verified_db");
  assert.equal(find("bonus_bonus_type")!.provenance, "verified_db");
  assert.equal(find("casino_bonus_type")!.provenance, "derived_cms"); // 2-hop join, NOT a single FK
  assert.equal(find("casino_license")!.provenance, "derived_cms"); // column value, NOT verified_db
  assert.ok(!REL.some((r) => r.provenance === "inferred_rule")); // nothing inferred in KE-2B
});

test("relations use KE-2A entity ids; license → pseudo-entity id", () => {
  assert.equal(find("casino_bonus")!.sourceEntityId, "casino:u-sb");
  assert.equal(find("casino_bonus")!.targetEntityId, "bonus:u-offer");
  assert.equal(find("casino_payment")!.targetEntityId, "payment:u-skrill");
  assert.equal(find("casino_license")!.targetEntityId, licenseEntityId("ONJN"));
  assert.equal(licenseEntityId("ONJN"), "license:onjn");
});

test("orphan FK references are dropped when known ids are provided (kept otherwise)", () => {
  const withGhost: RelationInput = { ...REL_INPUT, casinoGames: [{ casinoId: "u-sb", gameId: "ghost" }] };
  assert.ok(!buildEntityRelations(withGhost, KNOWN).some((r) => r.relationType === "casino_game")); // orphan dropped
  assert.ok(buildEntityRelations(withGhost).some((r) => r.relationType === "casino_game")); // no filter → kept
});

test("dedup: repeated bonus of same type → single casino_bonus_type; determinism", () => {
  const dupe: RelationInput = { ...REL_INPUT, bonuses: [
    { id: "u-offer", casinoId: "u-sb", bonusTypeId: "u-nodep" },
    { id: "u-offer2", casinoId: "u-sb", bonusTypeId: "u-nodep" },
  ] };
  const r = buildEntityRelations(dupe); // unfiltered: both offers kept, type relation de-duped
  assert.equal(r.filter((x) => x.relationType === "casino_bonus_type").length, 1);
  assert.equal(r.filter((x) => x.relationType === "casino_bonus").length, 2); // two distinct offers
  assert.deepEqual(buildEntityRelations(dupe), r); // deterministic
});

test("missing relations: empty input yields no relations, no crash", () => {
  const empty: RelationInput = { bonuses: [], casinoGames: [], games: [], casinoPayments: [], casinoTags: [], casinoLicenses: [] };
  assert.deepEqual(buildEntityRelations(empty, KNOWN), []);
});

test("relationsBySource groups by source id", () => {
  assert.ok((relationsBySource(REL).get("casino:u-sb")?.length ?? 0) >= 4);
});

// ════════════════════════════ TOPICAL COVERAGE ════════════════════════════
const REVIEW = "/cazinouri-online/superbet-casino";
const OPERATOR_NODEP = "/cazinouri-online/superbet-casino/bonus-fara-depunere";
const OFFER = "/bonusuri-casino/superbet-bonus-bun-venit";
const cov = (rel: typeof REL, inv: UrlEntry[]) => topicalCoverage(rel, byId, inv);
const rowFor = (inv: UrlEntry[], type: string, tgt?: string) =>
  cov(REL, inv).find((r) => r.relation.relationType === type && (tgt ? r.targetEntityId === tgt : true))!;

test("verified relation, topic NOT editorially proven → candidate (NOT covered) when container published", () => {
  const r = rowFor([uentry(REVIEW, "existing")], "casino_payment");
  assert.equal(r.state, "candidate");
  assert.equal(r.editorialAction, "expand_section");
  assert.notEqual(r.state, "covered"); // a published review does NOT prove the payment is explained
});

test("section relation with NO container page → identified/investigate", () => {
  const r = rowFor([], "casino_payment");
  assert.equal(r.state, "identified");
  assert.equal(r.editorialAction, "investigate");
});

test("published page is not treated as covering every relation (game/tag/license all ≤ candidate)", () => {
  const rows = cov(REL, [uentry(REVIEW, "existing")]);
  for (const t of ["casino_game", "casino_tag", "casino_license"]) {
    const r = rows.find((x) => x.relation.relationType === t)!;
    assert.notEqual(r.state, "covered");
    assert.equal(r.state, "candidate");
  }
});

test("dedicated operator DRAFT page → planned", () => {
  const r = rowFor([uentry(REVIEW, "existing"), uentry(OPERATOR_NODEP, "planned")], "casino_bonus_type");
  assert.equal(r.state, "planned");
  assert.equal(r.editorialAction, "publish_draft");
  assert.equal(r.dedicatedUrl, OPERATOR_NODEP);
  assert.equal(r.dedicatedScope, "operator");
});

test("dedicated operator PUBLISHED page → covered (explicit evidence)", () => {
  const r = rowFor([uentry(REVIEW, "existing"), uentry(OPERATOR_NODEP, "existing")], "casino_bonus_type");
  assert.equal(r.state, "covered");
  assert.equal(r.editorialAction, "review_existing");
  assert.equal(r.dedicatedScope, "operator");
});

test("evergreen topic, no operator page but review published → candidate/expand_section (no new page)", () => {
  const r = rowFor([uentry(REVIEW, "existing")], "casino_bonus_type");
  assert.equal(r.state, "candidate");
  assert.equal(r.editorialAction, "expand_section");
});

test("evergreen topic, no operator page and no review → gap/investigate, NOT consider_new_page", () => {
  const r = rowFor([], "casino_bonus_type");
  assert.equal(r.state, "gap");
  assert.equal(r.editorialAction, "investigate"); // intent/demand unknown → no auto new URL
});

test("offer page published → covered (offer scope); draft → planned; missing → identified", () => {
  assert.equal(rowFor([uentry(OFFER, "existing", "bonus")], "casino_bonus").state, "covered");
  assert.equal(rowFor([uentry(OFFER, "existing", "bonus")], "casino_bonus").dedicatedScope, "offer");
  assert.equal(rowFor([uentry(OFFER, "planned", "bonus")], "casino_bonus").state, "planned");
  assert.equal(rowFor([], "casino_bonus").state, "identified");
});

test("intent unknown → engine NEVER emits consider_new_page", () => {
  const everything = cov(REL, [uentry(REVIEW, "existing"), uentry(OFFER, "planned", "bonus")]);
  assert.ok(!everything.some((r) => r.editorialAction === "consider_new_page"));
});

test("orphan relation (target not in registry) → ambiguous/investigate", () => {
  const ghostRel = buildEntityRelations({ ...REL_INPUT, casinoGames: [{ casinoId: "u-sb", gameId: "ghost" }] }); // unfiltered
  const r = topicalCoverage(ghostRel, byId, [uentry(REVIEW, "existing")]).find((x) => x.relation.relationType === "casino_game" && x.targetEntityId === "game:ghost")!;
  assert.equal(r.state, "ambiguous");
  assert.equal(r.editorialAction, "investigate");
});

test("compat: topical rows are deterministic and reuse KE-1 pageScope semantics", () => {
  const inv = [uentry(REVIEW, "existing"), uentry(OPERATOR_NODEP, "existing"), uentry(OFFER, "existing", "bonus")];
  assert.deepEqual(cov(REL, inv), cov(REL, inv));
  // operator + offer dedicated urls classify to their KE-1 scopes
  assert.equal(rowFor(inv, "casino_bonus_type").dedicatedScope, "operator");
  assert.equal(rowFor(inv, "casino_bonus").dedicatedScope, "offer");
});
