import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { resolveModelConfig, requireApiKey, extractToolOutput, type CompleteFn, type ModelContentBlock } from "@/lib/ai/generate-section";

/**
 * AI-1/AI-2.1 Anthropic adapter (SERVER-ONLY). Builds a `complete` function backed by Claude using
 * NATIVE structured output (forced tool use) — the model must call `emit_section` whose input_schema
 * mirrors GeneratedSection, so the response is a parsed object (no JSON-from-text / regex). The API
 * key is read from env server-side only (never shipped to the browser, hardcoded, or logged). Model
 * + limits are configurable via env; auto-retries are disabled and a per-request timeout + output-
 * token cap are enforced. stop_reason + usage are surfaced for truncation detection + metadata.
 */

const SECTION_TOOL = {
  name: "emit_section",
  description: "Returneaza sectiunea generata STRICT in aceasta structura. Nu scrie text in afara tool-ului.",
  input_schema: {
    type: "object" as const,
    properties: {
      sectionId: { type: "string" },
      heading: { type: "string" },
      content: { type: "string" },
      keywordsUsed: { type: "array", items: { type: "string" } },
      entitiesUsed: { type: "array", items: { type: "string" } },
      internalLinks: { type: "array", items: { type: "string" } },
      factualClaims: {
        type: "array",
        items: {
          type: "object",
          properties: { claim: { type: "string" }, sourceRef: { type: ["string", "null"] } },
          required: ["claim"],
        },
      },
      warnings: { type: "array", items: { type: "string" } },
    },
    required: ["sectionId", "heading", "content", "keywordsUsed", "entitiesUsed", "internalLinks", "factualClaims", "warnings"],
  },
};

export function createAnthropicComplete(env: NodeJS.ProcessEnv = process.env): CompleteFn {
  const apiKey = requireApiKey(env); // throws a safe error if missing
  const cfg = resolveModelConfig(env);
  const client = new Anthropic({ apiKey, timeout: cfg.timeoutMs, maxRetries: cfg.maxRetries });

  return async ({ system, user, maxTokens }) => {
    const resp = await client.messages.create({
      model: cfg.model,
      max_tokens: Math.min(maxTokens, cfg.maxTokens),
      system,
      tools: [SECTION_TOOL],
      tool_choice: { type: "tool", name: SECTION_TOOL.name },
      messages: [{ role: "user", content: user }],
    });
    return {
      output: extractToolOutput(resp.content as unknown as ModelContentBlock[], SECTION_TOOL.name),
      stopReason: resp.stop_reason ?? null,
      usage: resp.usage ? { inputTokens: resp.usage.input_tokens, outputTokens: resp.usage.output_tokens } : null,
      model: resp.model ?? cfg.model,
    };
  };
}

/** The resolved model id (for display/telemetry — never includes the key). */
export function activeModel(env: NodeJS.ProcessEnv = process.env): string {
  return resolveModelConfig(env).model;
}
