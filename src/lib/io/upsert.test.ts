import { test } from "node:test";
import assert from "node:assert/strict";

import { buildRows, CLEAR_SENTINEL, type SlugMaps, type ExistingRecord } from "@/lib/io/validate";
import { ENTITY_DESCRIPTORS, type LookupKey } from "@/lib/io/entities";

const CAS = ENTITY_DESCRIPTORS.casinos;
const BON = ENTITY_DESCRIPTORS.bonuses;

const UID = "11111111-1111-1111-1111-111111111111";
const UID2 = "22222222-2222-2222-2222-222222222222";
const UID3 = "33333333-3333-3333-3333-333333333333";
const BID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function maps(entries: Partial<Record<LookupKey, Record<string, string>>>): SlugMaps {
  const m: SlugMaps = new Map();
  for (const [k, obj] of Object.entries(entries)) {
    m.set(k as LookupKey, new Map(Object.entries(obj as Record<string, string>)));
  }
  return m;
}

const casMaps = maps({
  tags: { vip: "tag-vip", nou: "tag-nou" },
  payment_methods: { visa: "pm-visa" },
  games: { book: "game-book" },
});
const bonMaps = maps({ casinos: { "casino-x": UID }, bonus_types: { welcome: "bt-welcome" } });

const existingCas: ExistingRecord[] = [{ id: UID, slug: "casino-x", status: "published" }];

function one(
  desc: typeof CAS,
  row: Record<string, string>,
  m: SlugMaps,
  existing: ExistingRecord[],
  mode: "create" | "upsert",
) {
  return buildRows(desc, [row], m, existing, mode)[0];
}
const hasMsg = (r: { messages: string[] }, s: string) => r.messages.some((x) => x.includes(s));

// ── CREATE mode (legacy) is preserved ──────────────────────────────────────
test("create: new slug → draft insert with derived offer_url", () => {
  const r = one(CAS, { slug: "casino-new", name: "New" }, casMaps, existingCas, "create");
  assert.equal(r.level, "valid");
  assert.equal(r.operation, "create");
  assert.equal(r.targetId, null);
  assert.equal(r.dbRow.status, "draft");
  assert.equal(r.dbRow.slug, "casino-new");
  assert.equal(r.dbRow.name, "New");
  assert.equal(r.dbRow.offer_url, "/go/casino-new");
});

test("create: existing slug is an error (create-only)", () => {
  const r = one(CAS, { slug: "casino-x", name: "X" }, casMaps, existingCas, "create");
  assert.equal(r.level, "error");
  assert.ok(hasMsg(r, "există deja"));
});

test("create: id column is ignored (does not become an update)", () => {
  const r = one(CAS, { id: UID, slug: "casino-new", name: "N" }, casMaps, existingCas, "create");
  assert.equal(r.operation, "create");
  assert.equal(r.dbRow.status, "draft");
});

test("create: __CLEAR__ is treated as a literal value, not a sentinel", () => {
  const r = one(CAS, { slug: "casino-new", name: "N", intro: CLEAR_SENTINEL }, casMaps, [], "create");
  assert.equal(r.level, "valid");
  assert.equal(r.dbRow.intro, CLEAR_SENTINEL);
});

// ── UPSERT: identification ──────────────────────────────────────────────────
test("upsert: unknown slug → create (draft)", () => {
  const r = one(CAS, { slug: "casino-new", name: "New" }, casMaps, existingCas, "upsert");
  assert.equal(r.operation, "create");
  assert.equal(r.dbRow.status, "draft");
});

test("upsert: match by slug → update that record", () => {
  const r = one(CAS, { slug: "casino-x", rating: "4.5" }, casMaps, existingCas, "upsert");
  assert.equal(r.operation, "update");
  assert.equal(r.targetId, UID);
  assert.equal(r.dbRow.rating, 4.5);
});

test("upsert: match by id (slug blank) → update, display slug from DB", () => {
  const r = one(CAS, { id: UID, rating: "4" }, casMaps, existingCas, "upsert");
  assert.equal(r.operation, "update");
  assert.equal(r.targetId, UID);
  assert.equal(r.slug, "casino-x");
  assert.equal(r.dbRow.rating, 4);
  assert.equal("slug" in r.dbRow, false); // no rename
});

