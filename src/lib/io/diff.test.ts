import { test } from "node:test";
import assert from "node:assert/strict";

import { buildRowDiff, maskUrl, type DiffCol } from "@/lib/io/diff";

const SCALAR: DiffCol[] = [{ col: "name", db: "name", kind: "scalar" }];
const LIST: DiffCol[] = [{ col: "pros", db: "pros", kind: "list" }];
const URLC: DiffCol[] = [{ col: "logo_url", db: "logo_url", kind: "url" }];
const JSONC: DiffCol[] = [{ col: "sections", db: "sections", kind: "json" }];
const FKC: DiffCol[] = [{ col: "casino_slug", db: "casino_id", kind: "fk" }];

const base = { fkSlugs: {}, relations: [], targetStatus: null as string | null };

// ── Scalars ─────────────────────────────────────────────────────────────────
test("scalar change is detected", () => {
  const d = buildRowDiff({ ...base, cols: SCALAR, patch: { name: "B" }, before: { name: "A" } });
  assert.equal(d.hasChanges, true);
  assert.deepEqual(d.fields[0], { col: "name", before: "A", after: "B", cleared: false, sensitive: false });
});

test("provided same value is NOT a change", () => {
  const d = buildRowDiff({ ...base, cols: SCALAR, patch: { name: "A" }, before: { name: "A" } });
  assert.equal(d.hasChanges, false);
  assert.equal(d.fields.length, 0);
});

test("column not supplied (absent from patch) is not a change", () => {
  const d = buildRowDiff({ ...base, cols: SCALAR, patch: {}, before: { name: "A" } });
  assert.equal(d.hasChanges, false);
});

test("__CLEAR__ (null in patch) is flagged as cleared", () => {
  const d = buildRowDiff({ ...base, cols: SCALAR, patch: { name: null }, before: { name: "A" } });
  assert.equal(d.fields[0].cleared, true);
  assert.equal(d.fields[0].after, "");
});

// ── Lists ───────────────────────────────────────────────────────────────────
test("list change renders pipe-joined before/after", () => {
  const d = buildRowDiff({ ...base, cols: LIST, patch: { pros: ["a", "b"] }, before: { pros: ["a"] } });
  assert.deepEqual(d.fields[0], { col: "pros", before: "a", after: "a|b", cleared: false, sensitive: false });
});

test("list cleared to empty is flagged", () => {
  const d = buildRowDiff({ ...base, cols: LIST, patch: { pros: [] }, before: { pros: ["a", "b"] } });
  assert.equal(d.fields[0].cleared, true);
  assert.equal(d.fields[0].after, "");
});

// ── URL masking ───────────────────────────────────────────────────────────
test("url values are masked to scheme+host in the diff", () => {
  const d = buildRowDiff({
    ...base,
    cols: URLC,
    patch: { logo_url: "https://a.com/secret/path" },
    before: { logo_url: "https://b.com/old" },
  });
  assert.equal(d.fields[0].sensitive, true);
  assert.equal(d.fields[0].before, "https://b.com/…");
  assert.equal(d.fields[0].after, "https://a.com/…");
});

test("url change is detected even when the masked display is identical (same host, different path)", () => {
  const d = buildRowDiff({
    ...base,
    cols: URLC,
    patch: { logo_url: "https://a.com/NEW" },
    before: { logo_url: "https://a.com/OLD" },
  });
  assert.equal(d.hasChanges, true, "raw comparison must catch the change");
  assert.equal(d.fields[0].before, "https://a.com/…");
  assert.equal(d.fields[0].after, "https://a.com/…");
});

test("maskUrl handles non-URL input", () => {
  assert.equal(maskUrl(""), "");
  assert.equal(maskUrl("not a url"), "•••");
});

// ── FK (resolved to slug by caller) ─────────────────────────────────────────
test("fk change shown as slug before→after", () => {
  const d = buildRowDiff({
    ...base,
    cols: FKC,
    patch: { casino_id: "uuid-new" },
    before: { casino_id: "uuid-old" },
    fkSlugs: { casino_slug: { before: "casino-old", after: "casino-new" } },
  });
  assert.deepEqual(d.fields[0], { col: "casino_slug", before: "casino-old", after: "casino-new", cleared: false, sensitive: false });
});

// ── m2m relations ───────────────────────────────────────────────────────────
test("relations: added and removed are computed", () => {
  const d = buildRowDiff({
    ...base,
    cols: [],
    patch: {},
    before: {},
    relations: [{ col: "tag_slugs", before: ["vip"], after: ["vip", "nou"] }],
  });
  assert.deepEqual(d.relations[0], { col: "tag_slugs", added: ["nou"], removed: [] });
  assert.equal(d.hasChanges, true);
});

test("relations: clear-all → everything removed", () => {
  const d = buildRowDiff({
    ...base,
    cols: [],
    patch: {},
    before: {},
    relations: [{ col: "tag_slugs", before: ["a", "b"], after: [] }],
  });
  assert.deepEqual(d.relations[0], { col: "tag_slugs", added: [], removed: ["a", "b"] });
});

test("relations: identical set → no change", () => {
  const d = buildRowDiff({
    ...base,
    cols: [],
    patch: {},
    before: {},
    relations: [{ col: "tag_slugs", before: ["x"], after: ["x"] }],
  });
  assert.equal(d.relations.length, 0);
  assert.equal(d.hasChanges, false);
});

// ── json ────────────────────────────────────────────────────────────────────
test("json change shown as element count", () => {
  const d = buildRowDiff({
    ...base,
    cols: JSONC,
    patch: { sections: [{ heading: "a" }] },
    before: { sections: [] },
  });
  assert.deepEqual(d.fields[0], { col: "sections", before: "", after: "1 element(e)", cleared: false, sensitive: false });
});

test("json identical content → no change", () => {
  const d = buildRowDiff({
    ...base,
    cols: JSONC,
    patch: { sections: [{ heading: "a" }] },
    before: { sections: [{ heading: "a" }] },
  });
  assert.equal(d.hasChanges, false);
});

// ── published-content-change gate ────────────────────────────────────────────
test("published + real change → publishedContentChange true", () => {
  const d = buildRowDiff({ ...base, cols: SCALAR, patch: { name: "B" }, before: { name: "A" }, targetStatus: "published" });
  assert.equal(d.publishedContentChange, true);
});

test("draft + real change → publishedContentChange false", () => {
  const d = buildRowDiff({ ...base, cols: SCALAR, patch: { name: "B" }, before: { name: "A" }, targetStatus: "draft" });
  assert.equal(d.publishedContentChange, false);
});

test("published + no change → publishedContentChange false", () => {
  const d = buildRowDiff({ ...base, cols: SCALAR, patch: { name: "A" }, before: { name: "A" }, targetStatus: "published" });
  assert.equal(d.publishedContentChange, false);
});
