import { test } from "node:test";
import assert from "node:assert/strict";

import { buildRows, type SlugMaps, type ExistingRecord } from "@/lib/io/validate";
import { ENTITY_DESCRIPTORS, csvColumns } from "@/lib/io/entities";
import { WRITABLE_COLUMNS } from "@/lib/io/apply-row";
import { unknownColumns } from "@/lib/io/pipeline";

const CAS = ENTITY_DESCRIPTORS.casinos;
const NEW = ["year_launched", "license_verified_at", "license_source", "verification_source"];
const ID = "11111111-1111-1111-1111-111111111111";
const existing: ExistingRecord[] = [{ id: ID, slug: "casino-x", status: "published" }];
const maps: SlugMaps = new Map();
const one = (row: Record<string, string>, mode: "create" | "upsert") =>
  buildRows(CAS, [row], maps, existing, mode)[0];
const hasMsg = (r: { messages: string[] }, s: string) => r.messages.some((m) => m.includes(s));

// ── Column presence / wiring ────────────────────────────────────────────────
test("faza2: cele 4 coloane sunt în csvColumns(casinos), og_image NU", () => {
  const cols = csvColumns(CAS);
  for (const c of NEW) assert.ok(cols.includes(c), `csvColumns lipsă: ${c}`);
  assert.ok(!cols.includes("og_image"), "og_image nu trebuie să fie importabil (SEO centralizat)");
});

test("faza2: cele 4 coloane sunt în WRITABLE_COLUMNS.casinos", () => {
  for (const c of NEW) assert.ok(WRITABLE_COLUMNS.casinos.includes(c), `WRITABLE lipsă: ${c}`);
  assert.ok(!WRITABLE_COLUMNS.casinos.includes("status"), "status rămâne ne-writable");
});

test("faza2: coloanele noi NU mai sunt respinse ca necunoscute", () => {
  assert.deepEqual(unknownColumns(CAS, ["id", "slug", "name", ...NEW]), []);
});

// ── CREATE ──────────────────────────────────────────────────────────────────
test("faza2 CREATE: cele 4 câmpuri valide se scriu + status forțat draft", () => {
  const r = one(
    { slug: "casino-new", name: "N", year_launched: "2018", license_verified_at: "2026-01-15",
      license_source: "https://onjn.gov.ro/lista", verification_source: "https://example.com/v" },
    "create",
  );
  assert.equal(r.level, "valid");
  assert.equal(r.dbRow.status, "draft");
  assert.equal(r.dbRow.year_launched, 2018);
  assert.equal(r.dbRow.license_verified_at, "2026-01-15");
  assert.equal(r.dbRow.license_source, "https://onjn.gov.ro/lista");
  assert.equal(r.dbRow.verification_source, "https://example.com/v");
});

// ── Validation ──────────────────────────────────────────────────────────────
test("faza2: year_launched non-numeric → eroare", () => {
  const r = one({ slug: "casino-new", name: "N", year_launched: "abc" }, "create");
  assert.equal(r.level, "error");
  assert.ok(hasMsg(r, "year_launched"));
});

test("faza2: license_source non-URL → eroare", () => {
  const r = one({ slug: "casino-new", name: "N", license_source: "not-a-url" }, "create");
  assert.equal(r.level, "error");
  assert.ok(hasMsg(r, "license_source"));
});

test("faza2: verification_source schemă non-http → eroare", () => {
  const r = one({ slug: "casino-new", name: "N", verification_source: "ftp://x.ro" }, "create");
  assert.equal(r.level, "error");
  assert.ok(hasMsg(r, "verification_source"));
});

test("faza2: license_verified_at format greșit → eroare (YYYY-MM-DD)", () => {
  const r = one({ slug: "casino-new", name: "N", license_verified_at: "15-01-2026" }, "create");
  assert.equal(r.level, "error");
  assert.ok(hasMsg(r, "license_verified_at"));
});

// ── UPSERT semantics (blank keeps, values patch, __CLEAR__ clears) ───────────
test("faza2 UPSERT: celule goale păstrează (omise din patch)", () => {
  const r = one({ slug: "casino-x", year_launched: "", license_source: "" }, "upsert");
  assert.equal(r.operation, "update");
  assert.equal("year_launched" in r.dbRow, false);
  assert.equal("license_source" in r.dbRow, false);
});

test("faza2 UPSERT: valori furnizate intră în patch", () => {
  const r = one({ slug: "casino-x", year_launched: "2020", license_source: "https://s.ro/a" }, "upsert");
  assert.equal(r.operation, "update");
  assert.equal(r.dbRow.year_launched, 2020);
  assert.equal(r.dbRow.license_source, "https://s.ro/a");
});

test("faza2 UPSERT: __CLEAR__ golește cele 4 câmpuri → null", () => {
  const r = one(
    { slug: "casino-x", year_launched: "__CLEAR__", license_verified_at: "__CLEAR__",
      license_source: "__CLEAR__", verification_source: "__CLEAR__" },
    "upsert",
  );
  assert.equal(r.level, "valid");
  assert.equal(r.dbRow.year_launched, null);
  assert.equal(r.dbRow.license_verified_at, null);
  assert.equal(r.dbRow.license_source, null);
  assert.equal(r.dbRow.verification_source, null);
});
