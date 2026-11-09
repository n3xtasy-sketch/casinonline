import { test } from "node:test";
import assert from "node:assert/strict";
import { editorialQualityCheck } from "@/lib/ai/quality-gate";
import type { GeneratedSection } from "@/lib/ai/content-output";

const base = (over: Partial<GeneratedSection> = {}): GeneratedSection => ({
  sectionId: "s0", heading: "Ce este rulajul unui bonus",
  content: "Rulajul unui bonus arata de cate ori trebuie pariata suma inainte de retragere. La un rulaj de 30x pentru un bonus de 100 lei, pariezi 3000 lei. Castigul din rotiri gratuite are adesea propriul rulaj, separat de cel al depunerii.",
  keywordsUsed: ["rulaj bonus"], entitiesUsed: [], internalLinks: [], factualClaims: [], warnings: [],
  ...over,
});

test("specific, informative section → no editorial warnings", () => {
  const r = editorialQualityCheck(base(), ["rulaj bonus"]);
  assert.deepEqual(r.warnings, []);
});

test("generic/bland marketing phrasing → warning + suggestion", () => {
  const r = editorialQualityCheck(base({ content: "In lumea cazinourilor online, atunci cand vine vorba de bonusuri, este important de retinut cateva aspecte. In concluzie, descopera ofertele." }));
  assert.ok(r.warnings.some((w) => /generice\/marketing/i.test(w)));
  assert.ok(r.suggestions.length > 0);
});

test("unjustified superlatives + categorical claims → warnings", () => {
  const sup = editorialQualityCheck(base({ content: "Acesta este cel mai bun bonus, pur si simplu senzational si incredibil pentru orice jucator roman." }));
  assert.ok(sup.warnings.some((w) => /Superlative/i.test(w)));
  const cat = editorialQualityCheck(base({ content: "Un bonus fara depunere este intotdeauna garantat si functioneaza fara exceptie la toate cazinourile." }));
  assert.ok(cat.warnings.some((w) => /categorice/i.test(w)));
});

test("claimed personal testing (soft form) → warning", () => {
  const r = editorialQualityCheck(base({ content: "Din experienta mea, dupa ce am testat zeci de oferte, rulajul conteaza cel mai mult la retragere." }));
  assert.ok(r.warnings.some((w) => /testare\/verificare personala/i.test(w)));
});

test("excessive keyword repetition → editorial warning (softer than the hard validator)", () => {
  const stuffed = base({ content: "bonus fara depunere este util. bonus fara depunere cere rulaj. bonus fara depunere are plafon. bonus fara depunere expira." });
  const r = editorialQualityCheck(stuffed, ["bonus fara depunere"]);
  assert.ok(r.warnings.some((w) => /apare de \d+ ori/i.test(w)));
});

test("thin contribution: short text with no concrete signal → warning", () => {
  const r = editorialQualityCheck(base({ heading: "Avantaje", content: "Acest tip de oferta este util si avantajos pentru jucatori." }));
  assert.ok(r.warnings.some((w) => /Contributie informativa redusa/i.test(w)));
});

test("mere title restatement → warning", () => {
  const r = editorialQualityCheck(base({ heading: "Cum revendici bonusul", content: "Cum revendici bonusul? Iata cum revendici bonusul pas cu pas." }));
  assert.ok(r.warnings.some((w) => /reformuleze titlul/i.test(w)));
});

test("empty content → empty report (advisory, never throws)", () => {
  const r = editorialQualityCheck(base({ content: "" }), ["x"]);
  assert.deepEqual(r, { warnings: [], suggestions: [] });
});
