import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { AUTHORS, authorBySlug, readyAuthors } from "@/lib/authors";
import { institutionalFooterLinks } from "@/lib/institutional";

const routeFile = (slug: string) => join(process.cwd(), "src", "app", "(site)", "autori", slug, "page.tsx");

test("authors registry: expected slugs, unique, no fabricated numeric claims in bios", () => {
  const slugs = AUTHORS.map((a) => a.slug);
  assert.deepEqual(slugs, ["radu-bogdan-gabriel", "radu-teodora-bianca"]);
  assert.equal(new Set(slugs).size, slugs.length);
});

test("authorBySlug: lookup", () => {
  assert.equal(authorBySlug("radu-bogdan-gabriel")?.name, "Radu Bogdan Gabriel");
  assert.equal(authorBySlug("nope"), undefined);
});

test("every ready author has a route file (no ready author 404s)", () => {
  for (const a of readyAuthors()) {
    assert.ok(existsSync(routeFile(a.slug)), `ready author "${a.slug}" has no route file`);
  }
});

test("every author route renders through the guarded AuthorProfile", () => {
  for (const a of AUTHORS) {
    const f = routeFile(a.slug);
    if (!existsSync(f)) continue;
    const src = readFileSync(f, "utf8");
    assert.ok(src.includes("AuthorProfile"), `author route "${a.slug}" bypasses AuthorProfile guard`);
  }
});

// Individual author profiles must NOT be footer-linked — only the /autori hub is.
test("individual author pages are not linked in the Footer", () => {
  const footer = new Set(institutionalFooterLinks().map((l) => l.href));
  for (const a of AUTHORS) {
    assert.ok(!footer.has(`/autori/${a.slug}`), `author "${a.slug}" leaked into Footer links`);
  }
  // The hub itself IS linked.
  assert.ok(footer.has("/autori"));
});

// Honesty guard: bios must not claim CasinOnline-specific testing or invented volume
// ("am testat N cazinouri pe casinonline"). Prior-site/general experience is allowed.
test("bios do not attribute test results to CasinOnline", () => {
  for (const a of AUTHORS) {
    const text = [...a.bio, ...a.experience, ...a.specializations].join(" ").toLowerCase();
    assert.ok(!/cazinouri testate pe casinonline|am testat .* casinonline/.test(text), `author "${a.slug}" bio over-claims`);
  }
});
