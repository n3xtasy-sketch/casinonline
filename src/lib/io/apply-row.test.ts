import { test } from "node:test";
import assert from "node:assert/strict";

import { planRowUpdate, WRITABLE_COLUMNS, type PlannableRow } from "@/lib/io/apply-row";
import type { Relation } from "@/lib/io/validate";
import type { RowDiff } from "@/lib/io/diff";
import { ENTITY_DESCRIPTORS, type IoEntity } from "@/lib/io/entities";

const rel = (col: string, junction: string, ids: string[]): Relation => ({
  col, junction, selfCol: "casino_id", otherCol: "tag_id", ids, replace: true,
});
const diff = (fields: number, relCols: string[]): RowDiff => ({
  fields: Array.from({ length: fields }, (_, i) => ({ col: `f${i}`, before: "a", after: "b", cleared: false, sensitive: false })),
  relations: relCols.map((col) => ({ col, added: ["x"], removed: [] })),
  publishedContentChange: false,
  hasChanges: fields > 0 || relCols.length > 0,
});
const row = (over: Partial<PlannableRow>): PlannableRow => ({
  level: "valid", operation: "update", targetId: "id-1", dbRow: {}, relations: [], diff: null, ...over,
});

// ── planRowUpdate: when NOT to update ───────────────────────────────────────
test("error row → no plan", () => {
  assert.equal(planRowUpdate(row({ level: "error" })), null);
});
test("create op → no plan (updates only)", () => {
  assert.equal(planRowUpdate(row({ operation: "create" })), null);
});
test("update without target → no plan", () => {
  assert.equal(planRowUpdate(row({ targetId: null })), null);
});
test("update with no diff → no plan", () => {
  assert.equal(planRowUpdate(row({ diff: null })), null);
});
test("update with no real change → no plan (no UPDATE for unchanged)", () => {
  assert.equal(planRowUpdate(row({ diff: diff(0, []) })), null);
});

// ── planRowUpdate: what to apply ────────────────────────────────────────────
test("scalar-only change → patch = dbRow, no junctions", () => {
  const dbRow = { name: "New", intro: null };
  const plan = planRowUpdate(row({ dbRow, diff: diff(1, []) }));
  assert.deepEqual(plan, { patch: dbRow, junctions: [] });
});

test("relations-only change → empty patch, only the changed junction", () => {
  const relations = [rel("tag_slugs", "casino_tags", ["t1"]), rel("game_slugs", "casino_games", ["g1"])];
  const plan = planRowUpdate(row({ dbRow: { name: "X" }, relations, diff: diff(0, ["tag_slugs"]) }));
  assert.deepEqual(plan!.patch, {}); // no field change → no scalar write
  assert.equal(plan!.junctions.length, 1);
  assert.equal(plan!.junctions[0].table, "casino_tags");
  assert.deepEqual(plan!.junctions[0].ids, ["t1"]);
});

test("mixed change → patch + only changed junctions", () => {
  const dbRow = { name: "New" };
  const relations = [rel("tag_slugs", "casino_tags", ["t1"]), rel("game_slugs", "casino_games", [])];
  const plan = planRowUpdate(row({ dbRow, relations, diff: diff(1, ["tag_slugs", "game_slugs"]) }));
  assert.deepEqual(plan!.patch, dbRow);
  assert.deepEqual(plan!.junctions.map((j) => j.table), ["casino_tags", "casino_games"]);
});

test("CLEAR values pass through the patch unchanged (null / [])", () => {
  const dbRow = { intro: null, pros: [] };
  const plan = planRowUpdate(row({ dbRow, diff: diff(2, []) }));
  assert.deepEqual(plan!.patch, { intro: null, pros: [] });
});

// ── Whitelist drift guard: descriptor-writable columns ⊆ RPC whitelist ──────
test("descriptor m2m junctions match the authorized (table,junction,self,other) set in SQL (0021/0022)", () => {
  // Mirror of the whitelist in sync_junction (0021) + import_apply_row (0022).
  const ALLOWED = new Set([
    "casinos|casino_tags|casino_id|tag_id",
    "casinos|casino_games|casino_id|game_id",
    "casinos|casino_payment_methods|casino_id|payment_method_id",
    "games|casino_games|game_id|casino_id",
    "payment_methods|casino_payment_methods|payment_method_id|casino_id",
  ]);
  const derived = new Set<string>();
  for (const key of Object.keys(ENTITY_DESCRIPTORS) as Exclude<IoEntity, "affiliate_links">[]) {
    const d = ENTITY_DESCRIPTORS[key];
    for (const m of d.m2m) derived.add(`${d.table}|${m.junction}|${m.selfCol}|${m.otherCol}`);
  }
  // Every junction the importer can emit must be authorized by the RPCs…
  for (const t of derived) assert.ok(ALLOWED.has(t), `junction triple not authorized in SQL: ${t}`);
  // …and the SQL whitelist must not be broader than what the importer needs.
  assert.equal(derived.size, ALLOWED.size, "SQL junction whitelist and descriptor m2m set diverged");
});

test("every column the importer can write is in the RPC whitelist (0022)", () => {
  for (const key of Object.keys(ENTITY_DESCRIPTORS) as Exclude<IoEntity, "affiliate_links">[]) {
    const d = ENTITY_DESCRIPTORS[key];
    const writable = new Set<string>([
      "slug",
      ...d.fields.map((f) => f.db ?? f.col),
      ...d.fks.map((f) => f.db),
      ...(d.jsonFields ?? []).map((j) => j.col),
    ]);
    if (key === "casinos") writable.add("offer_url"); // derived on rename
    if (key === "bonuses") writable.add("claim_url"); // derived on casino change
    const allowed = new Set(WRITABLE_COLUMNS[d.table]);
    for (const c of writable) {
      assert.ok(allowed.has(c), `${d.table}: writable column "${c}" missing from RPC whitelist`);
    }
    assert.ok(!allowed.has("status"), `${d.table}: status must never be writable by import`);
  }
});
