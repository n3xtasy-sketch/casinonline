import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Metadata hygiene across the 9 shipped institutional + author routes: every page
 * must declare a `title`, and all titles must be unique (no duplicate <title> tags).
 * Canonicals are per-slug (institutional via institutionalMetadata, authors explicit),
 * so unique slugs already guarantee unique canonicals.
 */

const SITE = join(process.cwd(), "src", "app", "(site)");
const ROUTES = [
  "despre-noi/page.tsx",
  "contact/page.tsx",
  "politica-editoriala/page.tsx",
  "cum-evaluam-cazinourile/page.tsx",
  "autori/page.tsx",
  "joc-responsabil/page.tsx",
  "licente-si-reglementare/page.tsx",
  "autori/radu-bogdan-gabriel/page.tsx",
  "autori/radu-teodora-bianca/page.tsx",
];

function titleOf(src: string): string | null {
  const m = src.match(/title:\s*(?:"([^"]+)"|'([^']+)')/);
  return m ? (m[1] ?? m[2]) : null;
}

test("each institutional/author route declares a title", () => {
  for (const r of ROUTES) {
    const src = readFileSync(join(SITE, r), "utf8");
    assert.ok(titleOf(src), `route ${r} has no metadata title`);
  }
});

test("all institutional/author titles are unique", () => {
  const titles = ROUTES.map((r) => titleOf(readFileSync(join(SITE, r), "utf8")));
  const seen = new Map<string, string>();
  titles.forEach((t, i) => {
    assert.ok(t, `missing title in ${ROUTES[i]}`);
    assert.ok(!seen.has(t!), `duplicate title "${t}" in ${ROUTES[i]} and ${seen.get(t!)}`);
    seen.set(t!, ROUTES[i]);
  });
  assert.equal(seen.size, ROUTES.length);
});

test("author routes set an explicit canonical", () => {
  for (const r of ["autori/radu-bogdan-gabriel/page.tsx", "autori/radu-teodora-bianca/page.tsx"]) {
    const src = readFileSync(join(SITE, r), "utf8");
    assert.ok(/canonical:\s*["']\/autori\//.test(src), `author route ${r} missing /autori/ canonical`);
  }
});
