/**
 * AI-3A Premium Article Engine (MVP) — PURE orchestration over the EXISTING section pipeline. It plans a
 * full article deterministically from the brief, generates the sections IN ORDER by reusing
 * runSectionGeneration (dependency-injected `complete` — a mock in tests, the real adapter in a server
 * action), passes a compact recap of prior sections for coherence, validates each section with the
 * UNCHANGED factual validator, assembles the article, and produces article-level factual + editorial
 * diagnostics. It never calls Anthropic itself, never writes to the CMS, never invents facts, and keeps
 * each section independently editable (sections[] carry their own sectionId + result).
 */

import { runSectionGeneration, type CompleteFn, type SectionGenerationResult } from "@/lib/ai/generate-section";
import { listSections, buildContentPrompt, type ContentPromptInput, type SectionKind } from "@/lib/ai/content-prompt";
import { briefReadinessError } from "@/lib/brief-status";
import type { ClaimVerdict } from "@/lib/ai/fact-verification";

/** Upper bound on the sections an article run will generate (= max Anthropic calls). */
export const MAX_ARTICLE_SECTIONS = 12;

// ── Article plan (PASUL 2) ──────────────────────────────────────────────────────────
export interface ArticleSectionPlan {
  sectionId: string;
  kind: SectionKind;
  level: 1 | 2 | 3;
  heading: string;
  /** The unique goal of this section. */
  purpose: string;
  /** Topics this section must cover (its keywords). */
  topicsToCover: string[];
  /** Topics already covered by earlier sections — do NOT repeat. */
  topicsNotToRepeat: string[];
  /** CMS fact ids available to ground this section. */
  availableFactIds: string[];
  /** Confirmed CMS entities relevant here. */
  relevantEntities: string[];
  expectedContribution: string;
}

export interface ArticlePlan {
  h1: string;
  primaryIntent: string | null;
  primaryKeyword: string;
  sections: ArticleSectionPlan[];
}

const lc = (s: string) => s.toLowerCase();

function sectionPurpose(kind: SectionKind): string {
  if (kind === "intro") return "Deschide subiectul direct, ofera o observatie practica utila si spune ce va afla cititorul.";
  if (kind === "faq") return "Raspunde direct la fiecare intrebare, apoi adauga un detaliu util; fara umplutura.";
  return "Raspunde concret intentiei sectiunii: explica mecanici si diferente, cu un unghi concret si fara repetitii.";
}
function sectionContribution(kind: SectionKind): string {
  if (kind === "intro") return "Context + o observatie de specialist, fara definitii generice.";
  if (kind === "faq") return "Raspunsuri scurte, exacte, fundamentate pe fapte verificate cand exista.";
  return "O informatie concreta si utila (mecanica, conditie, comparatie), fara valori inventate.";
}

/** Build a deterministic article plan from the ordered section inputs (all share the same brief). */
export function buildArticlePlan(inputs: ContentPromptInput[]): ArticlePlan {
  const brief = inputs[0]?.brief;
  if (!brief) return { h1: "", primaryIntent: null, primaryKeyword: "", sections: [] };
  const allSections = listSections(brief);
  const covered: string[] = [];
  const sections: ArticleSectionPlan[] = [];
  for (const input of inputs) {
    const sec = allSections.find((s) => s.id === input.sectionId);
    if (!sec) continue;
    sections.push({
      sectionId: sec.id,
      kind: sec.kind,
      level: sec.level,
      heading: sec.heading,
      purpose: sectionPurpose(sec.kind),
      topicsToCover: sec.keywords,
      topicsNotToRepeat: [...covered],
      availableFactIds: (input.cmsFacts ?? []).map((f) => f.factId),
      relevantEntities: (input.cmsEntities ?? []).map((e) => e.name),
      expectedContribution: sectionContribution(sec.kind),
    });
    covered.push(...sec.keywords, sec.heading);
  }
  return { h1: brief.h1 || brief.title, primaryIntent: brief.intent, primaryKeyword: brief.primaryKeyword, sections };
}

