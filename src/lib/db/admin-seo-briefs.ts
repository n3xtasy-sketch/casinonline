import "server-only";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { normalizeKeyword } from "@/lib/seo-research";
import { deriveClusterMapping, recommendUrls, type ClusterForMapping } from "@/lib/seo/url-mapping";
import { buildUrlInventory } from "@/lib/db/url-inventory";
import type {
  BriefClusterInput, BriefEntity, BriefKeyword, EntityDictItem, FaqItem, OutlineItem, Provenance,
} from "@/lib/seo/brief";
import type { BriefStatus } from "@/lib/brief-status";

/** Admin reads/data-assembly for the SEO Brief Workbench (KE-0). Admin session → RLS is_admin(). */

export interface BriefRow {
  id: string;
  projectId: string;
  clusterId: string | null;
  clusterName: string | null;
  targetUrl: string | null;
  title: string | null;
  primaryKeyword: string | null;
  secondaryKeywords: string[];
  intent: string | null;
  notes: string | null;
  h1: string | null;
  outline: OutlineItem[];
  entities: BriefEntity[];
  faq: FaqItem[];
  sources: Record<string, unknown>;
  fieldProvenance: Record<string, Provenance>;
  lockedFields: string[];
  generatedAt: string | null;
  status: BriefStatus;
  updatedAt: string;
  createdAt: string;
}

const COLS =
  "id, project_id, cluster_id, target_url, title, primary_keyword, secondary_keywords, intent, notes, " +
  "h1, outline, entities, faq, sources, field_provenance, locked_fields, generated_at, status, updated_at, created_at, " +
  "cluster:seo_clusters(name)";

function map(r: Record<string, unknown>): BriefRow {
  const cluster = r.cluster as { name: string } | null;
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    clusterId: (r.cluster_id as string | null) ?? null,
    clusterName: cluster?.name ?? null,
    targetUrl: (r.target_url as string | null) ?? null,
    title: (r.title as string | null) ?? null,
    primaryKeyword: (r.primary_keyword as string | null) ?? null,
    secondaryKeywords: (r.secondary_keywords as string[] | null) ?? [],
    intent: (r.intent as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    h1: (r.h1 as string | null) ?? null,
    outline: (r.outline as OutlineItem[] | null) ?? [],
    entities: (r.entities as BriefEntity[] | null) ?? [],
    faq: (r.faq as FaqItem[] | null) ?? [],
    sources: (r.sources as Record<string, unknown> | null) ?? {},
    fieldProvenance: (r.field_provenance as Record<string, Provenance> | null) ?? {},
    lockedFields: (r.locked_fields as string[] | null) ?? [],
    generatedAt: (r.generated_at as string | null) ?? null,
    status: (r.status as BriefStatus) ?? "draft",
    updatedAt: r.updated_at as string,
    createdAt: r.created_at as string,
  };
}

export async function listBriefs(projectId: string): Promise<BriefRow[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db
    .from("seo_briefs")
    .select(COLS)
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`listBriefs: ${error.message}`);
  return ((data as unknown as Record<string, unknown>[]) ?? []).map(map);
}

export async function getBriefById(projectId: string, id: string): Promise<BriefRow | null> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("seo_briefs").select(COLS).eq("project_id", projectId).eq("id", id).maybeSingle();
  if (error) throw new Error(`getBriefById: ${error.message}`);
  return data ? map(data as unknown as Record<string, unknown>) : null;
}

/** Clusters of a project + whether each already has an ACTIVE (non-archived) brief. */
export interface ClusterChoice {
  id: string;
  name: string;
  hasActiveBrief: boolean;
}
export async function listClustersForBrief(projectId: string): Promise<ClusterChoice[]> {
  const db = await getSupabaseAuthClient();
  const [{ data: clusters, error: cErr }, { data: briefs, error: bErr }] = await Promise.all([
    db.from("seo_clusters").select("id, name").eq("project_id", projectId).order("name"),
    db.from("seo_briefs").select("cluster_id").eq("project_id", projectId).neq("status", "archived").not("cluster_id", "is", null),
  ]);
  if (cErr) throw new Error(`listClustersForBrief(clusters): ${cErr.message}`);
  if (bErr) throw new Error(`listClustersForBrief(briefs): ${bErr.message}`);
  const taken = new Set(((briefs as { cluster_id: string }[]) ?? []).map((b) => b.cluster_id));
  return ((clusters as { id: string; name: string }[]) ?? []).map((c) => ({ id: c.id, name: c.name, hasActiveBrief: taken.has(c.id) }));
}

