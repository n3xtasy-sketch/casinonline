"use server";

import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { loadArticleSectionInputs } from "@/lib/ai/brief-content-input";
import { articlePreflight, generateArticle, type ArticlePreflight, type ArticleResult } from "@/lib/ai/article-engine";
import { createAnthropicComplete } from "@/lib/ai/anthropic-client";
import { acquireABRun, releaseABRun } from "@/lib/ai/ab-run-guard";

/**
 * AI-3B secure admin Article Engine actions. Admin-gated server-side on EVERY call. The client sends ONLY
 * ids. The server loads the brief, checks readiness, applies the section limit, builds the inputs and
 * (for the LIVE action) injects the Anthropic adapter and runs generateArticle. Nothing is persisted:
 * no auto-save, no publish, no CMS writes. The response carries ONLY content + diagnostics — no prompts,
 * no API keys.
 */
async function requireAdmin() {
  const db = await getSupabaseAuthClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Neautentificat.");
  const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) throw new Error("Acces interzis.");
}

export type ArticlePreflightResult = { ok: true; preflight: ArticlePreflight } | { ok: false; error: string };
export type ArticleGenerateResult = { ok: true; article: ArticleResult } | { ok: false; error: string };

/** READ-ONLY preflight — NO Anthropic call. Section count, token estimates, readiness, section limit. */
export async function articlePreflightAction(projectId: string, briefId: string): Promise<ArticlePreflightResult> {
  await requireAdmin();
  const inputs = await loadArticleSectionInputs(projectId, briefId);
  if (!inputs) return { ok: false, error: "Brief inexistent sau inaccesibil." };
  return { ok: true, preflight: articlePreflight(inputs) }; // costEstimateAvailable=false (no AI_CONTENT_RATES)
}

/** LIVE full-article generation. Admin-gated; refuses an incomplete brief or one over the section limit. */
export async function generateArticleAction(projectId: string, briefId: string): Promise<ArticleGenerateResult> {
  await requireAdmin(); // re-checked on every invocation

  const key = `article:${projectId}:${briefId}`;
  if (!acquireABRun(key)) return { ok: false, error: "O generare este deja in curs pentru acest brief." };

  try {
    const inputs = await loadArticleSectionInputs(projectId, briefId);
    if (!inputs) return { ok: false, error: "Brief inexistent sau inaccesibil." };

    const pre = articlePreflight(inputs);
    if (pre.readinessError) return { ok: false, error: `Brief incomplet: ${pre.readinessError}` };
    if (!pre.withinLimit) return { ok: false, error: `Articol prea mare: ${pre.sectionCount} sectiuni (maxim ${pre.maxSections}).` };

    let complete;
    try {
      complete = createAnthropicComplete(); // key from the runtime env; never shipped to the client
    } catch {
      return { ok: false, error: "Serviciul AI nu este configurat (cheia API lipseste in mediu)." };
    }

    const article = await generateArticle(inputs, complete);
    return { ok: true, article }; // content + diagnostics only — no prompts, no keys; nothing persisted
  } catch {
    return { ok: false, error: "Generarea articolului a esuat." };
  } finally {
    releaseABRun(key);
  }
}