// ── Generation (PASUL 3) ────────────────────────────────────────────────────────────
export interface ArticleSectionOutcome {
  sectionId: string;
  heading: string;
  kind: SectionKind;
  level: 1 | 2 | 3;
  result: SectionGenerationResult;
}

/** Compact recap of the already-generated sections (heading + a short gist), for coherence. */
function summarizePrior(done: { heading: string; content: string }[], perChars: number): string {
  if (!done.length) return "";
  return done
    .filter((d) => d.content.trim())
    .map((d) => `- ${d.heading}: ${d.content.trim().slice(0, perChars)}${d.content.trim().length > perChars ? "…" : ""}`)
    .join("\n");
}

export interface AssembleItem {
  kind: SectionKind;
  level: 1 | 2 | 3;
  heading: string;
  content: string;
}

/** Assemble sections into article markdown (intro unheaded; H2/H3 prefixed). Pure — also used client-side
 *  to RE-compute the markdown after an editor edits a section's content. */
export function assembleSections(items: AssembleItem[]): string {
  return items
    .map((s) => {
      const content = s.content.trim();
      if (!content) return `> [Sectiune de regenerat: ${s.heading}]`;
      if (s.kind === "intro") return content;
      return `${"#".repeat(Math.min(3, s.level))} ${s.heading}\n\n${content}`;
    })
    .join("\n\n");
}

function assemble(sections: ArticleSectionOutcome[]): string {
  return assembleSections(sections.map((s) => ({ kind: s.kind, level: s.level, heading: s.heading, content: s.result.section?.content ?? "" })));
}

export interface ArticleFactualDiagnostics {
  claimVerdictTotals: Record<ClaimVerdict, number>;
  sectionsWithValidationErrors: { sectionId: string; errors: string[] }[];
  unsupportedClaims: { sectionId: string; claim: string; verdict: ClaimVerdict; reason?: string }[];
  /** Same sourceRef cited with different values across sections (heuristic, not exhaustive). */
  contradictions: { sourceRef: string; sectionIds: string[] }[];
}

const VERDICTS: readonly ClaimVerdict[] = ["supported", "unverifiable", "invented", "contradictory", "expired"];
const extractNumbers = (s: string): string[] => (s.match(/\d+(?:[.,]\d+)?/g) ?? []);

function factualDiagnostics(sections: ArticleSectionOutcome[]): ArticleFactualDiagnostics {
  const claimVerdictTotals = Object.fromEntries(VERDICTS.map((v) => [v, 0])) as Record<ClaimVerdict, number>;
  const sectionsWithValidationErrors: { sectionId: string; errors: string[] }[] = [];
  const unsupportedClaims: ArticleFactualDiagnostics["unsupportedClaims"] = [];
  const bySourceRef = new Map<string, { sectionId: string; values: string }[]>();

  for (const s of sections) {
    const v = s.result.validation;
    if (v?.errors.length) sectionsWithValidationErrors.push({ sectionId: s.sectionId, errors: v.errors });
    for (const c of v?.claimChecks ?? []) {
      claimVerdictTotals[c.verdict] += 1;
      if (c.verdict === "invented" || c.verdict === "contradictory" || c.verdict === "expired") {
        unsupportedClaims.push({ sectionId: s.sectionId, claim: c.claim, verdict: c.verdict, reason: c.reason });
      }
    }
    for (const fc of s.result.section?.factualClaims ?? []) {
      if (!fc.sourceRef) continue;
      const key = lc(fc.sourceRef);
      const list = bySourceRef.get(key) ?? [];
      list.push({ sectionId: s.sectionId, values: extractNumbers(fc.claim).join(",") });
      bySourceRef.set(key, list);
    }
  }

  const contradictions: ArticleFactualDiagnostics["contradictions"] = [];
  for (const [sourceRef, uses] of bySourceRef) {
    const distinctValues = new Set(uses.map((u) => u.values).filter(Boolean));
    if (distinctValues.size > 1) contradictions.push({ sourceRef, sectionIds: [...new Set(uses.map((u) => u.sectionId))] });
  }

  return { claimVerdictTotals, sectionsWithValidationErrors, unsupportedClaims, contradictions };
}

