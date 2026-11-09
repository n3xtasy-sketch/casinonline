/**
 * AI-2.9D.2A Author-Knowledge A/B experiment harness — PURE, DETERMINISTIC, no I/O, no AI SDK, NO
 * Anthropic calls. Prepares a reproducible A/B comparison for ONE section where the ONLY difference is
 * Author Knowledge:
 *   A = the exact same ContentPromptInput with authorKnowledge stripped ([])  → no [CUNOASTERE AUTOR] block
 *   B = the input unchanged                                                    → the scoped knowledge block
 * Everything else (brief, sectionId, CMS Facts, KE-2 context, output contract, maxTokens budget, source
 * allowlist, validation rules) is identical by construction. The harness builds both prompts, asserts
 * parity, and estimates the token delta — it never executes the model. Full prompts are NOT returned
 * (only lengths + a deterministic hash), so nothing sensitive is logged. Execution + scoring happen
 * later; `summarizeVariantResult` / `compareAB` turn two real SectionGenerationResults into a comparison.
 */

import { buildContentPrompt, type ContentPromptInput } from "@/lib/ai/content-prompt";
import { knowledgeSelectionMeta, type KnowledgeSelectionMeta } from "@/lib/ai/author-knowledge";
import type { SectionGenerationResult } from "@/lib/ai/generate-section";
import type { ClaimVerdict } from "@/lib/ai/fact-verification";

export type ABVariant = "A" | "B";

/** Derive a variant input. A strips Author Knowledge; B is unchanged. Returns a NEW object (no mutation). */
export function makeVariantInput(input: ContentPromptInput, variant: ABVariant): ContentPromptInput {
  return variant === "A" ? { ...input, authorKnowledge: [] } : { ...input };
}

export interface ABParity {
  systemIdentical: boolean;
  userIdenticalExceptKnowledge: boolean;
  aHasNoKnowledgeBlock: boolean;
  bHasKnowledgeBlock: boolean;
  outputContractIdentical: boolean;
  maxTokensIdentical: boolean;
  factualSourcesIdentical: boolean;
  warningsIdentical: boolean;
  cmsContextIdentical: boolean;
  ok: boolean;
}

export interface ABExperimentPlan {
  sectionId: string;
  heading: string;
  /** B's scoped Author-Knowledge selection (ids / count / estimated tokens). */
  knowledge: KnowledgeSelectionMeta;
  estInputTokensA: number;
  estInputTokensB: number;
  /** Extra input tokens attributable to the knowledge block (B − A). */
  knowledgeTokenDelta: number;
  maxTokens: number;
  parity: ABParity;
  /** Deterministic hashes of the two prompts (no full prompt stored). */
  promptHashA: string;
  promptHashB: string;
}

const KNOWLEDGE_MARKER = "----- CUNOASTERE AUTOR";
const SUGGESTIONS_MARKER = "----- SUGESTII KE-2";

/** djb2 — a small deterministic string hash (no crypto dependency), for reproducibility checks. */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}
const estTokens = (chars: number) => Math.ceil(chars / 4); // documented ~4 chars/token

/** Build the A/B experiment plan for one section input. Returns null if the section does not exist. */
export function buildABExperiment(input: ContentPromptInput): ABExperimentPlan | null {
  const a = makeVariantInput(input, "A");
  const b = makeVariantInput(input, "B");
  const pa = buildContentPrompt(a);
  const pb = buildContentPrompt(b);
  if (!pa || !pb) return null;

  // Remove B's knowledge block (it sits exactly between the CMS-facts block and the suggestions block);
  // what remains must equal A's user prompt — proving the only difference is Author Knowledge.
  const kStart = pb.userPrompt.indexOf(KNOWLEDGE_MARKER);
  const sStart = pb.userPrompt.indexOf(SUGGESTIONS_MARKER);
  const bWithoutKnowledge = kStart >= 0 && sStart > kStart
    ? pb.userPrompt.slice(0, kStart) + pb.userPrompt.slice(sStart)
    : pb.userPrompt;

  const km = knowledgeSelectionMeta(input.authorKnowledge ?? []);
  const cms = (i: ContentPromptInput) => JSON.stringify({ f: i.cmsFacts ?? [], e: i.cmsEntities ?? [], r: i.cmsRelations ?? [], l: i.internalLinks ?? [] });

  const parity: ABParity = {
    systemIdentical: pa.systemPrompt === pb.systemPrompt,
    userIdenticalExceptKnowledge: bWithoutKnowledge === pa.userPrompt,
    aHasNoKnowledgeBlock: !pa.userPrompt.includes("CUNOASTERE AUTOR"),
    bHasKnowledgeBlock: km.selectedKnowledgeCount > 0 ? pb.userPrompt.includes("CUNOASTERE AUTOR") : true,
    outputContractIdentical: JSON.stringify(pa.outputContract) === JSON.stringify(pb.outputContract),
    maxTokensIdentical: pa.maxTokens === pb.maxTokens,
    factualSourcesIdentical: JSON.stringify(pa.sourceRefs) === JSON.stringify(pb.sourceRefs),
    warningsIdentical: JSON.stringify(pa.warnings) === JSON.stringify(pb.warnings),
    cmsContextIdentical: cms(a) === cms(b),
    ok: false,
  };
  parity.ok = parity.systemIdentical && parity.userIdenticalExceptKnowledge && parity.aHasNoKnowledgeBlock
    && parity.bHasKnowledgeBlock && parity.outputContractIdentical && parity.maxTokensIdentical
    && parity.factualSourcesIdentical && parity.warningsIdentical && parity.cmsContextIdentical;

  const estA = estTokens(pa.systemPrompt.length + pa.userPrompt.length);
  const estB = estTokens(pb.systemPrompt.length + pb.userPrompt.length);
  return {
    sectionId: input.sectionId,
    heading: pb.heading,
    knowledge: km,
    estInputTokensA: estA,
    estInputTokensB: estB,
    knowledgeTokenDelta: estB - estA,
    maxTokens: pb.maxTokens,
    parity,
    promptHashA: hash(`${pa.systemPrompt}\n~~\n${pa.userPrompt}`),
    promptHashB: hash(`${pb.systemPrompt}\n~~\n${pb.userPrompt}`),
  };
}