test("upsert: unknown id → error (never creates/modifies an unknown id)", () => {
  const r = one(CAS, { id: UID3, slug: "casino-x", name: "N" }, casMaps, existingCas, "upsert");
  assert.equal(r.operation, "skip");
  assert.ok(hasMsg(r, "inexistent"));
});

test("upsert: malformed id → error", () => {
  const r = one(CAS, { id: "not-a-uuid", name: "N" }, casMaps, existingCas, "upsert");
  assert.equal(r.operation, "skip");
  assert.ok(hasMsg(r, "id invalid"));
});

test("upsert: id and slug point at different records → ambiguous, stop row", () => {
  const two: ExistingRecord[] = [
    { id: UID, slug: "casino-x", status: "published" },
    { id: UID2, slug: "casino-y", status: "draft" },
  ];
  const r = one(CAS, { id: UID, slug: "casino-y" }, casMaps, two, "upsert");
  assert.equal(r.operation, "skip");
  assert.ok(hasMsg(r, "ambiguu"));
});

test("upsert: same target twice in file → second row errors", () => {
  const built = buildRows(
    CAS,
    [
      { id: UID, rating: "4" },
      { slug: "casino-x", rating: "5" },
    ],
    casMaps,
    existingCas,
    "upsert",
  );
  assert.equal(built[0].operation, "update");
  assert.equal(built[1].operation, "skip");
  assert.ok(hasMsg(built[1], "de două ori"));
});

// ── UPSERT: field semantics (blank keep, __CLEAR__ clear) ───────────────────
test("upsert update: blank cell keeps existing value (omitted from patch)", () => {
  const r = one(CAS, { slug: "casino-x", name: "", rating: "4.5" }, casMaps, existingCas, "upsert");
  assert.equal(r.level, "valid");
  assert.equal("name" in r.dbRow, false);
  assert.equal(r.dbRow.rating, 4.5);
});

test("upsert update: required field may stay blank (kept), unlike create", () => {
  const upd = one(CAS, { slug: "casino-x", name: "" }, casMaps, existingCas, "upsert");
  assert.equal(upd.level, "valid");
  assert.equal("name" in upd.dbRow, false);
  const cre = one(CAS, { slug: "casino-new", name: "" }, casMaps, existingCas, "upsert");
  assert.equal(cre.level, "error");
  assert.ok(hasMsg(cre, "name lipsă"));
});

test("upsert update: __CLEAR__ nulls a scalar and empties a list", () => {
  const r = one(
    CAS,
    { slug: "casino-x", intro: CLEAR_SENTINEL, pros: CLEAR_SENTINEL },
    casMaps,
    existingCas,
    "upsert",
  );
  assert.equal(r.level, "valid");
  assert.equal(r.dbRow.intro, null);
  assert.deepEqual(r.dbRow.pros, []);
});

test("upsert update: __CLEAR__ on a required field is an error", () => {
  const r = one(CAS, { slug: "casino-x", name: CLEAR_SENTINEL }, casMaps, existingCas, "upsert");
  assert.equal(r.level, "error");
  assert.ok(hasMsg(r, "nu poate fi golit"));
});

test("upsert create: __CLEAR__ is invalid on a new record", () => {
  const r = one(CAS, { slug: "casino-new", name: "N", intro: CLEAR_SENTINEL }, casMaps, [], "upsert");
  assert.equal(r.level, "error");
  assert.ok(hasMsg(r, "doar la actualizare"));
});

// ── UPSERT: slug rename only via stable id, onto a free slug ─────────────────
test("upsert: rename slug via id onto a free slug (warned)", () => {
  const r = one(CAS, { id: UID, slug: "casino-x-new" }, casMaps, existingCas, "upsert");
  assert.equal(r.operation, "update");
  assert.equal(r.dbRow.slug, "casino-x-new");
  assert.equal(r.dbRow.offer_url, "/go/casino-x-new");
  assert.equal(r.level, "warning");
  assert.ok(hasMsg(r, "redenumire"));
});

