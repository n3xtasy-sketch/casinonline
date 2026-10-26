import { test } from "node:test";
import assert from "node:assert/strict";

import { buildRows, validateJsonField, type SlugMaps, type ExistingRecord } from "@/lib/io/validate";
import { ENTITY_DESCRIPTORS, csvColumns } from "@/lib/io/entities";
import { WRITABLE_COLUMNS } from "@/lib/io/apply-row";
import { unknownColumns } from "@/lib/io/pipeline";

const BON = ENTITY_DESCRIPTORS.bonuses;
const UID = "11111111-1111-1111-1111-111111111111";
const BID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const maps: SlugMaps = new Map([
  ["casinos", new Map([["casino-x", UID]])],
  ["bonus_types", new Map([["welcome", "bt-1"]])],
] as const);
const existing: ExistingRecord[] = [{ id: BID, slug: "bonus-1", status: "draft" }];
const create = (row: Record<string, string>) => buildRows(BON, [{ slug: "bonus-new", casino_slug: "casino-x", offer: "100%", ...row }], maps, [], "create")[0];
const upsert = (row: Record<string, string>) => buildRows(BON, [{ slug: "bonus-1", ...row }], maps, existing, "upsert")[0];
const hasMsg = (r: { messages: string[] }, s: string) => r.messages.some((m) => m.includes(s));

const NEW = ["amount", "spin_value", "max_win", "eligible_slots", "wagering_multiplier", "wagering_basis",
  "kyc_required", "terms_url", "verified_at", "expires_at", "reward_stages"];

// ── Wiring ──────────────────────────────────────────────────────────────────
test("bonuses: cele 11 câmpuri sunt în csvColumns + WRITABLE + nu mai sunt unknown", () => {
  const cols = csvColumns(BON);
  for (const c of NEW) assert.ok(cols.includes(c), `csvColumns lipsă: ${c}`);
  for (const c of NEW) assert.ok(WRITABLE_COLUMNS.bonuses.includes(c), `WRITABLE lipsă: ${c}`);
  assert.ok(!WRITABLE_COLUMNS.bonuses.includes("status"));
  assert.deepEqual(unknownColumns(BON, ["id", "slug", "casino_slug", "offer", ...NEW]), []);
});

// ── NULL vs 0 (wagering_multiplier / spin_value) ────────────────────────────
test("NULL vs 0: wagering_multiplier '0' → 0; gol la CREATE → null", () => {
  assert.equal(create({ wagering_multiplier: "0" }).dbRow.wagering_multiplier, 0);
  assert.equal(create({ wagering_multiplier: "" }).dbRow.wagering_multiplier, null);
});
test("NULL vs 0: pe UPSERT gol = păstrează (omis din patch), '0' = 0", () => {
  assert.equal("wagering_multiplier" in upsert({ wagering_multiplier: "" }).dbRow, false);
  assert.equal(upsert({ wagering_multiplier: "0" }).dbRow.wagering_multiplier, 0);
});

// ── NULL vs false (kyc_required) ────────────────────────────────────────────
test("NULL vs false: kyc_required true/false explicit; gol CREATE → null", () => {
  assert.equal(create({ kyc_required: "true" }).dbRow.kyc_required, true);
  assert.equal(create({ kyc_required: "false" }).dbRow.kyc_required, false);
  assert.equal(create({ kyc_required: "" }).dbRow.kyc_required, null);
});
test("kyc_required valoare invalidă → eroare", () => {
  const r = create({ kyc_required: "maybe" });
  assert.equal(r.level, "error");
  assert.ok(hasMsg(r, "kyc_required"));
});
test("kyc_required __CLEAR__ pe UPSERT → null (≠ false)", () => {
  assert.equal(upsert({ kyc_required: "__CLEAR__" }).dbRow.kyc_required, null);
});

// ── NULL vs [] (eligible_slots / reward_stages) ─────────────────────────────
test("NULL vs []: eligible_slots gol CREATE → null (nu [])", () => {
  assert.equal(create({ eligible_slots: "" }).dbRow.eligible_slots, null);
  assert.deepEqual(create({ eligible_slots: "book|starburst" }).dbRow.eligible_slots, ["book", "starburst"]);
});
test("reward_stages gol CREATE → null; '[]' → [] explicit", () => {
  assert.equal(create({ reward_stages: "" }).dbRow.reward_stages, null);
  assert.deepEqual(create({ reward_stages: "[]" }).dbRow.reward_stages, []);
});
test("eligible_slots __CLEAR__ pe UPSERT → null; reward_stages __CLEAR__ → null", () => {
  assert.equal(upsert({ eligible_slots: "__CLEAR__" }).dbRow.eligible_slots, null);
  assert.equal(upsert({ reward_stages: "__CLEAR__" }).dbRow.reward_stages, null);
});

