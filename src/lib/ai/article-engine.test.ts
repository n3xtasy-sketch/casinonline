import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildArticlePlan, generateArticle } from "@/lib/ai/article-engine";
import { listSections, type ContentBrief, type ContentPromptInput } from "@/lib/ai/content-prompt";
import type { CompleteFn } from "@/lib/ai/generate-section";
import type { EntityRecord } from "@/lib/seo/entity-registry";

const BRIEF: ContentBrief = {
  title: "Bonus fara depunere", primaryKeyword: "bonus fara depunere", secondaryKeywords: ["rotiri gratuite"],
  intent: "commercial", targetUrl: "/bonusuri/bonus-fara-depunere", h1: "Bonusuri fara depunere",
  outline: [{ level: 2, heading: "Rulaj", keywords: ["rulaj"], note: "" }, { level: 2, heading: "KYC", keywords: ["kyc"], note: "" }],
  entities: [], faq: [{ question: "Ce rulaj are?", answer: "" }],
};
const NETBET: EntityRecord = { id: "casino:u1", type: "casino", cmsId: "u1", name: "Netbet Casino", slug: "netbet-casino", aliases: [], status: "published", publicUrl: "/cazinouri-online/netbet-casino", provenance: "cms", attributes: {} };
const INPUTS: ContentPromptInput[] = listSections(BRIEF).map((s) => ({
  pageType: "bonus_category", brief: BRIEF, cmsEntities: [NETBET], cmsRelations: [], internalLinks: [], cmsFacts: [], authorKnowledge: [], sectionId: s.id,
}));

const COVER = "Explicatie generala despre rulaj, kyc, bonus fara depunere si rotiri gratuite, utila pentru cititor.";
const section = (over: Record<string, unknown> = {}) => ({ sectionId: "x", heading: "x", content: COVER, keywordsUsed: [], entitiesUsed: [], internalLinks: [], factualClaims: [], warnings: [], ...over });
const okMock: CompleteFn = async () => ({ output: section(), stopReason: "tool_use", usage: { inputTokens: 1000, outputTokens: 300 }, model: "mock" });

// ── plan ──
test("buildArticlePlan: ordered sections, per-section purpose/topics, anti-repeat accumulation", () => {
  const plan = buildArticlePlan(INPUTS);
  assert.equal(plan.h1, "Bonusuri fara depunere");
  assert.equal(plan.primaryIntent, "commercial");
  assert.deepEqual(plan.sections.map((s) => s.sectionId), ["intro", "s0-rulaj", "s1-kyc", "faq"]);
  const rulaj = plan.sections.find((s) => s.sectionId === "s0-rulaj")!;
  assert.deepEqual(rulaj.topicsToCover, ["rulaj"]);
  assert.ok(rulaj.purpose.length > 0 && rulaj.expectedContribution.length > 0);
  assert.deepEqual(rulaj.relevantEntities, ["Netbet Casino"]);
  // KYC comes after Rulaj → its "do not repeat" list already contains the rulaj topic + heading
  const kyc = plan.sections.find((s) => s.sectionId === "s1-kyc")!;
  assert.ok(kyc.topicsNotToRepeat.includes("rulaj") && kyc.topicsNotToRepeat.includes("Rulaj"));
});

// ── generation ──
test("generateArticle: generates all sections in order, status ok, token usage summed", async () => {
  const r = await generateArticle(INPUTS, okMock);
  assert.deepEqual(r.sections.map((s) => s.sectionId), ["intro", "s0-rulaj", "s1-kyc", "faq"]);
  assert.equal(r.status, "ok");
  assert.deepEqual(r.tokenUsage, { inputTokens: 4000, outputTokens: 1200 }); // 4 sections × (1000/300)
  assert.equal(r.sections.every((s) => s.result.ok), true);
});

