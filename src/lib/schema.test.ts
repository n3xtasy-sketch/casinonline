import { test } from "node:test";
import assert from "node:assert/strict";
import { casinoReviewSchema } from "./schema";

test("casinoReviewSchema: rating absent → null (fără Review fabricat)", () => {
  assert.equal(casinoReviewSchema({ name: "Cazino X", path: "/cazinouri-online/x" }), null);
});

test("casinoReviewSchema: rating null → null", () => {
  assert.equal(
    casinoReviewSchema({ name: "Cazino X", path: "/cazinouri-online/x", rating: null }),
    null,
  );
});

test("casinoReviewSchema: rating 0 → null (nu emite ratingValue:0 invalid)", () => {
  assert.equal(
    casinoReviewSchema({ name: "Cazino X", path: "/cazinouri-online/x", rating: 0 }),
    null,
  );
});

test("casinoReviewSchema: rating valid → Review cu ratingValue corect", () => {
  const s = casinoReviewSchema({ name: "Cazino X", path: "/cazinouri-online/x", rating: 4.6 });
  assert.ok(s, "schema trebuie să existe pentru rating valid");
  assert.equal(s["@type"], "Review");
  assert.equal(s.reviewRating.ratingValue, 4.6);
  assert.equal(s.reviewRating.worstRating, 1);
  assert.equal(s.reviewRating.bestRating, 5);
  assert.equal(s.itemReviewed.name, "Cazino X");
});
