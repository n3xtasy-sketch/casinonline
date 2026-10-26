import { test } from "node:test";
import assert from "node:assert/strict";

import { computeLinkPreview, isHttpsUrl, type LinkLite } from "@/lib/affiliate-link-preview";

const A = "casino-a";
const B = "casino-b";
const links: LinkLite[] = [
  { id: "main-a", casinoId: A, placement: "review_cta", campaign: null, url: "https://a.example/main", isActive: true },
  { id: "promo-a", casinoId: A, placement: "bonus_claim", campaign: "welcome", url: "https://a.example/promo", isActive: true },
  { id: "dead-a", casinoId: A, placement: "listing_card", campaign: null, url: "https://a.example/old", isActive: false },
  { id: "main-b", casinoId: B, placement: "review_cta", campaign: null, url: "https://b.example/main", isActive: true },
];

test("isHttpsUrl: only https:// with a host", () => {
  assert.equal(isHttpsUrl("https://x.example"), true);
  assert.equal(isHttpsUrl("http://x.example"), false);
  assert.equal(isHttpsUrl("https://"), false);
  assert.equal(isHttpsUrl(""), false);
});

test("main with an active review_cta → principal + its url", () => {
  const r = computeLinkPreview({ mode: "main", existingId: "", casinoId: A, links, newUrl: "" });
  assert.equal(r.effectiveMode, "main");
  assert.equal(r.localType, "principal");
  assert.equal(r.localUrl, "https://a.example/main");
});

test("main without a main link → fallback + null", () => {
  const r = computeLinkPreview({ mode: "main", existingId: "", casinoId: B, links: [links[1]], newUrl: "" });
  assert.equal(r.localType, "fallback");
  assert.equal(r.localUrl, null);
});

test("existing active link → specific + its url", () => {
  const r = computeLinkPreview({ mode: "existing", existingId: "promo-a", casinoId: A, links, newUrl: "" });
  assert.equal(r.effectiveMode, "existing");
  assert.equal(r.validExistingId, "promo-a");
  assert.equal(r.localType, "specific");
  assert.equal(r.localUrl, "https://a.example/promo");
});

test("existing INACTIVE link → fallback, no external url shown (#spec)", () => {
  const r = computeLinkPreview({ mode: "existing", existingId: "dead-a", casinoId: A, links, newUrl: "" });
  assert.equal(r.localType, "fallback");
  assert.equal(r.localUrl, null);
  assert.equal(r.selected?.id, "dead-a"); // still surfaced so the UI can warn
});

test("#7 casino change: a selection from another casino is reset to main", () => {
  const r = computeLinkPreview({ mode: "existing", existingId: "promo-a", casinoId: B, links, newUrl: "" });
  assert.equal(r.validExistingId, ""); // promo-a belongs to A, not B
  assert.equal(r.effectiveMode, "main");
  assert.equal(r.selected, null);
  assert.equal(r.localUrl, "https://b.example/main"); // B's own main link
});

test("new valid https → specific + typed url", () => {
  const r = computeLinkPreview({ mode: "new", existingId: "", casinoId: A, links, newUrl: "https://aff.example/x" });
  assert.equal(r.localType, "specific");
  assert.equal(r.localUrl, "https://aff.example/x");
});

test("new invalid url → fallback + null (not a valid external destination)", () => {
  const r = computeLinkPreview({ mode: "new", existingId: "", casinoId: A, links, newUrl: "ftp://nope" });
  assert.equal(r.localType, "fallback");
  assert.equal(r.localUrl, null);
});