// ── reward_stages: tranșe multiple + validare structurală ───────────────────
test("reward_stages: 2 tranșe valide (100 rotiri în 2×50)", () => {
  const json = JSON.stringify([
    { label: "Tranșa 1", free_spins: 50, trigger: "deposit" },
    { label: "Tranșa 2", free_spins: 50, within: "7 zile" },
  ]);
  const r = create({ reward_stages: json });
  assert.equal(r.level, "valid");
  assert.equal((r.dbRow.reward_stages as unknown[]).length, 2);
});
test("reward_stages: 3 tranșe welcome cu valori/multiplicatori diferiți", () => {
  const json = JSON.stringify([
    { label: "Depunere 1", amount: "100%", wagering_multiplier: 35, wagering_basis: "bonus" },
    { label: "Depunere 2", amount: "50%", spin_value: 0.1 },
    { label: "Depunere 3", amount: "25%", wagering_multiplier: 0 },
  ]);
  assert.equal(create({ reward_stages: json }).level, "valid");
});
test("reward_stages: lipsă label → eroare", () => {
  const r = create({ reward_stages: JSON.stringify([{ free_spins: 50 }]) });
  assert.equal(r.level, "error");
  assert.ok(hasMsg(r, "reward_stages"));
});
test("reward_stages: JSON invalid → eroare", () => {
  const r = create({ reward_stages: "{nu e json" });
  assert.equal(r.level, "error");
  assert.ok(hasMsg(r, "JSON invalid"));
});
test("reward_stages: free_spins negativ într-o tranșă → eroare (validateJsonField direct)", () => {
  const res = validateJsonField("reward_stages", [{ label: "T", free_spins: -5 }]);
  assert.ok(res.error);
});

// ── Numeric / date / url validations ────────────────────────────────────────
test("spin_value non-numeric → eroare; negativ → eroare (min 0)", () => {
  assert.ok(hasMsg(create({ spin_value: "abc" }), "spin_value"));
  assert.ok(hasMsg(create({ spin_value: "-5" }), "spin_value"));
});
test("max_win negativ → eroare; valid → stocat", () => {
  assert.ok(hasMsg(create({ max_win: "-1" }), "max_win"));
  assert.equal(create({ max_win: "10000" }).dbRow.max_win, 10000);
});
test("free_spins negativ → eroare", () => {
  assert.ok(hasMsg(create({ free_spins: "-3" }), "free_spins"));
});
test("verified_at / expires_at format invalid → eroare", () => {
  assert.ok(hasMsg(create({ verified_at: "01-02-2026" }), "verified_at"));
  assert.ok(hasMsg(create({ expires_at: "maine" }), "expires_at"));
});
test("terms_url non-URL → eroare", () => {
  assert.ok(hasMsg(create({ terms_url: "nu-e-url" }), "terms_url"));
});

// ── CREATE draft + necompletat = NULL ───────────────────────────────────────
test("CREATE: status draft + câmpuri necompletate = NULL", () => {
  const r = create({});
  assert.equal(r.dbRow.status, "draft");
  assert.equal(r.dbRow.amount, null);
  assert.equal(r.dbRow.spin_value, null);
  assert.equal(r.dbRow.verified_at, null);
  assert.equal(r.dbRow.kyc_required, null);
  assert.equal(r.dbRow.eligible_slots, null);
  assert.equal(r.dbRow.reward_stages, null);
});

// ── UPSERT patch + bonusuri existente neatinse de celule goale ──────────────
test("UPSERT: valori furnizate în patch; goale omise (păstrează)", () => {
  const r = upsert({ amount: "500 RON", spin_value: "0.20", verified_at: "2026-02-01", terms_url: "https://t.ro/x" });
  assert.equal(r.operation, "update");
  assert.equal(r.dbRow.amount, "500 RON");
  assert.equal(r.dbRow.spin_value, 0.2);
  assert.equal(r.dbRow.verified_at, "2026-02-01");
  assert.equal(r.dbRow.terms_url, "https://t.ro/x");
  assert.equal("max_win" in r.dbRow, false);
  assert.equal("kyc_required" in r.dbRow, false);
});
