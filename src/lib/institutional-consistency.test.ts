import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  INSTITUTIONAL_PAGES,
  readyInstitutionalPages,
  institutionalFooterLinks,
  institutionalSitemapEntries,
} from "@/lib/institutional";

/**
 * Consistency guards between the registry `ready` flag and reality. These catch the
 * three ways an institutional page could leak while incomplete:
 *   (a) ready:true without a route file → Footer/sitemap would link a 404.
 *   (b) a route file that bypasses the publish guard → incomplete page served.
 *   (c) a not-ready page appearing in the sitemap or Footer.
 * Runs from the project root (npm test). No network, no DB.
 */

const routeFile = (slug: string) => join(process.cwd(), "src", "app", "(site)", slug, "page.tsx");

// (a) Every READY page must have a route file — otherwise its sitemap/Footer link 404s.
test("consistency (a): every ready page has a route file", () => {
  for (const p of readyInstitutionalPages()) {
    assert.ok(existsSync(routeFile(p.slug)), `ready page "${p.slug}" has no route file at ${routeFile(p.slug)}`);
  }
});

// (b) Any institutional route file that exists must render through <InstitutionalPage>,
// which enforces the `ready` publish gate (notFound when not ready). A route that
// skips it could serve an incomplete page.
test("consistency (b): every institutional route renders through the guarded InstitutionalPage", () => {
  for (const p of INSTITUTIONAL_PAGES) {
    const f = routeFile(p.slug);
    if (!existsSync(f)) continue; // no route yet → cannot be served, fine
    const src = readFileSync(f, "utf8");
    assert.ok(
      src.includes("InstitutionalPage"),
      `route "${p.slug}" exists but does not use InstitutionalPage (publish guard bypassed)`,
    );
  }
});

// (c) Not-ready pages must never surface in the Footer or the sitemap.
test("consistency (c): no not-ready page appears in Footer links or sitemap entries", () => {
  const notReady = new Set(INSTITUTIONAL_PAGES.filter((p) => !p.ready).map((p) => `/${p.slug}`));

  for (const l of institutionalFooterLinks()) {
    assert.ok(!notReady.has(l.href), `not-ready page "${l.href}" is linked in the Footer`);
  }
  const base = "https://casinonline.ro";
  for (const e of institutionalSitemapEntries(base)) {
    const path = e.url.replace(base, "");
    assert.ok(!notReady.has(path), `not-ready page "${path}" is in the sitemap`);
  }
});

// Invariant tying it together: Footer links and sitemap entries are EXACTLY the ready set.
test("consistency: Footer + sitemap sets equal the ready set", () => {
  const ready = readyInstitutionalPages().map((p) => `/${p.slug}`).sort();
  assert.deepEqual(institutionalFooterLinks().map((l) => l.href).sort(), ready);
  assert.deepEqual(
    institutionalSitemapEntries("https://casinonline.ro").map((e) => e.url.replace("https://casinonline.ro", "")).sort(),
    ready,
  );
});
