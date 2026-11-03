import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildEntityRegistry, resolveEntities, type RegistryInput, type EntityRecord,
} from "@/lib/seo/entity-registry";

const EMPTY: RegistryInput = { casinos: [], bonuses: [], games: [], providers: [], payments: [], bonusTypes: [], gameCategories: [], tags: [] };
const reg = (over: Partial<RegistryInput>): EntityRecord[] => buildEntityRegistry({ ...EMPTY, ...over });

// A realistic base registry (mirrors real DEV data shapes).
const BASE = reg({
  casinos: [
    { id: "u-superbet", name: "Superbet Casino", slug: "superbet-casino", status: "published", license: "ONJN" },
    { id: "u-lasvegas", name: "Las Vegas Casino", slug: "las-vegas-casino", status: "published", license: "ONJN" },
    { id: "u-prima", name: "Prima Test Casino", slug: "prima-test-casino", status: "draft", license: null },
  ],
  providers: [
    { id: "u-pragmatic", name: "Pragmatic Play", slug: "pragmatic-play", status: "published" },
    { id: "u-egt", name: "EGT / Amusnet", slug: "egt", status: "published" },
  ],
  payments: [{ id: "u-skrill", name: "Skrill", slug: "skrill", status: "published" }],
  games: [{ id: "u-sweet", name: "Sweet Bonanza", slug: "sweet-bonanza", status: "published" }],
  bonusTypes: [
    { id: "u-cashback", label: "Cashback", slug: "cashback" },
    { id: "u-nodep", label: "Fără depunere", slug: "fara-depunere" },
  ],
  tags: [{ id: "u-fast", label: "Retrageri rapide", slug: "retrageri-rapide" }],
});
const top = (q: string, r = BASE) => resolveEntities(q, r)[0];

// ── registry build ───────────────────────────────────────────────────────────
test("stable id is UUID-based (<type>:<cmsId>), route + license attribute present", () => {
  const e = BASE.find((x) => x.cmsId === "u-superbet")!;
  assert.equal(e.id, "casino:u-superbet");
  assert.equal(e.publicUrl, "/cazinouri-online/superbet-casino");
  assert.equal(e.attributes.license, "ONJN");
  assert.equal(e.provenance, "cms");
});

test("taxonomies have no public route; status = taxonomy", () => {
  const e = BASE.find((x) => x.id === "bonus_type:u-cashback")!;
  assert.equal(e.publicUrl, null);
  assert.equal(e.status, "taxonomy");
});

test("stable id survives a slug change (based on cmsId, not slug)", () => {
  const a = reg({ casinos: [{ id: "u-superbet", name: "Superbet Casino", slug: "superbet-casino", status: "published" }] })[0];
  const b = reg({ casinos: [{ id: "u-superbet", name: "Superbet Casino", slug: "superbet-ro", status: "published" }] })[0];
  assert.equal(a.id, b.id);
  assert.notEqual(a.slug, b.slug);
});

test("invalid rows (missing id/name/slug) are skipped, never invented", () => {
  const r = reg({ casinos: [
    { id: "", name: "X", slug: "x", status: "published" },
    { id: "u2", name: "", slug: "y", status: "published" },
    { id: "u3", name: "Valid Co", slug: "valid-co", status: "published" },
  ] });
  assert.equal(r.length, 1);
  assert.equal(r[0].cmsId, "u3");
});

test("deterministic build order (by id)", () => {
  assert.deepEqual(BASE.map((e) => e.id), [...BASE.map((e) => e.id)].sort());
});

// ── resolution: exact ───────────────────────────────────────────────────────────
test("Superbet Casino resolves exactly (high)", () => {
  assert.equal(top("Superbet Casino")!.entity.id, "casino:u-superbet");
  assert.equal(top("Superbet Casino")!.confidence, "high");
  assert.equal(top("superbet")!.entity.id, "casino:u-superbet"); // discriminative-core alias
  assert.equal(top("superbet")!.confidence, "high");
});

test("Pragmatic Play resolves; multi-word & partial", () => {
  assert.equal(top("pragmatic play")!.entity.id, "provider:u-pragmatic");
  assert.equal(top("pragmatic play")!.confidence, "high");
  assert.equal(top("pragmatic play sloturi")!.entity.id, "provider:u-pragmatic"); // token_subset
  assert.equal(top("pragmatic play sloturi")!.matchType, "token_subset");
});

test("separator-split alias resolves (EGT / Amusnet → amusnet)", () => {
  assert.equal(top("amusnet")!.entity.id, "provider:u-egt");
});

test("Skrill resolves to the payment entity (not conflated)", () => {
  const m = top("skrill retrageri");
  assert.equal(m!.entity.type, "payment");
  assert.equal(m!.entity.id, "payment:u-skrill");
});

test("slug-phrase and brand alias both resolve ('las vegas')", () => {
  assert.equal(top("las vegas casino")!.entity.id, "casino:u-lasvegas");
  assert.equal(top("las vegas")!.entity.id, "casino:u-lasvegas");
});

// ── bonus vs operator vs generic ─────────────────────────────────────────────────
test("bonus-type keyword resolves to bonus_type, NOT a casino", () => {
  assert.equal(top("cashback")!.entity.type, "bonus_type");
  assert.equal(top("bonus cashback")!.entity.type, "bonus_type");
});

test("generic 'cele mai bune cazinouri online' resolves to NO specific entity", () => {
  assert.deepEqual(resolveEntities("cele mai bune cazinouri online", BASE), []);
});

test("bare generic 'casino' / 'online' does not match every casino", () => {
  assert.deepEqual(resolveEntities("casino", BASE), []);
  assert.deepEqual(resolveEntities("online", BASE), []);
});

// ── draft vs published: identity independent of publish status ───────────────────
test("a DRAFT casino still resolves (identity ≠ published page)", () => {
  const m = top("prima test casino");
  assert.equal(m!.entity.id, "casino:u-prima");
  assert.equal(m!.entity.status, "draft");
  assert.equal(m!.entity.publicUrl, "/cazinouri-online/prima-test-casino"); // route exists; status says draft
});

// ── alias collision → ambiguous, never arbitrary ─────────────────────────────────
test("alias collision flags ambiguous (payment 'Skrill' + tag 'Skrill')", () => {
  const r = reg({
    payments: [{ id: "pm-skrill", name: "Skrill", slug: "skrill", status: "published" }],
    tags: [{ id: "tg-skrill", label: "Skrill", slug: "skrill-tag" }],
  });
  const matches = resolveEntities("skrill", r);
  assert.ok(matches.length >= 2);
  assert.ok(matches.every((m) => m.ambiguous));
  assert.deepEqual(matches.map((m) => m.entity.type).sort(), ["payment", "tag"]);
});

// ── edge cases + determinism ─────────────────────────────────────────────────────
test("empty / whitespace / stopword-only query resolves to nothing", () => {
  assert.deepEqual(resolveEntities("", BASE), []);
  assert.deepEqual(resolveEntities("   ", BASE), []);
  assert.deepEqual(resolveEntities("la", BASE), []); // stopword only → no tokens
});

test("resolution is deterministic", () => {
  assert.deepEqual(resolveEntities("superbet casino", BASE), resolveEntities("superbet casino", BASE));
});

test("reused normalization: aliases are lowercase, diacritics stripped (KE-0/KE-1 compatible)", () => {
  const e = BASE.find((x) => x.id === "bonus_type:u-nodep")!;
  assert.ok(e.aliases.includes("fara depunere")); // "Fără depunere" → normalized
  assert.ok(e.aliases.every((a) => a === a.toLowerCase()));
});
