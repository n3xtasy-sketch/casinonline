import { test } from "node:test";
import assert from "node:assert/strict";

import { CASINO_SLUG_RENAMES, casinoSlugRedirects } from "@/lib/seo/casino-redirects";

const redirects = casinoSlugRedirects();

test("one parent + one child redirect per renamed operator", () => {
  assert.equal(CASINO_SLUG_RENAMES.length, 8);
  assert.equal(redirects.length, CASINO_SLUG_RENAMES.length * 2);
});

test("every redirect is permanent (308)", () => {
  assert.ok(redirects.every((r) => r.permanent === true));
});

test("parent redirects map each approved old slug → new slug", () => {
  for (const { from, to } of CASINO_SLUG_RENAMES) {
    const parent = redirects.find((r) => r.source === `/cazinouri-online/${from}`);
    assert.ok(parent, `missing parent redirect for ${from}`);
    assert.equal(parent!.destination, `/cazinouri-online/${to}`);
  }
});

test("child redirects preserve the rest of the path via :path+", () => {
  for (const { from, to } of CASINO_SLUG_RENAMES) {
    const child = redirects.find((r) => r.source === `/cazinouri-online/${from}/:path+`);
    assert.ok(child, `missing child redirect for ${from}`);
    assert.equal(child!.destination, `/cazinouri-online/${to}/:path+`);
  }
});

test("no redirect chains and no loops (destination is never also a source)", () => {
  const sources = new Set(redirects.map((r) => r.source));
  for (const r of redirects) {
    assert.ok(!sources.has(r.destination), `destination ${r.destination} is also a source → chain/loop`);
    assert.notEqual(r.source, r.destination);
  }
});

test("already-conformant operators are NOT redirected", () => {
  const froms = new Set(CASINO_SLUG_RENAMES.map((r) => r.from));
  for (const slug of ["888casino", "vlad-cazino", "test-casino-production"]) {
    assert.ok(!froms.has(slug), `${slug} should not be renamed`);
    assert.ok(!redirects.some((r) => r.source === `/cazinouri-online/${slug}`), `${slug} should have no redirect`);
  }
});

test("no destination targets a still-bare slug (would 404 against the convention)", () => {
  for (const r of redirects) assert.ok(/-casino(\/|$|\/:path\+)/.test(r.destination) || r.destination.includes("/:path+"));
});