export interface ArticleEditorialDiagnostics {
  /** Brief topics/keywords not found anywhere in the assembled article. */
  missingTopics: string[];
  /** Long sentences repeated verbatim across ≥2 sections. */
  repeatedAcrossSections: { text: string; sectionIds: string[] }[];
  /** Sections flagged by the quality gate as thin / title-restating. */
  lowUtilitySections: string[];
  perSectionWarnings: { sectionId: string; warnings: string[] }[];
}

function sentences(text: string): string[] {
  return text.split(/[.!?]+/).map((s) => s.trim().replace(/\s+/g, " ").toLowerCase()).filter((s) => s.length >= 40);
}

function editorialDiagnostics(plan: ArticlePlan, sections: ArticleSectionOutcome[]): ArticleEditorialDiagnostics {
  // Coverage is judged against section CONTENT only — a topic that appears only in its own heading is not
  // "covered" by prose.
  const blob = lc(sections.map((s) => s.result.section?.content ?? "").join(" "));
  const topics = [...new Set([plan.primaryKeyword, ...plan.sections.flatMap((s) => s.topicsToCover)].filter(Boolean))];
  const missingTopics = topics.filter((t) => !blob.includes(lc(t)));

  // repeated sentences across sections
  const seen = new Map<string, Set<string>>();
  for (const s of sections) {
    for (const sent of sentences(s.result.section?.content ?? "")) {
      const set = seen.get(sent) ?? new Set<string>();
      set.add(s.sectionId);
      seen.set(sent, set);
    }
  }
  const repeatedAcrossSections = [...seen.entries()]
    .filter(([, set]) => set.size >= 2)
    .map(([text, set]) => ({ text, sectionIds: [...set] }));

  const lowUtilitySections: string[] = [];
  const perSectionWarnings: { sectionId: string; warnings: string[] }[] = [];
  for (const s of sections) {
    const w = [...(s.result.editorial?.warnings ?? []), ...(s.result.validation?.warnings ?? [])];
    if (w.length) perSectionWarnings.push({ sectionId: s.sectionId, warnings: w });
    if ((s.result.editorial?.warnings ?? []).some((x) => /Contributie informativa redusa|reformuleze titlul/.test(x))) {
      lowUtilitySections.push(s.sectionId);
    }
  }

  return { missingTopics, repeatedAcrossSections, lowUtilitySections, perSectionWarnings };
}

export interface ArticleResult {
  articlePlan: ArticlePlan;
  sections: ArticleSectionOutcome[];
  assembledContent: string;
  factualDiagnostics: ArticleFactualDiagnostics;
  editorialDiagnostics: ArticleEditorialDiagnostics;
  tokenUsage: { inputTokens: number; outputTokens: number };
  /** ok = every section valid; partial = some valid; failed = none valid. */
  status: "ok" | "partial" | "failed";
}

/**
 * Generate a full article: sections in order, each with a compact recap of the prior ones. Reuses
 * runSectionGeneration (no Anthropic here). A failed section does NOT abort the article — it is recorded
 * so the editor can regenerate it individually.
 */
