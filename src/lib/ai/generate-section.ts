/**
 * AI-1 Section generation orchestration — framework-agnostic, dependency-injected (no SDK import
 * here, so it is unit-testable with a mock `complete`). It: builds the prompt via AI-0, calls the
 * injected model function, parses the structured JSON, validates it with validateGeneratedSection,
 * and returns a user-safe result. It NEVER writes to the CMS and never accepts a client-supplied
 * prompt (the caller builds ContentPromptInput server-side from a real brief).
 */

import { buildContentPrompt, type ContentPromptInput } from "@/lib/ai/content-prompt";
import { validateGeneratedSection, type GeneratedSection, type ValidationResult } from "@/lib/ai/content-output";

export interface CompleteRequest {
  system: string;
  user: string;
  maxTokens: number;
}
/** The injected model call — returns the model's raw text (expected to contain the JSON output). */
export type CompleteFn = (req: CompleteRequest) => Promise<string>;

export type GenerationErrorKind = "no_section" | "parse_error" | "invalid_output" | "rate_limit" | "timeout" | "api_error";

export interface SectionGenerationResult {
  ok: boolean;
  section: GeneratedSection | null;
  validation: ValidationResult | null;
  promptWarnings: string[];
  error: string | null; // user-safe message, never internal details / API key / raw error
  errorKind: GenerationErrorKind | null;
}

// ── pure config/env helpers (no SDK) ──────────────────────────────────────────────
export interface AiModelConfig {
  model: string;
  maxTokens: number;
  timeoutMs: number;
  maxRetries: number;
}
/** Server-side-configurable model config, with safe defaults. No key here. */
export function resolveModelConfig(env: Record<string, string | undefined>): AiModelConfig {
  const num = (v: string | undefined, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : d;
  };
  return {
    model: env.AI_CONTENT_MODEL || "claude-sonnet-5",
    maxTokens: num(env.AI_CONTENT_MAX_TOKENS, 1500),
    timeoutMs: num(env.AI_CONTENT_TIMEOUT_MS, 30000),
    maxRetries: 0, // no uncontrolled auto-retries
  };
}
/** Require the API key from env; throws a clear (non-leaking) error when absent. */
export function requireApiKey(env: Record<string, string | undefined>): string {
  const key = env.ANTHROPIC_API_KEY;
  if (!key || !key.trim()) throw new Error("ANTHROPIC_API_KEY lipsă — configureaz-o server-side.");
  return key;
}

// ── parsing + error classification ────────────────────────────────────────────────
/** Extract the first balanced JSON object from model text (tolerates ```json fences / prose). */
function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new Error("no json");
  return JSON.parse(raw.slice(start, end + 1));
}

function classifyApiError(err: unknown): { kind: GenerationErrorKind; message: string } {
  const e = err as { status?: number; name?: string; message?: string } | null;
  const msg = e?.message ?? "";
  if (e?.status === 429 || /rate.?limit|too many requests/i.test(msg)) return { kind: "rate_limit", message: "Limită de cereri atinsă. Reîncearcă mai târziu." };
  if (e?.name === "AbortError" || e?.status === 408 || /timeout|timed out|aborted/i.test(msg)) return { kind: "timeout", message: "Generarea a expirat (timeout)." };
  return { kind: "api_error", message: "Eroare la serviciul AI. Reîncearcă." };
}

/**
 * Generate + validate ONE section. Deterministic control flow; the only non-determinism is the
 * injected model call. Returns a user-safe result — on any failure `error`/`errorKind` are set and
 * `section` is null (unless the model replied but failed validation, where the rejected section is
 * returned alongside the validation errors for inspection).
 */
export async function runSectionGeneration(
  input: ContentPromptInput,
  complete: CompleteFn,
  opts: { maxTokens?: number } = {},
): Promise<SectionGenerationResult> {
  const prompt = buildContentPrompt(input);
  if (!prompt) {
    return { ok: false, section: null, validation: null, promptWarnings: [], error: `Secțiune inexistentă: ${input.sectionId}`, errorKind: "no_section" };
  }

  let raw: string;
  try {
    raw = await complete({ system: prompt.systemPrompt, user: prompt.userPrompt, maxTokens: opts.maxTokens ?? 1500 });
  } catch (err) {
    const { kind, message } = classifyApiError(err);
    return { ok: false, section: null, validation: null, promptWarnings: prompt.warnings, error: message, errorKind: kind };
  }

  let parsed: unknown;
  try {
    parsed = extractJson(raw);
  } catch {
    return { ok: false, section: null, validation: null, promptWarnings: prompt.warnings, error: "Răspuns AI neparsabil (JSON invalid).", errorKind: "parse_error" };
  }

  const validation = validateGeneratedSection(parsed, input);
  if (!validation.ok) {
    return { ok: false, section: parsed as GeneratedSection, validation, promptWarnings: prompt.warnings, error: "Output respins de validare (vezi detaliile).", errorKind: "invalid_output" };
  }

  return { ok: true, section: parsed as GeneratedSection, validation, promptWarnings: prompt.warnings, error: null, errorKind: null };
}
