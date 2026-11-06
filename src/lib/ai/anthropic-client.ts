import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { resolveModelConfig, requireApiKey, type CompleteFn } from "@/lib/ai/generate-section";

/**
 * AI-1 Anthropic adapter (SERVER-ONLY). Builds a `complete` function backed by Claude. The API key
 * is read from env server-side only (never shipped to the browser, never hardcoded, never logged).
 * The model + limits are configurable via env; auto-retries are disabled (maxRetries=0) and a
 * per-request timeout + output-token cap are enforced. Structured output is requested via the AI-0
 * prompt/contract and enforced by validateGeneratedSection downstream.
 */
export function createAnthropicComplete(env: NodeJS.ProcessEnv = process.env): CompleteFn {
  const apiKey = requireApiKey(env); // throws a safe error if missing
  const cfg = resolveModelConfig(env);
  const client = new Anthropic({ apiKey, timeout: cfg.timeoutMs, maxRetries: cfg.maxRetries });

  return async ({ system, user, maxTokens }) => {
    const resp = await client.messages.create({
      model: cfg.model,
      max_tokens: Math.min(maxTokens, cfg.maxTokens),
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = resp.content.find((b) => b.type === "text");
    return text && text.type === "text" ? text.text : "";
  };
}

/** The resolved model id (for display/telemetry — never includes the key). */
export function activeModel(env: NodeJS.ProcessEnv = process.env): string {
  return resolveModelConfig(env).model;
}