export async function generateArticle(
  inputs: ContentPromptInput[],
  complete: CompleteFn,
  opts: { priorSummaryChars?: number } = {},
): Promise<ArticleResult> {
  const articlePlan = buildArticlePlan(inputs);
  const perChars = opts.priorSummaryChars ?? 140;
  const sections: ArticleSectionOutcome[] = [];
  const done: { heading: string; content: string }[] = [];

  for (const base of inputs) {
    const sec = listSections(base.brief).find((s) => s.id === base.sectionId);
    const heading = sec?.heading ?? base.sectionId;
    const kind: SectionKind = sec?.kind ?? "outline";
    const level = sec?.level ?? 2;
    const priorSummary = summarizePrior(done, perChars);
    const result = await runSectionGeneration({ ...base, priorSummary }, complete);
    sections.push({ sectionId: base.sectionId, heading, kind, level, result });
    done.push({ heading, content: result.section?.content ?? "" });
  }

  const assembledContent = assemble(sections);
  const okCount = sections.filter((s) => s.result.ok).length;
  const status: ArticleResult["status"] = okCount === sections.length && sections.length > 0 ? "ok" : okCount === 0 ? "failed" : "partial";
  const tokenUsage = sections.reduce(
    (acc, s) => ({ inputTokens: acc.inputTokens + (s.result.usage?.inputTokens ?? 0), outputTokens: acc.outputTokens + (s.result.usage?.outputTokens ?? 0) }),
    { inputTokens: 0, outputTokens: 0 },
  );

  return {
    articlePlan,
    sections,
    assembledContent,
    factualDiagnostics: factualDiagnostics(sections),
    editorialDiagnostics: editorialDiagnostics(articlePlan, sections),
    tokenUsage,
    status,
  };
}

// ── Preflight (PASUL 2) — pure, read-only, NO Anthropic ───────────────────────────────
export interface ArticlePreflight {
  title: string;
  primaryKeyword: string;
  sectionHeadings: string[];
  sectionCount: number;
  maxSections: number;
  /** false when the brief has 0 sections or exceeds MAX_ARTICLE_SECTIONS. */
  withinLimit: boolean;
  /** Blocking reason when the brief is not article-ready (missing keyword/url/h1/H2), else null. */
  readinessError: string | null;
  estInputTokens: number;      // ~ (system+user chars)/4, summed over sections
  outputTokenCeiling: number;  // Σ per-section maxTokens budget
  maxCalls: number;            // = sectionCount (1 Anthropic call per section)
  hasFactualContext: boolean;  // any scoped CmsFact available
  /** Monetary cost — false unless AI_CONTENT_RATES is configured (we never invent prices). */
  costEstimateAvailable: boolean;
}

/** Compute a read-only preflight for an article run from its ordered section inputs. No model call. */
export function articlePreflight(inputs: ContentPromptInput[], opts: { costEstimateAvailable?: boolean } = {}): ArticlePreflight {
  const brief = inputs[0]?.brief;
  let estInputTokens = 0;
  let outputTokenCeiling = 0;
  let hasFactualContext = false;
  const sectionHeadings: string[] = [];
  for (const input of inputs) {
    const p = buildContentPrompt(input);
    if (!p) continue;
    estInputTokens += Math.ceil((p.systemPrompt.length + p.userPrompt.length) / 4);
    outputTokenCeiling += p.maxTokens;
    sectionHeadings.push(p.heading);
    if ((input.cmsFacts ?? []).length) hasFactualContext = true;
  }
  const sectionCount = sectionHeadings.length;
  const readinessError = brief
    ? briefReadinessError({ primaryKeyword: brief.primaryKeyword || null, targetUrl: brief.targetUrl, h1: brief.h1 || null, outline: brief.outline })
    : "Brief inexistent.";
  return {
    title: brief?.title ?? "",
    primaryKeyword: brief?.primaryKeyword ?? "",
    sectionHeadings,
    sectionCount,
    maxSections: MAX_ARTICLE_SECTIONS,
    withinLimit: sectionCount > 0 && sectionCount <= MAX_ARTICLE_SECTIONS,
    readinessError,
    estInputTokens,
    outputTokenCeiling,
    maxCalls: sectionCount,
    hasFactualContext,
    costEstimateAvailable: opts.costEstimateAvailable ?? false,
  };
}
