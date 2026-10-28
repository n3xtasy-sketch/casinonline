/**
 * FAZA 5.1D — Keyword Clustering DEV E2E (DEV ONLY, throwaway data).
 *
 * Verifies the DB behaviors the cluster server actions rely on, against real Supabase DEV:
 *   - engine produces suggestions over loaded keywords (end-to-end integration)
 *   - apply assigns ONLY unassigned keywords (editorial protection, `is cluster_id null`)
 *   - manual move reassigns a keyword between clusters
 *   - deleting a cluster detaches keywords (FK on delete set null) — keywords are NOT deleted
 *   - cleanup leaves no residual test data
 *
 * Run: `npx tsx scripts/dev-clustering-test.mts` with DEV creds in the environment.
 * The server actions themselves are thin wrappers over these exact queries (they add
 * admin auth + request context which a standalone script can't supply); the clustering
 * engine is covered separately by src/lib/seo/clustering.test.ts.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeKeyword } from "@/lib/seo-research";
import { generateClusterSuggestions, type ClusterKeyword } from "@/lib/seo/clustering";

const URL = process.env.SUPABASE_URL!;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !URL.includes("radhontyxrzjeatsaccg")) { console.error("⛔ DEV only (radhontyxrzjeatsaccg)"); process.exit(2); }
const db = createClient(URL, SVC, { auth: { persistSession: false } }) as unknown as SupabaseClient;

let pass = 0, fail = 0;
const ok = (c: boolean, l: string, e = "") => { if (c) { pass++; console.log(`  ✅ ${l}`); } else { fail++; console.log(`  ❌ ${l}${e ? ` · ${e}` : ""}`); } };
let projectId = "";

async function insertKw(rows: { keyword: string; intent?: string; volume?: number; parent?: string; clusterId?: string }[]) {
  const payload = rows.map((r) => ({
    project_id: projectId,
    keyword: r.keyword,
    keyword_normalized: normalizeKeyword(r.keyword),
    country: "ro",
    intent: r.intent ?? null,
    volume: r.volume ?? null,
    parent_topic: r.parent ?? null,
    cluster_id: r.clusterId ?? null,
  }));
  const { data, error } = await db.from("seo_keywords").insert(payload).select("id, keyword");
  if (error) throw new Error(error.message);
  return data as { id: string; keyword: string }[];
}

async function main() {
  console.log("== FAZA 5.1D clustering DEV E2E ==");
  projectId = (await db.from("seo_projects").insert({ name: "zz-5_1d clustering" }).select("id").single()).data!.id as string;

  // Pre-existing cluster + one keyword already assigned to it (protected).
  const existing = (await db.from("seo_clusters").insert({ project_id: projectId, name: "zz existing" }).select("id").single()).data!.id as string;
  const [guard] = await insertKw([{ keyword: "book of ra gold", clusterId: existing }]);
  await insertKw([
    { keyword: "book of ra deluxe", volume: 500 },
    { keyword: "book of ra magic", volume: 300 },
    { keyword: "book of ra classic", volume: 200 },
    { keyword: "bonus cazino mare", parent: "Bonusuri", intent: "Commercial", volume: 400 },
    { keyword: "bonus cazino rapid", parent: "Bonusuri", intent: "Commercial", volume: 350 },
    { keyword: "strategie ruleta avansata", intent: "Informational", volume: 120 },
    { keyword: "strategie ruleta bani", intent: "Transactional", volume: 90 },
  ]);

  // 1) Load + engine integration.
  const { data: loaded } = await db
    .from("seo_keywords")
    .select("id, keyword, keyword_normalized, intent, volume, difficulty, parent_topic, cluster_id, mapped_url, mapping_status")
    .eq("project_id", projectId);
  const kws: ClusterKeyword[] = (loaded as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, keyword: r.keyword as string, normalized: r.keyword_normalized as string,
    intent: r.intent as string | null, volume: r.volume as number | null, difficulty: r.difficulty as number | null,
    parentTopic: r.parent_topic as string | null, clusterId: r.cluster_id as string | null,
    mappedUrl: r.mapped_url as string | null, mappingStatus: r.mapping_status as string,
  }));
  const run = generateClusterSuggestions(kws);
  ok(run.suggestions.length >= 2, "engine produce sugestii (book-of-ra lexical + bonusuri parent)", `n=${run.suggestions.length}`);
  ok(run.suggestions.every((s) => !s.keywordIds.includes(guard.id)), "keyword deja atribuit NU apare în sugestii (protecție)");
  const conflict = run.suggestions.find((s) => s.keywordIds.length === 2 && s.reasons.some((r) => /conflict/i.test(r)));
  ok(!run.suggestions.some((s) => {
    const ks = s.keywordIds.map((id) => kws.find((k) => k.id === id)?.keyword);
    return ks?.includes("strategie ruleta avansata") && ks?.includes("strategie ruleta bani");
  }), "intenții în conflict (strategie ruleta info vs transactional) NU sunt grupate");
  void conflict;

  // 2) Apply protection: assign a lexical suggestion, then re-apply → 0 new.
  const lex = run.suggestions.find((s) => s.method === "lexical")!;
  const c1 = (await db.from("seo_clusters").insert({ project_id: projectId, name: "zz applied" }).select("id").single()).data!.id as string;
  const a1 = (await db.from("seo_keywords").update({ cluster_id: c1 }).eq("project_id", projectId).is("cluster_id", null).in("id", lex.keywordIds).select("id")).data as { id: string }[];
  ok(a1.length === lex.keywordIds.length, "apply atribuie keywordurile neatribuite", `${a1.length}/${lex.keywordIds.length}`);
  const a2 = (await db.from("seo_keywords").update({ cluster_id: c1 }).eq("project_id", projectId).is("cluster_id", null).in("id", lex.keywordIds).select("id")).data as { id: string }[];
  ok(a2.length === 0, "re-apply pe aceleași id-uri → 0 (protecție la nivel DB)");

  // 3) Move a keyword between clusters.
  const mv = lex.keywordIds[0];
  const c2 = (await db.from("seo_clusters").insert({ project_id: projectId, name: "zz target" }).select("id").single()).data!.id as string;
  await db.from("seo_keywords").update({ cluster_id: c2 }).eq("id", mv).eq("project_id", projectId);
  const moved = (await db.from("seo_keywords").select("cluster_id").eq("id", mv).single()).data as { cluster_id: string };
  ok(moved.cluster_id === c2, "mutare keyword între clustere");

  // 4) Delete a cluster → keywords detached (NOT deleted).
  const before = (await db.from("seo_keywords").select("id", { count: "exact", head: true }).eq("project_id", projectId)).count ?? 0;
  await db.from("seo_clusters").delete().eq("id", c1).eq("project_id", projectId);
  const after = (await db.from("seo_keywords").select("id", { count: "exact", head: true }).eq("project_id", projectId)).count ?? 0;
  ok(before === after, "ștergerea clusterului NU șterge keywordurile", `before=${before} after=${after}`);
  const detached = (await db.from("seo_keywords").select("cluster_id").eq("id", lex.keywordIds[1] ?? lex.keywordIds[0]).single()).data as { cluster_id: string | null };
  ok(detached.cluster_id === null || detached.cluster_id === c2, "keywordurile fostului cluster au cluster_id NULL (FK set null)");

  // 5) Cleanup.
  await db.from("seo_projects").delete().eq("id", projectId);
  const resid = (await db.from("seo_projects").select("id", { count: "exact", head: true }).like("name", "zz-5_1d%")).count ?? 0;
  ok(resid === 0, "cleanup: 0 proiecte test reziduale");

  console.log(`\n== ${pass} PASS · ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
}
main().catch(async (e) => {
  if (projectId) { try { await db.from("seo_projects").delete().eq("id", projectId); } catch { /* best effort */ } }
  console.error("EROARE:", e.message);
  process.exit(1);
});
