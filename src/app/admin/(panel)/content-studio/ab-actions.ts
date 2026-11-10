"use server";

import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { loadSectionGenerationInput } from "@/lib/ai/brief-content-input";
import { buildVirtualSectionInputs, runABExperiment, LIVE_AUTH_TOKEN, type ABExperimentReport } from "@/lib/ai/ab-runner";
import { createAnthropicComplete } from "@/lib/ai/anthropic-client";
import { acquireABRun, releaseABRun } from "@/lib/ai/ab-run-guard";

/**
 * AI-2.9D.2E secure admin A/B execution. Admin-gated server-side on EVERY call (never relies on the UI
 * hiding the button). The client passes ONLY ids — no prompt, no model, no authorKnowledge, no
 * LIVE_AUTH_TOKEN and no section specs. The server loads the real brief, builds ONLY the rulaj pair
 * (buildVirtualSectionInputs(base).slice(0,1)) and runs exactly 2 LIVE generations (A without Author
 * Knowledge, B with scoped Author Knowledge). The LIVE authorization token stays server-side; the API key
 * is read from the runtime env by the adapter and is never returned. Nothing is persisted.
 */
async function requireAdmin() {
  const db = await getSupabaseAuthClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Neautentificat.");
  const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) throw new Error("Acces interzis.");
}

export type ABActionResult = { ok: true; report: ABExperimentReport } | { ok: false; error: string };

export async function runRulajABExperimentAction(projectId: string, briefId: string): Promise<ABActionResult> {
  await requireAdmin(); // server-side authorization, re-checked on every invocation

  const key = `${projectId}:${briefId}`;
  if (!acquireABRun(key)) return { ok: false, error: "Experiment deja in curs pentru acest brief. Asteapta finalizarea." };

  try {
    const base = await loadSectionGenerationInput(projectId, briefId, "intro");
    if (!base) return { ok: false, error: "Brief inexistent sau inaccesibil." };

    // ONLY the rulaj pair — section 0 of the fixed virtual spec list. Client cannot choose the section.
    const inputs = buildVirtualSectionInputs(base).slice(0, 1);

    let complete;
    try {
      complete = createAnthropicComplete(); // key from the runtime env; never shipped to the client
    } catch {
      return { ok: false, error: "Serviciul AI nu este configurat (cheia API lipseste in mediu)." };
    }

    // Exactly 2 LIVE generations, per-section token budget + maxRetries:0, early-abort on a fatal result.
    const report = await runABExperiment(inputs, { mode: "live", authorize: LIVE_AUTH_TOKEN, complete });
    return { ok: true, report }; // textA/textB + metrics only — no prompts, no keys
  } catch {
    return { ok: false, error: "Executia experimentului a esuat." };
  } finally {
    releaseABRun(key);
  }
}
