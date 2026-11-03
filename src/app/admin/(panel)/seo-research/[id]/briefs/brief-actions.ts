"use server";

import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { logActivity } from "@/lib/db/activity";
import { updateTag } from "next/cache";
import {
  getBriefById, loadBriefGenerationInput, loadEntityDict, listBriefTargetUrls,
} from "@/lib/db/admin-seo-briefs";
import { buildBriefDraft, mergeBriefDraft, type BriefEntity, type FaqItem, type OutlineItem, type Provenance } from "@/lib/seo/brief";
import {
  availableBriefTransitions, briefReadinessError, isBriefTransitionAllowed, type BriefStatus,
} from "@/lib/brief-status";

type DB = Awaited<ReturnType<typeof getSupabaseAuthClient>>;

async function requireAdmin(): Promise<DB> {
  const db = await getSupabaseAuthClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Neautentificat.");
  const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) throw new Error("Acces interzis.");
  return db;
}

async function assertProject(db: DB, projectId: string): Promise<string | null> {
  const { data } = await db.from("seo_projects").select("id").eq("id", projectId).maybeSingle();
  return data ? null : "Proiect inexistent sau inaccesibil.";
}

/** Non-blocking: other active briefs pointing at the same target URL. */
async function cannibalWarnings(projectId: string, excludeId: string | null, targetUrl: string | null): Promise<string[]> {
  if (!targetUrl) return [];
  const others = await listBriefTargetUrls(projectId, excludeId);
  const clash = others.filter((o) => o.targetUrl === targetUrl);
  return clash.length
    ? [`Atenție (preliminar, fără validare SERP): ${clash.length} alt(e) brief(uri) active țintesc același URL „${targetUrl}" — risc de canibalizare.`]
    : [];
}

const now = () => new Date().toISOString();

// ── Create from a cluster (deterministic generation) ──────────────────────────
export interface CreateResult { id: string; warnings: string[] }

