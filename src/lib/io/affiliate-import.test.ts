import { test } from "node:test";
import assert from "node:assert/strict";

import { buildAffiliateRows, type ExistingLink } from "@/lib/io/affiliate-import";

const CAS_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const CAS_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const L_MAIN = "11111111-1111-1111-1111-111111111111";
const L_PROMO = "22222222-2222-2222-2222-222222222222";
const L_DEAD1 = "33333333-3333-3333-3333-333333333333";
const L_DEAD2 = "44444444-4444-4444-4444-444444444444";

const slugToId = new Map([["casino-a", CAS_A], ["casino-b", CAS_B]]);
const idToSlug = new Map([[CAS_A, "casino-a"], [CAS_B, "casino-b"]]);

const existing: ExistingLink[] = [
  { id: L_MAIN, casino_id: CAS_A, placement: "review_cta", url: "https://a.example/main", campaign: null, is_active: true, updated_at: "2026-01-01T00:00:00Z" },
  { id: L_PROMO, casino_id: CAS_A, placement: "bonus_claim", url: "https://a.example/promo", campaign: "welcome", is_active: true, updated_at: "2026-01-02T00:00:00Z" },
  // two INACTIVE links sharing one natural key (casino-a / listing_card / <null>)
  { id: L_DEAD1, casino_id: CAS_A, placement: "listing_card", url: "https://a.example/old1", campaign: null, is_active: false, updated_at: "2026-01-03T00:00:00Z" },
  { id: L_DEAD2, casino_id: CAS_A, placement: "listing_card", url: "https://a.example/old2", campaign: null, is_active: false, updated_at: "2026-01-04T00:00:00Z" },
];
const noBonuses = new Map<string, number>();

function build(rows: Record<string, string>[], mode: "create" | "upsert" = "upsert", bonusCounts = noBonuses) {
  return buildAffiliateRows(rows, slugToId, idToSlug, existing, bonusCounts, mode);
}

// ── CREATE ──────────────────────────────────────────────────────────────────
test("create: new link (no id, free natural key) → create row", () => {
  const r = build([{ casino_slug: "casino-b", placement: "review_cta", url: "https://b.example/go", campaign: "", is_active: "true" }])[0];
  assert.equal(r.operation, "create");
  assert.equal(r.level, "valid");
  assert.deepEqual(r.row, { casino_id: CAS_B, placement: "review_cta", url: "https://b.example/go", campaign: null, is_active: true });
});

test("no-id row matching an existing active key → UPDATE (cannot create a duplicate)", () => {
  // A new active link can't be created for a key that already has one: the natural key
  // resolves to the existing active link → UPDATE, never a second active row.
  const r = build([{ casino_slug: "casino-a", placement: "review_cta", url: "https://a.example/NEW", is_active: "true" }])[0];
  assert.equal(r.operation, "update");
  assert.equal(r.targetId, L_MAIN);
  assert.deepEqual(r.row, { url: "https://a.example/NEW" });
});

test("create: inactive new link on a FRESH key (no existing rows) is allowed", () => {
  const r = build([{ casino_slug: "casino-b", placement: "listing_card", url: "https://b.example/new", is_active: "false" }])[0];
  assert.equal(r.operation, "create");
  assert.equal((r.row as { is_active: boolean }).is_active, false);
});

test("create: non-https url → error", () => {
  const r = build([{ casino_slug: "casino-b", placement: "review_cta", url: "http://b.example", is_active: "true" }])[0];
  assert.equal(r.level, "error");
  assert.ok(r.messages.some((m) => m.includes("https")));
});

test("create: invalid placement + unknown casino → errors", () => {
  const r1 = build([{ casino_slug: "casino-b", placement: "nope", url: "https://b.example", is_active: "true" }])[0];
  assert.ok(r1.messages.some((m) => m.includes("placement")));
  const r2 = build([{ casino_slug: "ghost", placement: "review_cta", url: "https://b.example", is_active: "true" }])[0];
  assert.ok(r2.messages.some((m) => m.includes("inexistent")));
});

test("create mode: an existing identity (by id) is rejected", () => {
  const r = build([{ id: L_MAIN, casino_slug: "casino-a", placement: "review_cta", url: "https://a.example/main", is_active: "true" }], "create")[0];
  assert.equal(r.level, "error");
  assert.ok(r.messages.some((m) => m.includes("CREATE")));
});

// ── UPSERT / identity ─────────────────────────────────────────────────────────
test("upsert by id: changing url → update patch with only url", () => {
  const r = build([{ id: L_MAIN, casino_slug: "casino-a", placement: "review_cta", url: "https://a.example/CHANGED", campaign: "", is_active: "true" }])[0];
  assert.equal(r.operation, "update");
  assert.equal(r.targetId, L_MAIN);
  assert.deepEqual(r.row, { url: "https://a.example/CHANGED" });
  assert.equal(r.diff?.hasChanges, true);
  assert.equal(r.token, "2026-01-01T00:00:00Z"); // optimistic-lock token
});

