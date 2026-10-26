import { test } from "node:test";
import assert from "node:assert/strict";

import { buildRows, type SlugMaps, type ExistingRecord } from "@/lib/io/validate";
import { ENTITY_DESCRIPTORS, csvColumns, type IoEntity } from "@/lib/io/entities";
import { unknownColumns } from "@/lib/io/pipeline";

const IMPORT_ENTITIES = Object.keys(ENTITY_DESCRIPTORS) as Exclude<IoEntity, "affiliate_links">[];

// ── Export header carries the stable id ─────────────────────────────────────
test("csvColumns: id is the first column, slug second", () => {
  for (const key of IMPORT_ENTITIES) {
    const cols = csvColumns(ENTITY_DESCRIPTORS[key]);
    assert.equal(cols[0], "id", `${key}: id must be first`);
    assert.equal(cols[1], "slug", `${key}: slug must be second`);
    assert.equal(new Set(cols).size, cols.length, `${key}: no duplicate columns`);
  }
});

// ── Unknown/unsupported CSV columns are detected (no silent ignore) ──────────
test("unknownColumns: a full export header has no unknown columns", () => {
  for (const key of IMPORT_ENTITIES) {
    const d = ENTITY_DESCRIPTORS[key];
    assert.deepEqual(unknownColumns(d, csvColumns(d)), []);
  }
});

test("unknownColumns: flags columns the importer does not read", () => {
  const d = ENTITY_DESCRIPTORS.casinos;
  const headers = [...csvColumns(d), "year_launched", "og_image", "Slug"];
  assert.deepEqual(unknownColumns(d, headers), ["year_launched", "og_image", "Slug"]);
});

test("unknownColumns: a trailing empty header is flagged", () => {
  const d = ENTITY_DESCRIPTORS.casinos;
  assert.deepEqual(unknownColumns(d, ["id", "slug", ""]), [""]);
});

// ── Every exported column is one the importer actually reads ─────────────────
test("csvColumns ⊆ columns accepted by the importer (no export-only ghosts)", () => {
  for (const key of IMPORT_ENTITIES) {
    const d = ENTITY_DESCRIPTORS[key];
    const accepted = new Set<string>([
      "id",
      "slug",
      "status", // read (upsert warning) though not emitted in CSV export
      ...d.fields.map((f) => f.col),
      ...d.fks.map((f) => f.col),
      ...d.m2m.map((m) => m.col),
      ...(d.jsonFields ?? []).map((j) => j.col),
    ]);
    for (const c of csvColumns(d)) {
      assert.ok(accepted.has(c), `${key}: exported column "${c}" not accepted by importer`);
    }
  }
});

// ── Round-trip: an exported id re-identifies its record on upsert import ─────
test("export→upsert: a row carrying the exported id is recognized as an update", () => {
  const CAS = ENTITY_DESCRIPTORS.casinos;
  const ID = "11111111-1111-1111-1111-111111111111";
  const existing: ExistingRecord[] = [{ id: ID, slug: "casino-x", status: "published" }];
  const emptyMaps: SlugMaps = new Map();

  // Shaped like one export CSV record (id + slug present), with one edited field.
  const exported = { id: ID, slug: "casino-x", name: "Edited Name" };
  const r = buildRows(CAS, [exported], emptyMaps, existing, "upsert")[0];

  assert.equal(r.operation, "update");
  assert.equal(r.targetId, ID);
  assert.equal(r.dbRow.name, "Edited Name");
  assert.equal("status" in r.dbRow, false); // status not mutated by import
});

// ── Relation sync compatibility with the sync_junction RPC whitelist ─────────
// Mirrors supabase/migrations/0021_sync_junction_rpc.sql. If a descriptor m2m
// drifts outside this whitelist, the atomic RPC path would reject it at runtime.
test("every importer m2m junction is allowed by the sync_junction whitelist", () => {
  const ALLOWED_TABLES = new Set(["casino_tags", "casino_games", "casino_payment_methods"]);
  const ALLOWED_SELF = new Set(["casino_id", "game_id", "payment_method_id"]);
  const ALLOWED_OTHER = new Set(["tag_id", "game_id", "payment_method_id", "casino_id"]);

  for (const key of IMPORT_ENTITIES) {
    for (const m of ENTITY_DESCRIPTORS[key].m2m) {
      assert.ok(ALLOWED_TABLES.has(m.junction), `${key}: table ${m.junction} not whitelisted`);
      assert.ok(ALLOWED_SELF.has(m.selfCol), `${key}: self_col ${m.selfCol} not whitelisted`);
      assert.ok(ALLOWED_OTHER.has(m.otherCol), `${key}: other_col ${m.otherCol} not whitelisted`);
    }
  }
});
