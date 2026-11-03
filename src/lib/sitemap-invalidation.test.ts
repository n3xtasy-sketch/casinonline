import { test } from "node:test";
import assert from "node:assert/strict";

import {
  SITEMAP_CACHE_TAGS,
  SITEMAP_PATH,
  sitemapInvalidationPlan,
  shouldRevalidateSitemapAfterImport,
  cacheTagForTable,
} from "@/lib/sitemap-invalidation";

test("sitemap cache tags cover every data source the sitemap reads", () => {
  // getSlugs(table) canonical tags + listPublishedCategories + listPublishedEvergreenPages.
  // Note: payment_methods data is tagged "payments" (cacheTagForTable), matching its mutations.
  const expected = [
    "casinos", "games", "providers", "payments", "bonuses", "guides",
    "seo_categories", "seo_bonus_pages",
  ];
  assert.deepEqual([...SITEMAP_CACHE_TAGS].sort(), [...expected].sort());
});

test("payment_methods data aligns to the canonical 'payments' tag used by its mutations", () => {
  // The bug: getSlugs tagged "payment_methods" but mutations fire updateTag("payments") → the
  // sitemap's payment data was never invalidated. The fix: getSlugs now tags "payments".
  assert.equal(cacheTagForTable("payment_methods"), "payments");
  // The canonical payment tag must be the one the sitemap invalidation targets.
  assert.ok((SITEMAP_CACHE_TAGS as readonly string[]).includes("payments"));
  assert.ok(!(SITEMAP_CACHE_TAGS as readonly string[]).includes("payment_methods"));
});

test("every other content table tags by its own name (no accidental aliasing)", () => {
  for (const t of ["casinos", "games", "providers", "bonuses", "guides"]) {
    assert.equal(cacheTagForTable(t), t);
  }
});

test("no duplicate tags", () => {
  assert.equal(new Set(SITEMAP_CACHE_TAGS).size, SITEMAP_CACHE_TAGS.length);
});

test("invalidation plan purges all tags and regenerates the sitemap route", () => {
  const plan = sitemapInvalidationPlan();
  assert.deepEqual(plan.tags.sort(), [...SITEMAP_CACHE_TAGS].sort());
  assert.deepEqual(plan.paths, [SITEMAP_PATH]);
  assert.equal(SITEMAP_PATH, "/sitemap.xml");
});

test("plan returns a fresh array (not a shared mutable reference to the const)", () => {
  const a = sitemapInvalidationPlan();
  a.tags.push("mutated");
  const b = sitemapInvalidationPlan();
  assert.ok(!b.tags.includes("mutated"));
  assert.equal(b.tags.length, SITEMAP_CACHE_TAGS.length);
});

// ── CSV import regression: regenerate the sitemap iff rows actually changed ────
test("import revalidates the sitemap when rows were created or updated", () => {
  assert.equal(shouldRevalidateSitemapAfterImport({ created: 3, updated: 0 }), true);
  assert.equal(shouldRevalidateSitemapAfterImport({ created: 0, updated: 2 }), true);
  assert.equal(shouldRevalidateSitemapAfterImport({ created: 1, updated: 5 }), true);
});

test("import does NOT revalidate when nothing relevant changed (no-op import)", () => {
  assert.equal(shouldRevalidateSitemapAfterImport({ created: 0, updated: 0 }), false);
  // unchanged/skipped/failed-only outcomes carry created=0, updated=0 → no needless regeneration.
});