// ── Result summarisation (used LATER, once A and B are actually generated) ──────────
const VERDICTS: readonly ClaimVerdict[] = ["supported", "unverifiable", "invented", "contradictory", "expired"];

export interface ABVariantSummary {
  variant: ABVariant;
  ok: boolean;
  errorKind: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cost: number | null;
  currency: string | null;
  textLength: number;
  validationErrorCount: number;
  validationWarningCount: number;
  editorialWarningCount: number;
  claimCounts: Record<ClaimVerdict, number>;
  knowledgeCount: number;
}

/** Extract the comparable metrics from a real SectionGenerationResult. Pure; no prompt text. */
export function summarizeVariantResult(variant: ABVariant, r: SectionGenerationResult): ABVariantSummary {
  const claimCounts = Object.fromEntries(VERDICTS.map((v) => [v, 0])) as Record<ClaimVerdict, number>;
  for (const c of r.validation?.claimChecks ?? []) claimCounts[c.verdict] = (claimCounts[c.verdict] ?? 0) + 1;
  return {
    variant,
    ok: r.ok,
    errorKind: r.errorKind,
    inputTokens: r.usage?.inputTokens ?? null,
    outputTokens: r.usage?.outputTokens ?? null,
    cost: r.cost?.total ?? null,
    currency: r.cost?.currency ?? null,
    textLength: r.section?.content.length ?? 0,
    validationErrorCount: r.validation?.errors.length ?? 0,
    validationWarningCount: r.validation?.warnings.length ?? 0,
    editorialWarningCount: r.editorial?.warnings.length ?? 0,
    claimCounts,
    knowledgeCount: r.knowledge?.selectedKnowledgeCount ?? 0,
  };
}

export interface ABComparison {
  deltaOutputTokens: number | null;
  deltaTextLength: number;
  deltaValidationErrors: number;
  deltaValidationWarnings: number;
  deltaEditorialWarnings: number;
  deltaClaims: Record<ClaimVerdict, number>;
  deltaCost: number | null;
  /** Guardrail: B introduced NO new blocking factual error relative to A. */
  bAddsNoFactualErrors: boolean;
}

const sub = (x: number | null, y: number | null): number | null => (x == null || y == null ? null : x - y);

/** Compare B against A (deltas = B − A). Pure. */
export function compareAB(a: ABVariantSummary, b: ABVariantSummary): ABComparison {
  const deltaClaims = Object.fromEntries(VERDICTS.map((v) => [v, b.claimCounts[v] - a.claimCounts[v]])) as Record<ClaimVerdict, number>;
  return {
    deltaOutputTokens: sub(b.outputTokens, a.outputTokens),
    deltaTextLength: b.textLength - a.textLength,
    deltaValidationErrors: b.validationErrorCount - a.validationErrorCount,
    deltaValidationWarnings: b.validationWarningCount - a.validationWarningCount,
    deltaEditorialWarnings: b.editorialWarningCount - a.editorialWarningCount,
    deltaClaims,
    deltaCost: sub(b.cost, a.cost),
    bAddsNoFactualErrors: deltaClaims.invented <= 0 && deltaClaims.contradictory <= 0 && deltaClaims.expired <= 0 && b.validationErrorCount <= a.validationErrorCount,
  };
}
