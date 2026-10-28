import { test } from "node:test";
import assert from "node:assert/strict";

import {
  editorialFlags,
  matchesEditorialFilter,
  summarizeEditorial,
  parseEditorialFilter,
  REVERIFY_DAYS,
  type EditorialRow,
} from "@/lib/editorial-status";

const NOW = new Date("2026-10-28T00:00:00Z");
const row = (p: Partial<EditorialRow>): EditorialRow => ({
  authorSlug: null,
  verifierSlug: null,
  editorialVerifiedAt: null,
  ...p,
});

test("flags: nothing assigned", () => {
  const f = editorialFlags(row({}), NOW);
  assert.deepEqual(f, { hasAuthor: false, hasVerifier: false, isVerified: false, needsReverify: false });
});

test("flags: author only (no verification)", () => {
  const f = editorialFlags(row({ authorSlug: "a" }), NOW);
  assert.equal(f.hasAuthor, true);
  assert.equal(f.isVerified, false);
  assert.equal(f.needsReverify, false);
});

test("flags: verifier without date is NOT verified", () => {
  const f = editorialFlags(row({ verifierSlug: "b" }), NOW);
  assert.equal(f.hasVerifier, true);
  assert.equal(f.isVerified, false);
});

test("flags: verified recently → not needing reverify", () => {
  const f = editorialFlags(row({ verifierSlug: "b", editorialVerifiedAt: "2026-10-01T00:00:00Z" }), NOW);
  assert.equal(f.isVerified, true);
  assert.equal(f.needsReverify, false); // 27 days
});

test("flags: verified long ago → needs reverify", () => {
  const f = editorialFlags(row({ verifierSlug: "b", editorialVerifiedAt: "2026-06-01T00:00:00Z" }), NOW);
  assert.equal(f.isVerified, true);
  assert.equal(f.needsReverify, true); // ~149 days > 90
});

test("flags: reverify boundary (exactly REVERIFY_DAYS → not yet)", () => {
  const boundary = new Date(NOW.getTime() - REVERIFY_DAYS * 86_400_000).toISOString();
  const f = editorialFlags(row({ verifierSlug: "b", editorialVerifiedAt: boundary }), NOW);
  assert.equal(f.needsReverify, false);
  const justOver = new Date(NOW.getTime() - (REVERIFY_DAYS + 1) * 86_400_000).toISOString();
  assert.equal(editorialFlags(row({ verifierSlug: "b", editorialVerifiedAt: justOver }), NOW).needsReverify, true);
});

test("matchesEditorialFilter: each filter", () => {
  const noAuthor = editorialFlags(row({ verifierSlug: "b", editorialVerifiedAt: "2026-10-01" }), NOW);
  assert.equal(matchesEditorialFilter(noAuthor, "fara-autor"), true);
  assert.equal(matchesEditorialFilter(noAuthor, "fara-verificator"), false);
  assert.equal(matchesEditorialFilter(noAuthor, "neverificat"), false);

  const unverified = editorialFlags(row({ authorSlug: "a" }), NOW);
  assert.equal(matchesEditorialFilter(unverified, "neverificat"), true);
  assert.equal(matchesEditorialFilter(unverified, "fara-verificator"), true);

  const stale = editorialFlags(row({ verifierSlug: "b", editorialVerifiedAt: "2026-06-01" }), NOW);
  assert.equal(matchesEditorialFilter(stale, "reverificare"), true);
  assert.equal(matchesEditorialFilter(stale, "all"), true);
});

test("summarizeEditorial counts", () => {
  const flags = [
    editorialFlags(row({}), NOW), // no author, unverified
    editorialFlags(row({ authorSlug: "a" }), NOW), // author, unverified
    editorialFlags(row({ authorSlug: "a", verifierSlug: "b", editorialVerifiedAt: "2026-10-01" }), NOW), // verified fresh
    editorialFlags(row({ authorSlug: "a", verifierSlug: "b", editorialVerifiedAt: "2026-06-01" }), NOW), // verified stale
  ];
  const s = summarizeEditorial(flags);
  assert.equal(s.total, 4);
  assert.equal(s.faraAutor, 1);
  assert.equal(s.neverificate, 2); // rows 1 and 2
  assert.equal(s.reverificare, 1); // row 4
});

test("parseEditorialFilter: valid passthrough, invalid → all", () => {
  assert.equal(parseEditorialFilter("reverificare"), "reverificare");
  assert.equal(parseEditorialFilter("nope"), "all");
  assert.equal(parseEditorialFilter(undefined), "all");
});