/** Target URLs used by OTHER active briefs in the project — for a non-blocking cannibalization hint. */
export async function listBriefTargetUrls(projectId: string, excludeId: string | null): Promise<{ id: string; title: string | null; targetUrl: string }[]> {
  const db = await getSupabaseAuthClient();
  let q = db.from("seo_briefs").select("id, title, target_url").eq("project_id", projectId).neq("status", "archived").not("target_url", "is", null);
  if (excludeId) q = q.neq("id", excludeId);
  const { data, error } = await q;
  if (error) throw new Error(`listBriefTargetUrls: ${error.message}`);
  return ((data as { id: string; title: string | null; target_url: string }[]) ?? []).map((r) => ({ id: r.id, title: r.title, targetUrl: r.target_url }));
}

/** Real CMS entities (published), name normalized like keywords, for grounded entity matching. */
export async function loadEntityDict(): Promise<EntityDictItem[]> {
  const db = await getSupabaseAuthClient();
  const specs: { table: string; type: string; base: string }[] = [
    { table: "casinos", type: "casino", base: "/cazinouri-online" },
    { table: "providers", type: "provider", base: "/furnizori" },
    { table: "games", type: "game", base: "/pacanele-online" },
    { table: "payment_methods", type: "payment", base: "/metode-de-plata" },
  ];
  const out: EntityDictItem[] = [];
  await Promise.all(
    specs.map(async (s) => {
      const { data, error } = await db.from(s.table).select("name, slug").eq("status", "published");
      if (error) throw new Error(`loadEntityDict(${s.table}): ${error.message}`);
      for (const r of (data as { name: string; slug: string }[]) ?? [])
        if (r.name && r.slug) out.push({ name: r.name, normalized: normalizeKeyword(r.name), type: s.type, ref: `${s.base}/${r.slug}` });
    }),
  );
  return out;
}

/**
 * Assemble the deterministic generation input for a cluster: its keywords, current mapping,
 * top URL recommendation and contributing import ids. Returns null if the cluster is gone.
 */
export async function loadBriefGenerationInput(projectId: string, clusterId: string): Promise<BriefClusterInput | null> {
  const db = await getSupabaseAuthClient();
  const { data: cluster } = await db
    .from("seo_clusters")
    .select("id, name, intent, primary_keyword")
    .eq("project_id", projectId)
    .eq("id", clusterId)
    .maybeSingle();
  const c = cluster as { id: string; name: string; intent: string | null; primary_keyword: string | null } | null;
  if (!c) return null;

  const { data: kwData, error: kErr } = await db
    .from("seo_keywords")
    .select("id, keyword, keyword_normalized, intent, volume, parent_topic, import_id, mapped_url, mapping_status")
    .eq("project_id", projectId)
    .eq("cluster_id", clusterId);
  if (kErr) throw new Error(`loadBriefGenerationInput(keywords): ${kErr.message}`);
  const rows = (kwData as {
    id: string; keyword: string; keyword_normalized: string; intent: string | null; volume: number | null;
    parent_topic: string | null; import_id: string | null; mapped_url: string | null; mapping_status: string;
  }[]) ?? [];

  const keywords: BriefKeyword[] = rows.map((r) => ({
    id: r.id, keyword: r.keyword, normalized: r.keyword_normalized, intent: r.intent, volume: r.volume, parentTopic: r.parent_topic,
  }));
  const importIds = [...new Set(rows.map((r) => r.import_id).filter((x): x is string => !!x))];

  const forMapping: ClusterForMapping = {
    id: c.id, name: c.name, intent: c.intent, primaryKeyword: c.primary_keyword,
    keywords: rows.map((r) => ({ id: r.id, keyword: r.keyword, normalized: r.keyword_normalized, mappedUrl: r.mapped_url, mappingStatus: r.mapping_status })),
  };
  const mapping = deriveClusterMapping(forMapping);

  let recommendedUrl: string | null = null;
  if (mapping.status !== "confirmed") {
    const inventory = await buildUrlInventory();
    const rec = recommendUrls([forMapping], inventory)[0];
    if (rec && rec.recommendation !== "create_new") recommendedUrl = rec.candidates[0]?.url ?? null;
  }

  return {
    clusterId: c.id,
    clusterName: c.name,
    clusterPrimaryKeyword: c.primary_keyword,
    clusterIntent: c.intent,
    keywords,
    mapping,
    recommendedUrl,
    importIds,
  };
}