test("assembledContent: intro has no heading marker; H2 sections are prefixed with ##", async () => {
  const r = await generateArticle(INPUTS, okMock);
  assert.match(r.assembledContent, /## Rulaj/);
  assert.match(r.assembledContent, /## KYC/);
  assert.ok(r.assembledContent.startsWith(COVER)); // intro content first, no marker
});

test("prior-section recap is passed to every section AFTER the first (coherence)", async () => {
  const seen: string[] = [];
  const cap: CompleteFn = async ({ user }) => { seen.push(user); return { output: section(), stopReason: "tool_use", usage: { inputTokens: 10, outputTokens: 10 }, model: "m" }; };
  await generateArticle(INPUTS, cap);
  assert.doesNotMatch(seen[0], /SECTIUNI ANTERIOARE/); // intro: no prior
  assert.match(seen[1], /SECTIUNI ANTERIOARE/);        // rulaj: recap of intro
  assert.match(seen[3], /SECTIUNI ANTERIOARE/);        // faq: recap of prior
});

// ── diagnostics ──
test("editorial diagnostics: missing topics detected when the content omits one", async () => {
  const noKyc: CompleteFn = async () => ({ output: section({ content: "Text despre rulaj si bonus fara depunere si rotiri gratuite." }), stopReason: "tool_use", usage: { inputTokens: 10, outputTokens: 10 }, model: "m" });
  const r = await generateArticle(INPUTS, noKyc);
  assert.ok(r.editorialDiagnostics.missingTopics.includes("kyc"));
  // a covered topic is NOT reported missing
  assert.ok(!r.editorialDiagnostics.missingTopics.includes("rulaj"));
});

test("editorial diagnostics: a sentence repeated across sections is flagged", async () => {
  const r = await generateArticle(INPUTS, okMock); // same COVER sentence in every section
  assert.ok(r.editorialDiagnostics.repeatedAcrossSections.some((x) => x.sectionIds.length >= 2));
});

test("factual diagnostics: unsupported claims + verdict totals are aggregated (only the bad section fails)", async () => {
  let n = 0; // only the 2nd section emits an invented-source claim
  const invented: CompleteFn = async () => { n += 1; return { output: n === 2 ? section({ factualClaims: [{ claim: "rulaj 30x", sourceRef: "https://inventat.example" }] }) : section(), stopReason: "tool_use", usage: { inputTokens: 10, outputTokens: 10 }, model: "m" }; };
  const r = await generateArticle(INPUTS, invented);
  assert.ok(r.factualDiagnostics.claimVerdictTotals.invented >= 1);
  assert.ok(r.factualDiagnostics.unsupportedClaims.some((c) => c.verdict === "invented" && c.sectionId === "s0-rulaj"));
  assert.equal(r.status, "partial"); // one section invalid, the rest valid
});

test("a failed section does NOT abort the article (partial) and stays individually editable", async () => {
  let n = 0;
  const flaky: CompleteFn = async () => { n += 1; return n === 2 ? { output: null, stopReason: "end_turn", usage: { inputTokens: 10, outputTokens: 0 }, model: "m" } : { output: section(), stopReason: "tool_use", usage: { inputTokens: 10, outputTokens: 10 }, model: "m" }; };
  const r = await generateArticle(INPUTS, flaky);
  assert.equal(r.status, "partial");
  assert.equal(r.sections.length, 4); // all attempted; none skipped
  assert.equal(r.sections[1].result.ok, false); // the 2nd section failed
  assert.equal(r.sections[1].result.errorKind, "parse_error");
  assert.ok(r.sections[1].sectionId.length > 0); // editable: carries its own id
});

// ── safety ──
test("article-engine never imports the Anthropic SDK (generation only via injected complete)", () => {
  const src = readFileSync(`${process.cwd()}/src/lib/ai/article-engine.ts`, "utf8");
  assert.doesNotMatch(src, /@anthropic-ai\/sdk/);
  assert.doesNotMatch(src, /createAnthropicComplete/);
  assert.doesNotMatch(src, /\.(insert|update|upsert|delete)\(/); // no CMS writes
});
