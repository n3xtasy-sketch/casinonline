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

export interface SeoImportRow {
  id: string;
  source: string;
  filename: string | null;
  rowCount: number;
  status: string;
  importedAt: string;
}

/** Recent import batches for a project (newest first). */
export async function listSeoImports(projectId: string, limit = 20): Promise<SeoImportRow[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db
    .from("seo_imports")
    .select("id, source, filename, row_count, status, imported_at")
    .eq("project_id", projectId)
    .order("imported_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listSeoImports: ${error.message}`);
  return ((data as unknown as { id: string; source: string; filename: string | null; row_count: number; status: string; imported_at: string }[]) ?? []).map(
    (r) => ({ id: r.id, source: r.source, filename: r.filename, rowCount: r.row_count, status: r.status, importedAt: r.imported_at }),
  );
}

export interface SeoKeywordRow {
  id: string;
  keyword: string;
  country: string;
  volume: number | null;
  difficulty: number | null;
  trafficPotential: number | null;
  intent: string | null;
  parentTopic: string | null;
  mappedUrl: string | null;
  mappingStatus: string;
  updatedAt: string;
}

export type KeywordSort = "volume" | "difficulty" | "keyword" | "updated_at";

export interface KeywordQuery {
  search?: string;
  country?: string;
  intent?: string;
  sort?: KeywordSort;
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface KeywordPage {
  rows: SeoKeywordRow[];
  total: number;
  page: number;
  pageSize: number;
  countries: string[];
  intents: string[];
}

const SORT_COLS: Record<KeywordSort, string> = {
  volume: "volume",
  difficulty: "difficulty",
  keyword: "keyword_normalized",
  updated_at: "updated_at",
};

export async function listSeoKeywords(projectId: string, q: KeywordQuery = {}): Promise<KeywordPage> {
  const db = await getSupabaseAuthClient();
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, q.pageSize ?? 50));
  const sortCol = SORT_COLS[q.sort ?? "volume"];
  const ascending = q.dir === "asc";

  let query = db
    .from("seo_keywords")
    .select(
      "id, keyword, country, volume, difficulty, traffic_potential, intent, parent_topic, mapped_url, mapping_status, updated_at",
      { count: "exact" },
    )
    .eq("project_id", projectId);
  if (q.search?.trim()) query = query.ilike("keyword", `%${q.search.trim()}%`);
  if (q.country) query = query.eq("country", q.country);
  if (q.intent) query = query.eq("intent", q.intent);
  query = query.order(sortCol, { ascending, nullsFirst: false }).range((page - 1) * pageSize, page * pageSize - 1);

  const { data, count, error } = await query;
  if (error) throw new Error(`listSeoKeywords: ${error.message}`);
  const rows = ((data as unknown as {
    id: string; keyword: string; country: string; volume: number | null; difficulty: number | null;
    traffic_potential: number | null; intent: string | null; parent_topic: string | null;
    mapped_url: string | null; mapping_status: string; updated_at: string;
  }[]) ?? []).map((r) => ({
    id: r.id, keyword: r.keyword, country: r.country, volume: r.volume, difficulty: r.difficulty,
    trafficPotential: r.traffic_potential, intent: r.intent, parentTopic: r.parent_topic,
    mappedUrl: r.mapped_url, mappingStatus: r.mapping_status, updatedAt: r.updated_at,
  }));

  // Facets for the filters (country/intent), derived from a light projection.
  const { data: facetData } = await db.from("seo_keywords").select("country, intent").eq("project_id", projectId);
  const countries = new Set<string>();
  const intents = new Set<string>();
  for (const f of (facetData as unknown as { country: string; intent: string | null }[]) ?? []) {
    if (f.country) countries.add(f.country);
    if (f.intent) intents.add(f.intent);
  }

  return { rows, total: count ?? 0, page, pageSize, countries: [...countries].sort(), intents: [...intents].sort() };
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
