/**
 * AI-1/AI-2.1 Section generation orchestration — framework-agnostic, dependency-injected (no SDK
 * import here, so it is unit-testable with a mock `complete`). It builds the prompt via AI-0, calls
 * the injected model function which returns a NATIVE structured object (Anthropic tool use — no
 * fragile JSON-from-text extraction), detects truncation (max_tokens) explicitly, validates the
 * object with validateGeneratedSection (strict, unchanged), and returns a user-safe result + usage
 * metadata. It NEVER writes to the CMS and never accepts a client-supplied prompt.
 */

import { buildContentPrompt, type ContentPromptInput } from "@/lib/ai/content-prompt";
import { validateGeneratedSection, type GeneratedSection, type ValidationResult } from "@/lib/ai/content-output";
import type { CostEstimate } from "@/lib/ai/cost";

export interface CompleteRequest {
  system: string;
  user: string;
  maxTokens: number;
}

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
}

/** Normalized model response. `output` is the structured object from native tool use (null if the
 *  model did not emit the tool / returned plain text). `stopReason` surfaces truncation. */
export interface ModelResponse {
  output: unknown | null;
  stopReason: string | null; // "tool_use" | "end_turn" | "max_tokens" | "stop_sequence" | null
  usage: ModelUsage | null;
  model: string | null;
}
/** The injected model call — returns a normalized structured response (no raw-text JSON parsing). */
export type CompleteFn = (req: CompleteRequest) => Promise<ModelResponse>;

export type GenerationErrorKind =
  | "no_section" | "parse_error" | "invalid_output" | "max_tokens" | "rate_limit" | "timeout" | "api_error";

export interface SectionGenerationResult {
  ok: boolean;
  section: GeneratedSection | null;
  validation: ValidationResult | null;
  promptWarnings: string[];
  error: string | null; // user-safe; never internal details / API key / raw error
  errorKind: GenerationErrorKind | null;
  usage: ModelUsage | null;
  model: string | null;
  stopReason: string | null;
  /** AI-2.2: estimated cost (null unless rates are configured for the model — never guessed). */
  cost: CostEstimate | null;
}

// ── pure config/env helpers (no SDK) ──────────────────────────────────────────────
export interface AiModelConfig {
  model: string;
  maxTokens: number;
  timeoutMs: number;
  maxRetries: number;
}
export function resolveModelConfig(env: Record<string, string | undefined>): AiModelConfig {
  const num = (v: string | undefined, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : d;
  };
  return {
    model: env.AI_CONTENT_MODEL || "claude-sonnet-5",
    maxTokens: num(env.AI_CONTENT_MAX_TOKENS, 4000), // hard ceiling; per-section budget drives the request
    timeoutMs: num(env.AI_CONTENT_TIMEOUT_MS, 30000),
    maxRetries: 0, // no uncontrolled auto-retries
  };
}
export function requireApiKey(env: Record<string, string | undefined>): string {
  const key = env.ANTHROPIC_API_KEY;
  if (!key || !key.trim()) throw new Error("ANTHROPIC_API_KEY lipsă — configureaz-o server-side.");
  return key;
}

/** Pure extraction of a forced tool's input from a content-block array (handles multiple blocks /
 *  text-only responses). No JSON.parse, no regex — the SDK already parsed tool_use input. */
export interface ModelContentBlock {
  type: string;
  name?: string;
  input?: unknown;
}
export function extractToolOutput(blocks: ModelContentBlock[], toolName: string): unknown | null {
  const tool = blocks.find((b) => b.type === "tool_use" && b.name === toolName);
  return tool ? tool.input ?? null : null;
}

function classifyApiError(err: unknown): { kind: GenerationErrorKind; message: string } {
  const e = err as { status?: number; name?: string; message?: string } | null;
  const msg = e?.message ?? "";
  if (e?.status === 429 || /rate.?limit|too many requests/i.test(msg)) return { kind: "rate_limit", message: "Limită de cereri atinsă. Reîncearcă mai târziu." };
  if (e?.name === "AbortError" || e?.status === 408 || /timeout|timed out|aborted/i.test(msg)) return { kind: "timeout", message: "Generarea a expirat (timeout)." };
  return { kind: "api_error", message: "Eroare la serviciul AI. Reîncearcă." };
}

/**
 * Generate + validate ONE section via NATIVE structured output. Explicitly handles truncation
 * (max_tokens) and missing structured output; never auto-accepts invalid content; no uncontrolled
 * retries. Returns a user-safe result with usage metadata.
 */
export async function runSectionGeneration(
  input: ContentPromptInput,
  complete: CompleteFn,
  opts: { maxTokens?: number } = {},
): Promise<SectionGenerationResult> {
  const empty = { usage: null as ModelUsage | null, model: null as string | null, stopReason: null as string | null, cost: null as CostEstimate | null };
  const prompt = buildContentPrompt(input);
  if (!prompt) {
    return { ok: false, section: null, validation: null, promptWarnings: [], error: `Secțiune inexistentă: ${input.sectionId}`, errorKind: "no_section", ...empty };
  }

  let resp: ModelResponse;
  try {
    // Request the per-section output budget (a MAX); the adapter caps it at the model hard ceiling.
    resp = await complete({ system: prompt.systemPrompt, user: prompt.userPrompt, maxTokens: opts.maxTokens ?? prompt.maxTokens });
  } catch (err) {
    const { kind, message } = classifyApiError(err);
    return { ok: false, section: null, validation: null, promptWarnings: prompt.warnings, error: message, errorKind: kind, ...empty };
  }

  const meta = { promptWarnings: prompt.warnings, usage: resp.usage, model: resp.model, stopReason: resp.stopReason, cost: null as CostEstimate | null };

  // Explicit truncation detection — a cut-off structured output is unusable.
  if (resp.stopReason === "max_tokens") {
    return { ok: false, section: null, validation: null, error: "Răspuns trunchiat (max_tokens) — mărește limita de tokeni sau simplifică secțiunea.", errorKind: "max_tokens", ...meta };
  }
  // No structured output (model returned plain text / no tool call).
  if (resp.output == null) {
    return { ok: false, section: null, validation: null, error: "Modelul nu a returnat output structurat.", errorKind: "parse_error", ...meta };
  }

  // AI-2.3: sectionId is SERVER-controlled. Stamp the requested id onto the output (overwriting /
  // injecting it) so the model can never invent or modify the section identifier.
  const output = typeof resp.output === "object" && resp.output !== null
    ? { ...(resp.output as Record<string, unknown>), sectionId: prompt.sectionId }
    : resp.output;

  const validation = validateGeneratedSection(output, input);
  if (!validation.ok) {
    return { ok: false, section: output as GeneratedSection, validation, error: "Output respins de validare (vezi detaliile).", errorKind: "invalid_output", ...meta };
  }

  return { ok: true, section: output as GeneratedSection, validation, error: null, errorKind: null, ...meta };
}
