"use server";

import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { loadSectionGenerationInput } from "@/lib/ai/brief-content-input";
import { createAnthropicComplete } from "@/lib/ai/anthropic-client";
import { runSectionGeneration, type SectionGenerationResult } from "@/lib/ai/generate-section";

/**
 * AI-1 server action: generate ONE section of a real brief with Claude. Admin-gated; the client
 * passes only ids (never a prompt or CMS facts). Never writes to the CMS (generation only), never
 * leaks internal errors or the API key. The result is returned to the caller — nothing is persisted.
 */
async function requireAdmin() {
  const db = await getSupabaseAuthClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Neautentificat.");
  const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) throw new Error("Acces interzis.");
}

const fail = (error: string, errorKind: SectionGenerationResult["errorKind"]): SectionGenerationResult =>
  ({ ok: false, section: null, validation: null, promptWarnings: [], error, errorKind, usage: null, model: null, stopReason: null });

export async function generateBriefSectionAction(
  projectId: string,
  briefId: string,
  sectionId: string,
): Promise<SectionGenerationResult> {
  await requireAdmin();

  const input = await loadSectionGenerationInput(projectId, briefId, sectionId);
  if (!input) return fail("Brief inexistent sau inaccesibil.", "no_section");

  let complete;
  try {
    complete = createAnthropicComplete();
  } catch {
    // Missing/invalid API key → safe message, no internal detail, no key logged.
    return fail("Serviciul AI nu este configurat (cheia API lipsește).", "api_error");
  }

  return runSectionGeneration(input, complete);
}
