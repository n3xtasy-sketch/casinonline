/**
 * AI-2.9D.2B A/B execution harness — PURE orchestration over runSectionGeneration (the SAME pipeline +
 * validation Content Studio uses). It runs 3 sections × 2 variants (A = no Author Knowledge, B = scoped
 * Author Knowledge) and summarises the results. It NEVER modifies the brief or CMS and it does NOT import
 * the Anthropic SDK.
 *
 * SAFETY: the default mode is DRY-RUN — a deterministic in-process model (no network, no Anthropic). A
 * LIVE run (real Anthropic) requires BOTH an explicit authorization token AND a caller-supplied `complete`
 * function; otherwise it throws. So tests and the build can never trigger a real call by accident. No API
 * keys and no full prompts are logged — only summaries (ids/counts/tokens/verdicts).
 */

import { runSectionGeneration, type CompleteFn } from "@/lib/ai/generate-section";
import { makeVariantInput, summarizeVariantResult, compareAB, type ABVariantSummary, type ABComparison } from "@/lib/ai/ab-experiment";
import { selectAuthorKnowledge, AUTHOR_KNOWLEDGE } from "@/lib/ai/author-knowledge";
import { listSections, type ContentPromptInput } from "@/lib/ai/content-prompt";
import type { GeneratedSection } from "@/lib/ai/content-output";

export type ABRunMode = "dry-run" | "live";

/** The three experiment sections (PASUL 1). Headings carry the real topics; no operator data invented. */
export type ABSectionSpec =
  | { kind: "outline"; heading: string; keywords: string[] }
  | { kind: "faq"; question: string };

export const AB_SECTION_SPECS: ABSectionSpec[] = [
  { kind: "outline", heading: "Cum functioneaza rulajul", keywords: ["rulaj"] },
  { kind: "outline", heading: "Verificarea identitatii (KYC)", keywords: ["kyc", "verificare"] },
  { kind: "faq", question: "Ce inseamna castigul maxim?" },
];

const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * Build the 3 in-memory section inputs from a REAL scoped base input (keywords, intent, KE-2 context, CMS
 * Facts and confirmed entities are preserved verbatim). Only the section + its scoped Author Knowledge
 * change. The base brief is spread into a NEW object — the persisted brief is never touched.
 */
export function buildVirtualSectionInputs(base: ContentPromptInput, specs: ABSectionSpec[] = AB_SECTION_SPECS): ContentPromptInput[] {
  const relevantEntityIds = [...(base.cmsEntities ?? []), ...(base.discoveredEntities ?? [])].map((e) => e.id);
  return specs.map((spec) => {
    const sectionKind = spec.kind;
    const brief = sectionKind === "faq"
      ? { ...base.brief, faq: [{ question: spec.question, answer: "" }] }
      : { ...base.brief, outline: [{ level: 2 as const, heading: spec.heading, keywords: spec.keywords, note: "" }], faq: [] };
    const sectionId = sectionKind === "faq" ? "faq" : `s0-${slug(spec.heading)}`;
    const sectionHeading = sectionKind === "faq" ? spec.question : spec.heading;
    const authorKnowledge = selectAuthorKnowledge(AUTHOR_KNOWLEDGE, {
      pageType: base.pageType,
      searchIntent: base.brief.intent,
      sectionKind,
      sectionHeading,
      primaryKeyword: base.brief.primaryKeyword,
      secondaryKeywords: base.brief.secondaryKeywords,
      relevantEntityIds,
    });
    return { ...base, brief, sectionId, authorKnowledge };
  });
}

// DRY-RUN model — deterministic, in-process, NO Anthropic. Emits a minimal valid section (no operator
// data, no numbers) so the full prompt→validate pipeline runs; usage is estimated from the prompt length.
const DRY_CONTENT = "Continut generat in DRY-RUN, fara apel Anthropic. Serveste doar la exercitarea pipeline-ului de generare si validare pentru experimentul A/B.";
export const dryRunComplete: CompleteFn = async ({ system, user }) => ({
  output: { sectionId: "dry-run", heading: "dry-run", content: DRY_CONTENT, keywordsUsed: [], entitiesUsed: [], internalLinks: [], factualClaims: [], warnings: [] } as GeneratedSection,
  stopReason: "tool_use",
  usage: { inputTokens: Math.ceil((system.length + user.length) / 4), outputTokens: Math.ceil(DRY_CONTENT.length / 4) },
  model: "dry-run",
});

export const LIVE_AUTH_TOKEN = "I_AUTHORIZE_LIVE_ANTHROPIC_CALLS";

export interface ABRunOptions {
  mode?: ABRunMode;        // default "dry-run"
  complete?: CompleteFn;   // REQUIRED for live; ignored in dry-run
  authorize?: string;      // must equal LIVE_AUTH_TOKEN for live
}

export interface ABExperimentRow {
  sectionId: string;
  heading: string;
  a: ABVariantSummary;
  b: ABVariantSummary;
  comparison: ABComparison;
  /** Editorial 1-5 scores are entered MANUALLY later — they cannot be computed objectively here. */
  editorialScores: null;
}

export interface ABExperimentReport {
  mode: ABRunMode;
  plannedRuns: number;   // sections × 2
  completedRuns: number;
  rows: ABExperimentRow[];
}

/**
 * Run the A/B experiment. DRY-RUN by default (no Anthropic). For a LIVE run the caller MUST pass both
 * `authorize: LIVE_AUTH_TOKEN` and a `complete` function — otherwise this throws (no accidental calls).
 */
export async function runABExperiment(inputs: ContentPromptInput[], opts: ABRunOptions = {}): Promise<ABExperimentReport> {
  const mode: ABRunMode = opts.mode ?? "dry-run";
  let complete: CompleteFn;
  if (mode === "live") {
    if (opts.authorize !== LIVE_AUTH_TOKEN) throw new Error("Executie live neautorizata: lipseste tokenul de autorizare explicita.");
    if (!opts.complete) throw new Error("Executie live: lipseste functia complete (adaptorul Anthropic).");
    complete = opts.complete;
  } else {
    complete = dryRunComplete; // default — in-process, no network
  }

  const rows: ABExperimentRow[] = [];
  for (const input of inputs) {
    const ra = await runSectionGeneration(makeVariantInput(input, "A"), complete);
    const rb = await runSectionGeneration(makeVariantInput(input, "B"), complete);
    const a = summarizeVariantResult("A", ra);
    const b = summarizeVariantResult("B", rb);
    const heading = listSections(input.brief).find((s) => s.id === input.sectionId)?.heading ?? input.sectionId;
    rows.push({ sectionId: input.sectionId, heading, a, b, comparison: compareAB(a, b), editorialScores: null });
  }
  return { mode, plannedRuns: inputs.length * 2, completedRuns: rows.length * 2, rows };
}
