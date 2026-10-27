import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { institutionalPage } from "@/lib/institutional";

const SITE = join(process.cwd(), "src", "app", "(site)");
const read = (p: string) => readFileSync(join(SITE, p), "utf8");

// FAZA 4.2E guards: privacy documents each processing activity; terms references
// ANPC/SAL but NOT the discontinued EU ODR platform; cookies reflects the empty
// demo allowlist; Terms stays held pending legal review.

test("privacy page documents all 7 processing activities + no-automated-decisions", () => {
  const src = read("politica-de-confidentialitate/page.tsx");
  for (const id of ["autentificare", "jurnal", "email", "hosting", "supabase", "demo", "afiliere"]) {
    assert.ok(src.includes(`id: "${id}"`), `privacy missing activity section "${id}"`);
  }
  assert.ok(/nu realizam profilare|decizii automate/i.test(src), "privacy missing automated-decisions statement");
});

test("terms references ANPC/SAL and NOT the discontinued EU ODR platform", () => {
  const src = read("termeni-si-conditii/page.tsx");
  assert.ok(src.includes("ANPC"), "terms should mention ANPC");
  assert.ok(/SAL|solutionare alternativa/i.test(src), "terms should mention SAL");
  assert.ok(!/consumers\/odr|ec\.europa\.eu\/consumers\/odr/i.test(src), "terms must not link the defunct ODR platform");
});

test("cookies page reflects that no demo provider is currently active", () => {
  const src = read("politica-de-cookies/page.tsx");
  assert.ok(/nu este activat niciun furnizor de continut demo/i.test(src), "cookies should state demo is not active");
});

test("Terms stays ready:false until legal sign-off", () => {
  assert.equal(institutionalPage("termeni-si-conditii")?.ready, false);
  assert.equal(institutionalPage("politica-de-confidentialitate")?.ready, true);
  assert.equal(institutionalPage("politica-de-cookies")?.ready, true);
});
