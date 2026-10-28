import "server-only";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import type { SeoProjectStats } from "@/lib/seo-research";

/** Admin reads for SEO Research. Admin session → RLS (is_admin()) gates everything. */

export interface SeoProject {
  id: string;
  name: string;
  defaultCountry: string;
  createdAt: string;
}

export async function listSeoProjects(): Promise<SeoProject[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db
    .from("seo_projects")
    .select("id, name, default_country, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listSeoProjects: ${error.message}`);
  return ((data as unknown as { id: string; name: string; default_country: string; created_at: string }[]) ?? []).map(
    (r) => ({ id: r.id, name: r.name, defaultCountry: r.default_country, createdAt: r.created_at }),
  );
}

export async function getSeoProject(id: string): Promise<SeoProject | null> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db
    .from("seo_projects")
    .select("id, name, default_country, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getSeoProject: ${error.message}`);
  if (!data) return null;
  const r = data as unknown as { id: string; name: string; default_country: string; created_at: string };
  return { id: r.id, name: r.name, defaultCountry: r.default_country, createdAt: r.created_at };
}

/** Initial indicators for a project: keywords / clusters / imports / briefs. */
export async function getSeoProjectStats(projectId: string): Promise<SeoProjectStats> {
  const db = await getSupabaseAuthClient();
  const count = async (table: string): Promise<number> => {
    const { count, error } = await db
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId);
    if (error) throw new Error(`getSeoProjectStats(${table}): ${error.message}`);
    return count ?? 0;
  };
  const [keywords, clusters, imports, briefs] = await Promise.all([
    count("seo_keywords"),
    count("seo_clusters"),
    count("seo_imports"),
    count("seo_briefs"),
  ]);
  return { keywords, clusters, imports, briefs };
}
