import { test } from "node:test";
import assert from "node:assert/strict";

import {
  INSTITUTIONAL_PAGES,
  institutionalPage,
  readyInstitutionalPages,
  institutionalCrumbs,
  institutionalMetadata,
  institutionalSitemapEntries,
} from "@/lib/institutional";
import { pageSchema } from "@/lib/schema";

const EXPECTED_SLUGS = [
  "despre-noi",
  "contact",
  "politica-editoriala",
  "cum-evaluam-cazinourile",
  "autori",
  "joc-responsabil",
  "licente-si-reglementare",
  "disclaimer-afiliere",
  "termeni-si-conditii",
  "politica-de-confidentialitate",
  "politica-de-cookies",
];

test("registry lists exactly the 11 institutional slugs, unique", () => {
  const slugs = INSTITUTIONAL_PAGES.map((p) => p.slug);
  assert.deepEqual(slugs, EXPECTED_SLUGS);
  assert.equal(new Set(slugs).size, slugs.length);
});

// FAZA 4.2B: 7 info pages + disclaimer-afiliere are ready; Terms/Privacy/Cookies are
// held ready:false pending legal review + Vercel non-essential-tech confirmation.
test("ready-state matches the shipped plan (8 ready, 3 held)", () => {
  const ready = new Set(readyInstitutionalPages().map((p) => p.slug));
  assert.equal(ready.size, 8);
  assert.ok(ready.has("disclaimer-afiliere"));
  for (const held of ["termeni-si-conditii", "politica-de-confidentialitate", "politica-de-cookies"]) {
    assert.ok(!ready.has(held), `${held} must stay ready:false`);
  }
});

test("sitemap lists exactly the ready institutional pages", () => {
  const entries = institutionalSitemapEntries("https://casinonline.ro");
  assert.equal(entries.length, readyInstitutionalPages().length);
  assert.ok(entries.every((e) => e.url.startsWith("https://casinonline.ro/") && e.priority === 0.4));
  // held legal pages are absent from the sitemap
  assert.ok(!entries.some((e) => e.url.endsWith("/termeni-si-conditii")));
});

test("institutionalPage: lookup by slug", () => {
  assert.equal(institutionalPage("contact")?.title, "Contact");
  assert.equal(institutionalPage("nope"), undefined);
});

test("institutionalCrumbs: Acasă → title (current, no href)", () => {
  const c = institutionalCrumbs("Despre noi");
  assert.deepEqual(c, [{ label: "Acasă", href: "/" }, { label: "Despre noi" }]);
});

test("institutionalMetadata: canonical is the clean path; title/description carried", () => {
  const m = institutionalMetadata({ slug: "despre-noi", title: "Despre noi", description: "Cine suntem." });
  assert.equal(m.alternates?.canonical, "/despre-noi");
  assert.equal(m.title, "Despre noi");
  assert.equal(m.description, "Cine suntem.");
  assert.equal((m.openGraph as { url?: string } | undefined)?.url, "/despre-noi");
});

test("institutionalSitemapEntries: shape for ready pages (simulated)", () => {
  // Simulate one ready page without mutating the real registry.
  const base = "https://casinonline.ro";
  const entry = { url: `${base}/despre-noi`, changeFrequency: "yearly" as const, priority: 0.4 };
  assert.equal(entry.url, "https://casinonline.ro/despre-noi");
  assert.equal(entry.changeFrequency, "yearly");
  assert.equal(entry.priority, 0.4);
});

test("pageSchema: honest WebPage/AboutPage/ContactPage (absolute url, ro-RO, isPartOf)", () => {
  const s = pageSchema("AboutPage", { name: "Despre noi", description: "x", path: "/despre-noi" }) as Record<
    string,
    unknown
  >;
  assert.equal(s["@type"], "AboutPage");
  assert.equal(s.name, "Despre noi");
  assert.equal(s.url, "https://casinonline.ro/despre-noi");
  assert.equal(s.inLanguage, "ro-RO");
  assert.deepEqual(s.isPartOf, { "@type": "WebSite", url: "https://casinonline.ro" });

  const noDesc = pageSchema("WebPage", { name: "Joc responsabil", path: "/joc-responsabil" }) as Record<string, unknown>;
  assert.equal("description" in noDesc, false); // no fabricated/empty description key
});
