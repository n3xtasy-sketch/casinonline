import { test } from "node:test";
import assert from "node:assert/strict";

import {
  INSTITUTIONAL_PAGES,
  readyInstitutionalByGroup,
  institutionalFooterLinks,
} from "@/lib/institutional";

// Footer splits ready pages into "info" and "legal" columns; not-ready pages appear
// in neither. Guards the FAZA 4.2B grouping + the publish gate for legal pages.

test("info group = the 7 editorial/EEAT pages, all ready", () => {
  const info = readyInstitutionalByGroup("info").map((p) => p.slug);
  assert.deepEqual(info.sort(), [
    "autori",
    "contact",
    "cum-evaluam-cazinourile",
    "despre-noi",
    "joc-responsabil",
    "licente-si-reglementare",
    "politica-editoriala",
  ]);
});

test("legal group shows the ready legal pages; Terms stays held", () => {
  const legal = readyInstitutionalByGroup("legal").map((p) => p.slug).sort();
  assert.deepEqual(legal, ["disclaimer-afiliere", "politica-de-confidentialitate", "politica-de-cookies"]);
  // Terms exists in the registry but is not ready → not in the Footer.
  const heldInRegistry = INSTITUTIONAL_PAGES.filter((p) => p.group === "legal" && !p.ready).map((p) => p.slug);
  assert.deepEqual(heldInRegistry, ["termeni-si-conditii"]);
});

test("Footer links never include a not-ready page", () => {
  const notReady = new Set(INSTITUTIONAL_PAGES.filter((p) => !p.ready).map((p) => `/${p.slug}`));
  for (const l of institutionalFooterLinks()) {
    assert.ok(!notReady.has(l.href), `not-ready page ${l.href} leaked into Footer`);
  }
});
