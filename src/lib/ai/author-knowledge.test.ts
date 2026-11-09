import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AUTHOR_KNOWLEDGE, KNOWLEDGE_CATEGORIES, KNOWLEDGE_STATUSES, KNOWLEDGE_CAP,
  validateKnowledgeEntry, validateKnowledgeRegistry, publishedKnowledge,
  selectAuthorKnowledge, estimateKnowledgeTokens, knowledgeSelectionMeta,
  type AuthorKnowledge, type KnowledgeContext,
} from "@/lib/ai/author-knowledge";
import { isKnownAuthor } from "@/lib/authors";
import { readFileSync } from "node:fs";

const base = (over: Partial<AuthorKnowledge> = {}): AuthorKnowledge => ({
  id: "test-entry", category: "expert_explanation", title: "Titlu",
  content: "Explicatie generala corecta despre rulaj si conditii, suficient de lunga pentru validare.",
  author: "radu-bogdan-gabriel", provenance: "author_expertise", status: "published",
  applicability: { topics: ["rulaj"] }, ...over,
});
const errs = (list: ReturnType<typeof validateKnowledgeEntry>) => list.filter((i) => i.level === "error");

// ── registry health ────────────────────────────────────────────────────────────
test("registry has 6-8 entries and passes validation with ZERO errors AND zero risk warnings", () => {
  assert.ok(AUTHOR_KNOWLEDGE.length >= 6 && AUTHOR_KNOWLEDGE.length <= 8);
  const issues = validateKnowledgeRegistry();
  assert.deepEqual(issues, [], `registry issues: ${JSON.stringify(issues)}`); // no errors, no advisory flags either
});

test("registry ids are unique + kebab-case", () => {
  const ids = AUTHOR_KNOWLEDGE.map((k) => k.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});

test("every entry uses a known author, a valid category + status", () => {
  for (const k of AUTHOR_KNOWLEDGE) {
    assert.ok(isKnownAuthor(k.author), `unknown author ${k.author}`);
    assert.ok(KNOWLEDGE_CATEGORIES.includes(k.category));
    assert.ok(KNOWLEDGE_STATUSES.includes(k.status));
  }
});

test("registry covers the required editorial topics", () => {
  const blob = AUTHOR_KNOWLEDGE.map((k) => `${k.id} ${k.title} ${k.content} ${(k.applicability.topics ?? []).join(" ")}`.toLowerCase()).join("\n");
  for (const t of ["rulaj", "castig", "max win", "retragere", "kyc", "jocuri eligibile", "valabilitate", "comparar", "faq"]) {
    assert.ok(blob.includes(t), `topic lipsa: ${t}`);
  }
  // all three categories are represented
  const cats = new Set(AUTHOR_KNOWLEDGE.map((k) => k.category));
  assert.ok(cats.has("expert_explanation") && cats.has("editorial_observation") && cats.has("writing_guidance"));
});

// ── no invented personal experience ─────────────────────────────────────────────
test("no entry claims personal experience / testing (hard safety)", () => {
  for (const k of AUTHOR_KNOWLEDGE) {
    assert.ok(!errs(validateKnowledgeEntry(k)).some((i) => /experienta\/testare personala/.test(i.message)), `personal-experience in ${k.id}`);
  }
  // a crafted personal-experience entry IS rejected
  const bad = base({ content: "Din experienta mea, am testat zeci de bonusuri si recomand asta." });
  assert.ok(errs(validateKnowledgeEntry(bad)).some((i) => /experienta\/testare personala/.test(i.message)));
});

// ── invalid entries are caught ───────────────────────────────────────────────────
test("invalid entries: bad id / category / status / unknown author / empty content / empty applicability", () => {
  assert.ok(errs(validateKnowledgeEntry(base({ id: "Bad Id!" }))).some((i) => /id invalid/.test(i.message)));
  assert.ok(errs(validateKnowledgeEntry(base({ category: "nope" as never }))).some((i) => /categorie invalida/.test(i.message)));
  assert.ok(errs(validateKnowledgeEntry(base({ status: "live" as never }))).some((i) => /status invalid/.test(i.message)));
  assert.ok(errs(validateKnowledgeEntry(base({ author: "ghost-author" }))).some((i) => /autor necunoscut/.test(i.message)));
  assert.ok(errs(validateKnowledgeEntry(base({ content: "scurt" }))).some((i) => /content gol sau prea scurt/.test(i.message)));
  assert.ok(errs(validateKnowledgeEntry(base({ applicability: {} }))).some((i) => /applicability goala/.test(i.message)));
  assert.ok(errs(validateKnowledgeEntry(base({ applicability: { pageTypes: ["nope" as never] } }))).some((i) => /pageTypes/.test(i.message)));
});

test("duplicate ids in a registry are detected", () => {
  const dup = [base({ id: "x" }), base({ id: "x" })];
  assert.ok(validateKnowledgeRegistry(dup).some((i) => /id duplicat/.test(i.message)));
});

// ── advisory factual-risk heuristic (warning, not a proof) ───────────────────────
test("operator-specific figures are flagged as advisory warnings (not errors)", () => {
  const withValue = base({ content: "Acest bonus ofera 500 RON cu rulaj de 30x la operatorul respectiv, conform ofertei." });
  const issues = validateKnowledgeEntry(withValue);
  assert.ok(issues.some((i) => i.level === "warning" && /valoare factuala specifica/.test(i.message)));
  assert.equal(errs(issues).length, 0); // advisory only — does not hard-fail
});

// ── compatibility ────────────────────────────────────────────────────────────────
test("publishedKnowledge returns only published entries", () => {
  const list = [base({ id: "a", status: "published" }), base({ id: "b", status: "draft" }), base({ id: "c", status: "archived" })];
  assert.deepEqual(publishedKnowledge(list).map((k) => k.id), ["a"]);
  assert.ok(publishedKnowledge().length === AUTHOR_KNOWLEDGE.length); // seed registry is all published
});

// ── AI-2.9B: scoped retrieval ────────────────────────────────────────────────────
const ctx = (over: Partial<KnowledgeContext> = {}): KnowledgeContext => ({
  pageType: "bonus_category", searchIntent: "informational", sectionKind: "outline",
  sectionHeading: "", primaryKeyword: "bonus fara depunere", secondaryKeywords: [], relevantEntityIds: [], ...over,
});
const ids = (list: AuthorKnowledge[]) => list.map((k) => k.id);

test("selection for rulaj: picks the wagering explainer", () => {
  const sel = selectAuthorKnowledge(AUTHOR_KNOWLEDGE, ctx({ sectionHeading: "Cum se calculeaza rulajul bonusului" }));
  assert.ok(ids(sel).includes("wagering-basis-explainer"));
});

test("selection for KYC: picks the KYC entry; FAQ guidance excluded on a non-FAQ section", () => {
  const sel = selectAuthorKnowledge(AUTHOR_KNOWLEDGE, ctx({ sectionHeading: "Verificarea KYC la bonusurile fara depunere", sectionKind: "outline" }));
  assert.ok(ids(sel).includes("kyc-and-claiming"));
  assert.ok(!ids(sel).includes("faq-writing-guidance")); // sectionKinds gate (faq only)
});

test("selection for FAQ: includes FAQ writing guidance + the topic-relevant explainer", () => {
  const sel = selectAuthorKnowledge(AUTHOR_KNOWLEDGE, ctx({ sectionKind: "faq", sectionHeading: "Ce rulaj are bonusul fara depunere?" }));
  assert.ok(ids(sel).includes("faq-writing-guidance"));
  assert.ok(ids(sel).includes("wagering-basis-explainer"));
});

test("section with no matches → empty (pageType/intent alone is not enough)", () => {
  const sel = selectAuthorKnowledge(AUTHOR_KNOWLEDGE, ctx({ pageType: "guide", sectionKind: "intro", sectionHeading: "Istoria jocurilor de noroc", primaryKeyword: "istorie cazino", secondaryKeywords: [] }));
  assert.deepEqual(sel, []);
});

test("excludes draft/archived entries even on a perfect topic match", () => {
  const reg: AuthorKnowledge[] = [
    { ...AUTHOR_KNOWLEDGE[0], id: "draft-rulaj", status: "draft" },
    { ...AUTHOR_KNOWLEDGE[0], id: "archived-rulaj", status: "archived" },
  ];
  assert.deepEqual(selectAuthorKnowledge(reg, ctx({ sectionHeading: "rulaj bonus" })), []);
});

test("caps at KNOWLEDGE_CAP (4) + entityId match contributes", () => {
  const sel = selectAuthorKnowledge(AUTHOR_KNOWLEDGE, ctx({
    sectionHeading: "rulaj castig maxim kyc jocuri eligibile valabilitate comparatie",
    primaryKeyword: "bonus fara depunere rulaj castig kyc", relevantEntityIds: ["bonus_type:fara-depunere"],
  }));
  assert.ok(sel.length <= KNOWLEDGE_CAP);
  assert.equal(sel.length, 4);
});

test("deterministic order + no duplicates (stable across runs, tie-break by id)", () => {
  const c = ctx({ sectionHeading: "rulaj si castig maxim", primaryKeyword: "bonus fara depunere rulaj castig" });
  const a = ids(selectAuthorKnowledge(AUTHOR_KNOWLEDGE, c));
  const b = ids(selectAuthorKnowledge(AUTHOR_KNOWLEDGE, c));
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, a.length);
});

