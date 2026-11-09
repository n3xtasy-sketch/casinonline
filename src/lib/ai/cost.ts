/**
 * AI-2.2 cost estimator — PURE, no I/O, no assumed prices. Rates are CONFIGURABLE per model via env
 * (AI_CONTENT_RATES = JSON map model -> { inputPerMillion, outputPerMillion }). When rates are not
 * configured for a model, the estimate is null ("cost unknown") — we never guess a price.
 */

export interface ModelRates {
  inputPerMillion: number; // price per 1,000,000 input tokens
  outputPerMillion: number; // price per 1,000,000 output tokens
  currency?: string;
}

export interface CostEstimate {
  input: number;
  output: number;
  total: number;
  currency: string;
}

export function estimateCost(usage: { inputTokens: number; outputTokens: number } | null, rates: ModelRates | null): CostEstimate | null {
  if (!usage || !rates) return null;
  const input = (usage.inputTokens / 1_000_000) * rates.inputPerMillion;
  const output = (usage.outputTokens / 1_000_000) * rates.outputPerMillion;
  return { input, output, total: input + output, currency: rates.currency ?? "USD" };
}

/** Rates for a model from env config; null when not configured (no assumed prices). */
export function resolveRates(model: string | null, env: Record<string, string | undefined>): ModelRates | null {
  const raw = env.AI_CONTENT_RATES;
  if (!raw || !model) return null;
  try {
    const map = JSON.parse(raw) as Record<string, ModelRates>;
    const r = map[model];
    if (r && typeof r.inputPerMillion === "number" && typeof r.outputPerMillion === "number") return r;
    return null;
  } catch {
    return null;
  }
}
