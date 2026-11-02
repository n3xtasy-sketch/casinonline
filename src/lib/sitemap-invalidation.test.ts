import { test } from "node:test";
import assert from "node:assert/strict";

import { SITEMAP_CACHE_TAGS, SITEMAP_PATH, sitemapInvalidationPlan } from "@/lib/sitemap-invalidation";

test("sitemap cache tags cover every data source the sitemap reads", () => {
  // getSlugs(table) tags + listPublishedCategories + listPublishedEvergreenPages.
  const expected = [
    "casinos", "games", "providers", "payment_methods", "bonuses", "guides",
    "seo_categories", "seo_bonus_pages",
  ];
  assert.deepEqual([...SITEMAP_CACHE_TAGS].sort(), [...expected].sort());
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