export async function createBriefFromClusterAction(projectId: string, clusterId: string): Promise<CreateResult | { error: string }> {
  const db = await requireAdmin();
  const pErr = await assertProject(db, projectId);
  if (pErr) return { error: pErr };

  const input = await loadBriefGenerationInput(projectId, clusterId);
  if (!input) return { error: "Cluster inexistent sau inaccesibil." };
  const dict = await loadEntityDict();
  const draft = buildBriefDraft(input, dict);

  const { data, error } = await db
    .from("seo_briefs")
    .insert({
      project_id: projectId,
      cluster_id: clusterId,
      title: draft.title,
      primary_keyword: draft.primaryKeyword || null,
      secondary_keywords: draft.secondaryKeywords,
      intent: draft.intent,
      target_url: draft.targetUrl,
      h1: draft.h1 || null,
      outline: draft.outline,
      entities: draft.entities,
      faq: draft.faq,
      sources: { ...draft.sources, reviewFlags: draft.reviewFlags },
      field_provenance: draft.fieldProvenance,
      locked_fields: [],
      generated_at: now(),
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Acest cluster are deja un brief activ (non-arhivat)." };
    return { error: `Eroare la creare: ${error.message}` };
  }
  const id = (data as { id: string }).id;
  await logActivity(db, { action: "seo_brief.create", entityType: "seo_brief", entityId: id, label: draft.title, metadata: { from: "cluster", clusterId } });
  updateTag("seo_briefs");
  return { id, warnings: await cannibalWarnings(projectId, id, draft.targetUrl) };
}

export async function createEmptyBriefAction(projectId: string): Promise<{ id: string } | { error: string }> {
  const db = await requireAdmin();
  const pErr = await assertProject(db, projectId);
  if (pErr) return { error: pErr };
  const { data, error } = await db
    .from("seo_briefs")
    .insert({ project_id: projectId, title: "Brief nou", status: "draft", field_provenance: {}, locked_fields: [] })
    .select("id")
    .single();
  if (error) return { error: `Eroare la creare: ${error.message}` };
  const id = (data as { id: string }).id;
  await logActivity(db, { action: "seo_brief.create", entityType: "seo_brief", entityId: id, metadata: { from: "empty" } });
  updateTag("seo_briefs");
  return { id };
}

// ── Regenerate (draft only, respects locked/manual/confirmed) ──────────────────
export async function regenerateBriefAction(projectId: string, briefId: string): Promise<{ ok: true; warnings: string[] } | { error: string }> {
  const db = await requireAdmin();
  const pErr = await assertProject(db, projectId);
  if (pErr) return { error: pErr };
  const existing = await getBriefById(projectId, briefId);
  if (!existing) return { error: "Brief inexistent." };
  if (existing.status !== "draft") return { error: "Regenerarea e permisă doar în stare draft. Redeschide brief-ul mai întâi." };
  if (!existing.clusterId) return { error: "Brief fără cluster asociat — nu poate fi regenerat." };

  const input = await loadBriefGenerationInput(projectId, existing.clusterId);
  if (!input) return { error: "Clusterul sursă nu mai există." };
  const dict = await loadEntityDict();
  const fresh = buildBriefDraft(input, dict);

  const merged = mergeBriefDraft(
    {
      title: existing.title ?? "", primaryKeyword: existing.primaryKeyword ?? "", secondaryKeywords: existing.secondaryKeywords,
      intent: existing.intent, targetUrl: existing.targetUrl, h1: existing.h1 ?? "", outline: existing.outline,
      entities: existing.entities, faq: existing.faq, fieldProvenance: existing.fieldProvenance,
    },
    fresh,
    existing.lockedFields,
  );

  const { error } = await db
    .from("seo_briefs")
    .update({
      title: merged.values.title || null,
      primary_keyword: merged.values.primaryKeyword || null,
      secondary_keywords: merged.values.secondaryKeywords,
      intent: merged.values.intent,
      target_url: merged.values.targetUrl,
      h1: merged.values.h1 || null,
      outline: merged.values.outline,
      entities: merged.values.entities,
      faq: merged.values.faq,
      sources: { ...fresh.sources, reviewFlags: fresh.reviewFlags },
      field_provenance: merged.fieldProvenance,
      generated_at: now(),
    })
    .eq("id", briefId)
    .eq("project_id", projectId);
  if (error) return { error: `Eroare la regenerare: ${error.message}` };
  await logActivity(db, { action: "seo_brief.regenerate", entityType: "seo_brief", entityId: briefId, metadata: { locked: existing.lockedFields } });
  updateTag("seo_briefs");
  return { ok: true, warnings: await cannibalWarnings(projectId, briefId, merged.values.targetUrl) };
}

// ── Save editorial content (optimistic concurrency + lock) ─────────────────────
export interface BriefSavePayload {
  title: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  intent: string | null;
  targetUrl: string | null;
  h1: string;
  outline: OutlineItem[];
  entities: BriefEntity[];
  faq: FaqItem[];
  notes: string;
  lockedFields: string[];
}

export async function saveBriefAction(
  projectId: string,
  briefId: string,
  payload: BriefSavePayload,
  expectedUpdatedAt: string,
): Promise<{ ok: true; updatedAt: string; warnings: string[] } | { error: string; conflict?: boolean }> {
  const db = await requireAdmin();
  const pErr = await assertProject(db, projectId);
  if (pErr) return { error: pErr };
  const existing = await getBriefById(projectId, briefId);
  if (!existing) return { error: "Brief inexistent." };
  if (existing.status === "approved") return { error: "Brief aprobat — redeschide-l (status → gata/draft) înainte de a edita conținutul." };

  // Provenance: locked fields become 'manual'; others keep their current origin.
  const provenance: Record<string, Provenance> = { ...existing.fieldProvenance };
  for (const f of payload.lockedFields) provenance[f] = "manual";

  const { data, error } = await db
    .from("seo_briefs")
    .update({
      title: payload.title.trim() || null,
      primary_keyword: payload.primaryKeyword.trim() || null,
      secondary_keywords: payload.secondaryKeywords,
      intent: payload.intent?.trim() || null,
      target_url: payload.targetUrl?.trim() || null,
      h1: payload.h1.trim() || null,
      outline: payload.outline,
      entities: payload.entities,
      faq: payload.faq,
      notes: payload.notes.trim() || null,
      field_provenance: provenance,
      locked_fields: [...new Set(payload.lockedFields)],
    })
    .eq("id", briefId)
    .eq("project_id", projectId)
    .eq("updated_at", expectedUpdatedAt)
    .select("updated_at");
  if (error) return { error: `Eroare la salvare: ${error.message}` };
  if (!data || (data as unknown[]).length === 0) {
    return { error: "Brief-ul a fost modificat între timp. Reîncarcă pagina și reaplică modificările.", conflict: true };
  }
  await logActivity(db, { action: "seo_brief.update", entityType: "seo_brief", entityId: briefId, metadata: { locked: payload.lockedFields } });
  updateTag("seo_briefs");
  const updatedAt = (data as { updated_at: string }[])[0].updated_at;
  return { ok: true, updatedAt, warnings: await cannibalWarnings(projectId, briefId, payload.targetUrl) };
}

// ── Status transition (matrix + readiness gate, concurrency, audit) ────────────
export async function transitionBriefAction(
  projectId: string,
  briefId: string,
  next: BriefStatus,
  expectedUpdatedAt: string,
): Promise<{ ok: true; updatedAt: string } | { error: string; conflict?: boolean }> {
  const db = await requireAdmin();
  const pErr = await assertProject(db, projectId);
  if (pErr) return { error: pErr };
  const existing = await getBriefById(projectId, briefId);
  if (!existing) return { error: "Brief inexistent." };
  if (!isBriefTransitionAllowed(existing.status, next)) {
    const opts = availableBriefTransitions(existing.status).map((t) => t.next).join(", ");
    return { error: `Tranziție interzisă (${existing.status} → ${next}). Permise: ${opts || "—"}.` };
  }
  if (next === "ready") {
    const rErr = briefReadinessError({ primaryKeyword: existing.primaryKeyword, targetUrl: existing.targetUrl, h1: existing.h1, outline: existing.outline });
    if (rErr) return { error: `Nu poate fi marcat „gata": ${rErr}` };
  }

  const { data, error } = await db
    .from("seo_briefs")
    .update({ status: next })
    .eq("id", briefId)
    .eq("project_id", projectId)
    .eq("updated_at", expectedUpdatedAt)
    .select("updated_at");
  if (error) return { error: `Eroare la schimbarea stării: ${error.message}` };
  if (!data || (data as unknown[]).length === 0) {
    return { error: "Brief-ul a fost modificat între timp. Reîncarcă pagina.", conflict: true };
  }
  await logActivity(db, { action: "seo_brief.status", entityType: "seo_brief", entityId: briefId, label: next, metadata: { from: existing.status, to: next } });
  updateTag("seo_briefs");
  return { ok: true, updatedAt: (data as { updated_at: string }[])[0].updated_at };
}

export async function deleteBriefAction(projectId: string, briefId: string): Promise<{ ok: true } | { error: string }> {
  const db = await requireAdmin();
  const pErr = await assertProject(db, projectId);
  if (pErr) return { error: pErr };
  const { error } = await db.from("seo_briefs").delete().eq("id", briefId).eq("project_id", projectId);
  if (error) return { error: `Eroare la ștergere: ${error.message}` };
  await logActivity(db, { action: "seo_brief.delete", entityType: "seo_brief", entityId: briefId });
  updateTag("seo_briefs");
  return { ok: true };
}
