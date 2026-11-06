"use server";

import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { getBriefById, listBriefs } from "@/lib/db/admin-seo-briefs";
import { listSections, type ContentBrief, type ContentSection } from "@/lib/ai/content-prompt";

/** AI-2 Content Studio data actions. Admin-gated, read-only (no CMS writes, no persistence). */

async function requireAdmin() {
  const db = await getSupabaseAuthClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Neautentificat.");
  const { data: profile } = await db.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) throw new Error("Acces interzis.");
}

export interface StudioBriefOption {
  id: string;
  title: string;
}
export async function loadProjectBriefsAction(projectId: string): Promise<StudioBriefOption[]> {
  await requireAdmin();
  const briefs = await listBriefs(projectId);
  return briefs.map((b) => ({ id: b.id, title: b.title || b.clusterName || "(fără titlu)" }));
}

export interface StudioBrief {
  id: string;
  title: string;
  primaryKeyword: string;
  intent: string | null;
  targetUrl: string | null;
  h1: string;
  outline: { level: number; heading: string; keywords: string[] }[];
  confirmedEntities: { name: string; type: string }[];
  sections: ContentSection[];
}

export async function loadStudioBriefAction(projectId: string, briefId: string): Promise<StudioBrief | null> {
  await requireAdmin();
  const b = await getBriefById(projectId, briefId);
  if (!b) return null;
  const cb: ContentBrief = {
    title: b.title ?? "", primaryKeyword: b.primaryKeyword ?? "", secondaryKeywords: b.secondaryKeywords,
    intent: b.intent, targetUrl: b.targetUrl, h1: b.h1 ?? "", outline: b.outline, entities: b.entities, faq: b.faq,
  };
  return {
    id: b.id,
    title: b.title ?? "",
    primaryKeyword: b.primaryKeyword ?? "",
    intent: b.intent,
    targetUrl: b.targetUrl,
    h1: b.h1 ?? "",
    outline: b.outline.map((o) => ({ level: o.level, heading: o.heading, keywords: o.keywords })),
    confirmedEntities: b.entities.filter((e) => e.source === "confirmed").map((e) => ({ name: e.name, type: e.type })),
    sections: listSections(cb),
  };
}