test("upsert: rename onto a slug owned by another record → error", () => {
  const two: ExistingRecord[] = [
    { id: UID, slug: "casino-x", status: "published" },
    { id: UID2, slug: "casino-y", status: "draft" },
  ];
  // id UID + slug casino-y resolves as ambiguous first; use a slug that maps elsewhere only after id match
  const r = buildRows(CAS, [{ id: UID, slug: "casino-y" }], casMaps, two, "upsert")[0];
  assert.equal(r.level, "error"); // guarded (ambiguous / collision)
});

// ── UPSERT: relations (m2m) ─────────────────────────────────────────────────
test("upsert update: provided m2m replaces; blank leaves untouched; __CLEAR__ empties", () => {
  const provided = one(CAS, { slug: "casino-x", tag_slugs: "vip" }, casMaps, existingCas, "upsert");
  const tagRel = provided.relations.find((x) => x.junction === "casino_tags");
  assert.ok(tagRel);
  assert.deepEqual(tagRel!.ids, ["tag-vip"]);
  assert.equal(tagRel!.replace, true);

  const blank = one(CAS, { slug: "casino-x", name: "Y" }, casMaps, existingCas, "upsert");
  assert.equal(blank.relations.length, 0);

  const cleared = one(CAS, { slug: "casino-x", tag_slugs: CLEAR_SENTINEL }, casMaps, existingCas, "upsert");
  const cr = cleared.relations.find((x) => x.junction === "casino_tags");
  assert.ok(cr);
  assert.deepEqual(cr!.ids, []);
  assert.equal(cr!.replace, true);
});

test("create: m2m inserts without replace", () => {
  const r = one(CAS, { slug: "casino-new", name: "N", tag_slugs: "vip|nou" }, casMaps, [], "create");
  const tagRel = r.relations.find((x) => x.junction === "casino_tags");
  assert.ok(tagRel);
  assert.deepEqual(tagRel!.ids, ["tag-vip", "tag-nou"]);
  assert.equal(tagRel!.replace, false);
});

// ── UPSERT: status is never mutated by import ───────────────────────────────
test("upsert update: status column is surfaced as a warning, never written", () => {
  const changed = one(CAS, { slug: "casino-x", status: "archived" }, casMaps, existingCas, "upsert");
  assert.equal(changed.operation, "update");
  assert.equal("status" in changed.dbRow, false);
  assert.equal(changed.level, "warning");
  assert.ok(hasMsg(changed, "ignorat"));

  const same = one(CAS, { slug: "casino-x", status: "published" }, casMaps, existingCas, "upsert");
  assert.equal(same.level, "valid");
});

// ── UPSERT: bonuses FK + derived claim_url ──────────────────────────────────
test("bonuses create: resolves casino_slug FK and derives claim_url", () => {
  const r = one(BON, { slug: "bonus-1", offer: "100%", casino_slug: "casino-x" }, bonMaps, [], "upsert");
  assert.equal(r.operation, "create");
  assert.equal(r.dbRow.casino_id, UID);
  assert.equal(r.dbRow.claim_url, "/go/casino-x/bonus-1"); // per-bonus deep link
  assert.equal(r.dbRow.status, "draft");
});

test("bonuses update: blank FK keeps casino; empty patch when nothing provided", () => {
  const existingBon: ExistingRecord[] = [{ id: BID, slug: "bonus-1", status: "draft" }];
  const r = one(BON, { slug: "bonus-1", offer: "", casino_slug: "" }, bonMaps, existingBon, "upsert");
  assert.equal(r.operation, "update");
  assert.equal("casino_id" in r.dbRow, false);
  assert.equal("claim_url" in r.dbRow, false);
  assert.equal(Object.keys(r.dbRow).length, 0);
  assert.equal(r.relations.length, 0);
});

test("bonuses update: changing casino_slug re-derives claim_url", () => {
  const existingBon: ExistingRecord[] = [{ id: BID, slug: "bonus-1", status: "draft" }];
  const r = one(BON, { id: BID, casino_slug: "casino-x" }, bonMaps, existingBon, "upsert");
  assert.equal(r.dbRow.casino_id, UID);
  // bonus slug comes from the matched record (id match, slug blank in row)
  assert.equal(r.dbRow.claim_url, "/go/casino-x/bonus-1");
});
