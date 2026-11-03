import { test } from "node:test";
import assert from "node:assert/strict";

import { buildEntityRegistry } from "@/lib/seo/entity-registry";
import { buildEntityRelations } from "@/lib/seo/entity-relations";
import { topicalCoverage } from "@/lib/seo/topical-coverage";
import { buildEntityDashboard, filterEntityRows, entityTypeFacets } from "@/lib/seo/entity-dashboard";
import type { UrlEntry, UrlType } from "@/lib/db/url-inventory";

// ── fixtures: a global CMS graph shared by multiple "projects" ─────────────────
const REG = buildEntityRegistry({
  casinos: [
    { id: "u-sb", name: "Superbet Casino", slug: "superbet-casino", status: "published", license: "ONJN" },
    { id: "u-nb", name: "Netbet Casino", slug: "netbet-casino", status: "published", license: "ONJN" },
    { id: "u-dc", name: "Draftonia Casino", slug: "draftonia-casino", status: "draft", license: null },
  ],
  bonuses: [{ id: "u-bo", offer: "Superbet bun venit", slug: "superbet-bun-venit", status: "published" }],
  games: [],
  providers: [{ id: "u-pg", name: "Pragmatic Play", slug: "pragmatic-play", status: "published" }],
  payments: [{ id: "u-sk", name: "Skrill", slug: "skrill", status: "published" }],
  bonusTypes: [{ id: "u-nodep", label: "Fără depunere", slug: "fara-depunere" }],
  gameCategories: [],
  tags: [{ id: "u-tg", label: "Skrill", slug: "skrill-eticheta" }], // alias collision with payment "Skrill"
});
const BY_ID = new Map(REG.map((e) => [e.id, e] as const));
const KNOWN = new Set(REG.map((e) => e.id));
const REL = buildEntityRelations({
  bonuses: [{ id: "u-bo", casinoId: "u-sb", bonusTypeId: "u-nodep" }],
  casinoGames: [],
  games: [],
  casinoPayments: [
    { casinoId: "u-sb", paymentMethodId: "u-sk" },
    { casinoId: "u-nb", paymentMethodId: "u-sk" },
    { casinoId: "u-dc", paymentMethodId: "u-sk" },
  ],
  casinoTags: [],
  casinoLicenses: [{ casinoId: "u-sb", license: "ONJN" }],
}, KNOWN);
const u = (url: string, status: "existing" | "planned", type: UrlType = "casino"): UrlEntry => ({ url, type, title: url, source: "t", status });
const INV: UrlEntry[] = [u("/cazinouri-online/superbet-casino", "existing"), u("/cazinouri-online/netbet-casino", "existing")];
const TOPICAL = topicalCoverage(REL, BY_ID, INV);
const dash = (keywords: string[]) => buildEntityDashboard(keywords, REG, REL, TOPICAL);

// ── project scoping ──────────────────────────────────────────────────────────
test("project with relevant entities → rows + KPIs", () => {
  const d = dash(["superbet casino"]);
  assert.ok(d.rows.some((r) => r.entityId === "casino:u-sb"));
  assert.equal(d.kpis.entities, 1);
  assert.ok(d.kpis.relationsVerified >= 2); // casino_payment + casino_bonus
  assert.ok(d.kpis.relationsDerived >= 2); // casino_bonus_type + casino_license
});

test("empty project → no rows, zero KPIs", () => {
  const d = dash([]);
  assert.deepEqual(d.rows, []);
  assert.equal(d.kpis.entities, 0);
  assert.equal(d.kpis.relationsVerified, 0);
  assert.equal(d.kpis.topical.candidate, 0);
});

test("two projects with different keywords get DISJOINT entities (isolation)", () => {
  const a = dash(["superbet casino"]).rows.map((r) => r.entityId);
  const b = dash(["netbet casino"]).rows.map((r) => r.entityId);
  assert.ok(a.includes("casino:u-sb") && !a.includes("casino:u-nb"));
  assert.ok(b.includes("casino:u-nb") && !b.includes("casino:u-sb"));
});

test("project isolation: an entity not named by the project's keywords is absent", () => {
  assert.ok(!dash(["superbet casino"]).rows.some((r) => r.entityId === "casino:u-nb"));
});

test("relations without relevance to the project are not attributed to it", () => {
  // Project A = Superbet only → netbet's casino_payment relation must NOT be counted.
  const a = dash(["superbet casino"]);
  assert.equal(a.kpis.relationsVerified, 2); // exactly Superbet's (payment + bonus), not netbet's/draft's
});

// ── alias collision ─────────────────────────────────────────────────────────
test("alias collision keeps BOTH competing entities (payment + tag 'Skrill')", () => {
  const rows = dash(["skrill"]).rows;
  const types = rows.map((r) => r.type).sort();
  assert.deepEqual(types, ["payment", "tag"]);
});

// ── draft vs published ──────────────────────────────────────────────────────
test("a DRAFT casino is still identified (identity independent of publish status)", () => {
  const r = dash(["draftonia casino"]).rows.find((x) => x.entityId === "casino:u-dc")!;
  assert.equal(r.status, "draft");
  assert.equal(r.publicUrl, "/cazinouri-online/draftonia-casino");
});

// ── topical status + editorial actions ──────────────────────────────────────
test("topical rows carry state + editorial action; CMS presence ≠ covered", () => {
  const sb = dash(["superbet casino"]).rows.find((r) => r.entityId === "casino:u-sb")!;
  const payment = sb.topical.find((t) => t.relation.relationType === "casino_payment")!;
  assert.equal(payment.state, "candidate"); // review published, but NOT auto-covered
  assert.equal(payment.editorialAction, "expand_section");
  assert.ok(!sb.topical.some((t) => t.state === "covered")); // no dedicated published page → nothing covered
});

// ── sort + filter ───────────────────────────────────────────────────────────
test("filters: type / provenance / confidence / topical", () => {
  const all = dash(["superbet casino", "skrill", "pragmatic play"]).rows;
  assert.ok(filterEntityRows(all, { type: "casino" }).every((r) => r.type === "casino"));
  assert.ok(filterEntityRows(all, { provenance: "derived_cms" }).every((r) => r.relations.some((rel) => rel.provenance === "derived_cms")));
  assert.ok(filterEntityRows(all, { confidence: "high" }).every((r) => r.confidence === "high"));
  assert.ok(filterEntityRows(all, { topical: "candidate" }).every((r) => r.topical.some((t) => t.state === "candidate")));
  assert.deepEqual(entityTypeFacets(all).includes("casino") ? true : false, true);
});

test("deterministic rows (sorted by confidence, type, name, id)", () => {
  assert.deepEqual(dash(["superbet casino", "skrill"]), dash(["superbet casino", "skrill"]));
});

// ── KE-0/KE-1 compatibility ─────────────────────────────────────────────────
test("compat: reuses KE-2A/2B outputs unchanged; generic keyword yields no entities", () => {
  assert.equal(dash(["cele mai bune cazinouri online"]).rows.length, 0);
  // KPI topical distribution only reflects scoped entities (Superbet), not the whole CMS
  const d = dash(["superbet casino"]);
  const sumTopical = Object.values(d.kpis.topical).reduce((a, b) => a + b, 0);
  assert.equal(sumTopical, d.rows.flatMap((r) => r.topical).length);
});
