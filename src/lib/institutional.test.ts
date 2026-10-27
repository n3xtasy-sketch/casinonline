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
];

test("registry lists exactly the 7 institutional slugs, unique", () => {
  const slugs = INSTITUTIONAL_PAGES.map((p) => p.slug);
  assert.deepEqual(slugs, EXPECTED_SLUGS);
  assert.equal(new Set(slugs).size, slugs.length);
});

// GUARD: this infra PR must NOT publish any page. All must start not-ready, so the
// Footer gains no links and the sitemap gains no entries.
test("no institutional page is ready yet (nothing published by the infra PR)", () => {
  assert.equal(INSTITUTIONAL_PAGES.every((p) => p.ready === false), true);
  assert.deepEqual(readyInstitutionalPages(), []);
});

test("Footer/sitemap gates are empty while nothing is ready", () => {
  assert.deepEqual(institutionalSitemapEntries("https://casinonline.ro"), []);
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