test("upsert by natural key (no id): resolves the single active match", () => {
  const r = build([{ casino_slug: "casino-a", placement: "bonus_claim", url: "https://a.example/promo-2", campaign: "welcome", is_active: "true" }])[0];
  assert.equal(r.operation, "update");
  assert.equal(r.targetId, L_PROMO);
  assert.deepEqual(r.row, { url: "https://a.example/promo-2" });
});

test("ambiguous: no id + natural key matching MULTIPLE (inactive) rows → error", () => {
  const r = build([{ casino_slug: "casino-a", placement: "listing_card", url: "https://a.example/x", campaign: "", is_active: "false" }])[0];
  assert.equal(r.operation, "skip");
  assert.equal(r.level, "error");
  assert.ok(r.messages.some((m) => m.includes("ambigu")));
});

test("round-trip: exported row (id + identical values) → UNCHANGED", () => {
  const r = build([{ id: L_PROMO, casino_slug: "casino-a", placement: "bonus_claim", url: "https://a.example/promo", campaign: "welcome", is_active: "true" }])[0];
  assert.equal(r.operation, "update");
  assert.equal(r.diff?.hasChanges, false); // no change → will be UNCHANGED at apply
});

test("round-trip: an INACTIVE exported row re-identifies by id → UNCHANGED", () => {
  const r = build([{ id: L_DEAD1, casino_slug: "casino-a", placement: "listing_card", url: "https://a.example/old1", campaign: "", is_active: "false" }])[0];
  assert.equal(r.operation, "update");
  assert.equal(r.targetId, L_DEAD1);
  assert.equal(r.diff?.hasChanges, false);
});

test("unknown id → error", () => {
  const r = build([{ id: "99999999-9999-9999-9999-999999999999", casino_slug: "casino-a", placement: "review_cta", url: "https://a.example/main", is_active: "true" }])[0];
  assert.equal(r.level, "error");
  assert.ok(r.messages.some((m) => m.includes("inexistent")));
});

// ── campaign blank/__CLEAR__ ─────────────────────────────────────────────────
test("upsert: blank campaign keeps existing (no change to a welcome link)", () => {
  const r = build([{ id: L_PROMO, casino_slug: "casino-a", placement: "bonus_claim", url: "https://a.example/promo", campaign: "", is_active: "true" }])[0];
  assert.equal(r.diff?.hasChanges, false); // blank campaign = keep "welcome"
});

test("upsert: __CLEAR__ nulls the campaign", () => {
  const r = build([{ id: L_PROMO, casino_slug: "casino-a", placement: "bonus_claim", url: "https://a.example/promo", campaign: "__CLEAR__", is_active: "true" }])[0];
  assert.equal(r.operation, "update");
  assert.equal(r.row.campaign, null);
  assert.equal(r.diff?.hasChanges, true);
});

// ── same-casino / bonus protection ───────────────────────────────────────────
test("moving a link to another casino is blocked when bonuses use it", () => {
  const counts = new Map([[L_PROMO, 2]]);
  const r = build([{ id: L_PROMO, casino_slug: "casino-b", placement: "bonus_claim", url: "https://a.example/promo", campaign: "welcome", is_active: "true" }], "upsert", counts)[0];
  assert.equal(r.level, "error");
  assert.ok(r.messages.some((m) => m.includes("muta")));
});

test("deactivating a bonus-used link → warning explains the fallback", () => {
  const counts = new Map([[L_PROMO, 3]]);
  const r = build([{ id: L_PROMO, casino_slug: "casino-a", placement: "bonus_claim", url: "https://a.example/promo", campaign: "welcome", is_active: "false" }], "upsert", counts)[0];
  assert.equal(r.operation, "update");
  assert.equal(r.level, "warning");
  assert.equal(r.row.is_active, false);
  assert.ok(r.messages.some((m) => m.includes("bonus") && m.includes("fallback") || m.includes("bonus")));
});

test("same file: two rows targeting the same link → second errors", () => {
  const built = build([
    { id: L_MAIN, casino_slug: "casino-a", placement: "review_cta", url: "https://a.example/v1", is_active: "true" },
    { id: L_MAIN, casino_slug: "casino-a", placement: "review_cta", url: "https://a.example/v2", is_active: "true" },
  ]);
  assert.equal(built[0].operation, "update");
  assert.equal(built[1].operation, "skip");
  assert.ok(built[1].messages.some((m) => m.includes("două ori")));
});