test("token estimate + selection meta (documented ~4 chars/token)", () => {
  const sel = selectAuthorKnowledge(AUTHOR_KNOWLEDGE, ctx({ sectionHeading: "rulaj bonus" }));
  const meta = knowledgeSelectionMeta(sel);
  assert.equal(meta.selectedKnowledgeCount, sel.length);
  assert.deepEqual(meta.selectedKnowledgeIds, sel.map((k) => k.id));
  assert.ok(meta.estimatedKnowledgeTokens > 0);
  assert.equal(estimateKnowledgeTokens([]), 0);
});

// ── PASUL 4: FACTUAL ISOLATION (source-regression — no coupling in either direction) ──
const read = (p: string) => readFileSync(`${process.cwd()}/${p}`, "utf8");

test("author-knowledge is NOT imported by the factual layers (cms-facts / fact-verification / validator)", () => {
  for (const p of ["src/lib/ai/cms-facts.ts", "src/lib/ai/fact-verification.ts", "src/lib/ai/content-output.ts"]) {
    assert.doesNotMatch(read(p), /author-knowledge/, `${p} must not import author-knowledge`);
  }
});

test("author-knowledge does NOT import the factual layers (interpretation stays separate from facts)", () => {
  const src = read("src/lib/ai/author-knowledge.ts");
  assert.doesNotMatch(src, /from "@\/lib\/ai\/cms-facts"/);
  assert.doesNotMatch(src, /from "@\/lib\/ai\/fact-verification"/);
  assert.doesNotMatch(src, /from "@\/lib\/ai\/content-output"/);
  // AI-2.9A is registry-only: it imports only the author registry + prompt TYPES (no factual-layer values).
  assert.doesNotMatch(src, /import\s+\{[^}]*\}\s+from\s+"@\/lib\/ai\/(cms-facts|fact-verification|content-output)"/);
});
