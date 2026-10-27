import { test } from "node:test";
import assert from "node:assert/strict";

import { validateAuthorship, resolveByline, parseAuthorship } from "@/lib/editorial";
import { AUTHORS } from "@/lib/authors";

const A = AUTHORS[0].slug; // radu-bogdan-gabriel
const B = AUTHORS[1].slug; // radu-teodora-bianca

// ── validateAuthorship ──────────────────────────────────────────────────────
test("valid: author + distinct verifier + date", () => {
  assert.equal(validateAuthorship({ authorSlug: A, verifierSlug: B, verifiedAt: "2026-10-01" }), null);
});

test("valid: nothing assigned (optional)", () => {
  assert.equal(validateAuthorship({ authorSlug: null, verifierSlug: null, verifiedAt: null }), null);
});

test("invalid: author === verifier", () => {
  assert.ok(validateAuthorship({ authorSlug: A, verifierSlug: A, verifiedAt: "2026-10-01" }));
});

test("invalid: unknown author / verifier slug", () => {
  assert.ok(validateAuthorship({ authorSlug: "ghost", verifierSlug: null, verifiedAt: null }));
  assert.ok(validateAuthorship({ authorSlug: null, verifierSlug: "ghost", verifiedAt: null }));
});

test("invalid: verifier without a date, and date without a verifier", () => {
  assert.ok(validateAuthorship({ authorSlug: A, verifierSlug: B, verifiedAt: null }));
  assert.ok(validateAuthorship({ authorSlug: A, verifierSlug: null, verifiedAt: "2026-10-01" }));
});

// ── resolveByline: never fabricate "Verificat de" ───────────────────────────
test("verifier shown ONLY with a verification date", () => {
  const withDate = resolveByline({ authorSlug: A, verifierSlug: B, verifiedAt: "2026-10-01T00:00:00Z", updatedAt: null });
  assert.ok(withDate.verifier && withDate.verifier.slug === B);
  assert.equal(withDate.verifiedAt, "2026-10-01T00:00:00Z");

  const noDate = resolveByline({ authorSlug: A, verifierSlug: B, verifiedAt: null, updatedAt: null });
  assert.equal(noDate.verifier, null, "no verification date → no verifier byline");
  assert.equal(noDate.verifiedAt, null);
});

test("author resolves to a profile link; unknown slug → null", () => {
  const r = resolveByline({ authorSlug: A, verifierSlug: null, verifiedAt: null, updatedAt: null });
  assert.equal(r.author?.href, `/autori/${A}`);
  const g = resolveByline({ authorSlug: "ghost", verifierSlug: null, verifiedAt: null, updatedAt: null });
  assert.equal(g.author, null);
});

test("hasByline false when nothing present", () => {
  const r = resolveByline({ authorSlug: null, verifierSlug: null, verifiedAt: null, updatedAt: null });
  assert.equal(r.hasByline, false);
});

// ── parseAuthorship: form field names + empty→null ──────────────────────────
test("parseAuthorship reads editorial_verified_at (not the Faza2 verified_at)", () => {
  const fd = new FormData();
  fd.set("author_slug", A);
  fd.set("verifier_slug", B);
  fd.set("editorial_verified_at", "2026-10-01");
  fd.set("verified_at", "2020-01-01"); // Faza2 offer field — must be ignored here
  const { dbRow } = parseAuthorship(fd);
  assert.deepEqual(dbRow, { author_slug: A, verifier_slug: B, editorial_verified_at: "2026-10-01" });
});

test("parseAuthorship: blanks → null", () => {
  const { dbRow } = parseAuthorship(new FormData());
  assert.deepEqual(dbRow, { author_slug: null, verifier_slug: null, editorial_verified_at: null });
});
