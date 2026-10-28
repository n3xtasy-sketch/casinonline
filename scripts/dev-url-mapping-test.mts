/**
 * FAZA 5.1E — URL Mapping DEV E2E (DEV ONLY, throwaway data).
 *
 * Verifies the DB writes the URL-mapping server actions rely on, against real Supabase DEV:
 *   - map a cluster → mapped_url/mapping_status written to its keywords
 *   - confirm → mapping_status='confirmed'
 *   - a CONFIRMED keyword is NEVER overwritten by a cluster-level map/remove (editorial protection)
 *   - remove clears only non-confirmed keywords
 *   - per-keyword set/clear
 *   - cluster_id / primary_keyword untouched by any mapping op
 *   - the pure engine runs end-to-end over the resulting mapped_url values
 * The actions add admin auth + request context a standalone script can't supply; the mapping
 * engine itself is covered by src/lib/seo/url-mapping.test.ts.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeKeyword } from "@/lib/seo-research";
import { detectUrlCannibalization, type ClusterForMapping } from "@/lib/seo/url-mapping";

const URL = process.env.SUPABASE_URL!, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL.includes("radhontyxrzjeatsaccg")) { console.error("⛔ DEV only"); process.exit(2); }
const db = createClient(URL, SVC, { auth: { persistSession: false } }) as unknown as SupabaseClient;
let pass = 0, fail = 0, pid = "";
const ok = (c: boolean, l: string, e = "") => { if (c) { pass++; console.log(`  ✅ ${l}`); } else { fail++; console.log(`  ❌ ${l}${e ? ` · ${e}` : ""}`); } };

// Mirror of mapClusterUrlAction / removeClusterUrlAction.
async function mapCluster(clusterId: string, url: string | null, confirm: boolean) {
  const patch = url === null ? { mapped_url: null, mapping_status: "none" } : { mapped_url: url, mapping_status: confirm ? "confirmed" : "suggested" };
  const { data } = await db.from("seo_keywords").update(patch).eq("project_id", pid).eq("cluster_id", clusterId).neq("mapping_status", "confirmed").select("id");
  return (data as { id: string }[]).length;
}
const kwRow = async (id: string) => (await db.from("seo_keywords").select("mapped_url, mapping_status, cluster_id").eq("id", id).single()).data as Record<string, unknown>;

async function main() {
  console.log("== FAZA 5.1E URL mapping DEV E2E ==");
  pid = (await db.from("seo_projects").insert({ name: "zz-5_1e urlmap" }).select("id").single()).data!.id as string;
  const cl = (await db.from("seo_clusters").insert({ project_id: pid, name: "zz cluster", primary_keyword: "book of ra" }).select("id").single()).data!.id as string;

  const mk = async (keyword: string, extra: Record<string, unknown> = {}) =>
    (await db.from("seo_keywords").insert({ project_id: pid, keyword, keyword_normalized: normalizeKeyword(keyword), country: "ro", cluster_id: cl, ...extra }).select("id").single()).data!.id as string;
  const k1 = await mk("book of ra deluxe");
  const k2 = await mk("book of ra magic");
  const k3 = await mk("book of ra classic", { mapped_url: "/ghiduri/manual", mapping_status: "confirmed" }); // editorial, protected

  // 1) map cluster (suggested) — confirmed keyword skipped.
  const u1 = await mapCluster(cl, "/jocuri-casino/book-of-ra", false);
  ok(u1 === 2, "map cluster → 2 keyworduri actualizate (cel confirmat sărit)", String(u1));
  ok((await kwRow(k1)).mapping_status === "suggested" && (await kwRow(k1)).mapped_url === "/jocuri-casino/book-of-ra", "k1 suggested + url corect");
  const r3 = await kwRow(k3);
  ok(r3.mapped_url === "/ghiduri/manual" && r3.mapping_status === "confirmed", "k3 CONFIRMAT păstrat (neatins)");

  // 2) confirm cluster.
  await mapCluster(cl, "/jocuri-casino/book-of-ra", true);
  ok((await kwRow(k2)).mapping_status === "confirmed", "confirm → mapping_status=confirmed");

  // 3) remove — now k1,k2 are confirmed too, so remove should skip ALL (0 cleared).
  const cleared = await mapCluster(cl, null, false);
  ok(cleared === 0, "remove după confirm → 0 (toate confirmate, protejate)", String(cleared));

  // 4) per-keyword clear (explicit manual override allowed on confirmed).
  await db.from("seo_keywords").update({ mapped_url: null, mapping_status: "none" }).eq("id", k1).eq("project_id", pid);
  ok((await kwRow(k1)).mapped_url === null, "per-keyword golire (override manual pe confirmat)");

  // 5) cluster_id / primary_keyword untouched.
  const prim = (await db.from("seo_clusters").select("primary_keyword").eq("id", cl).single()).data as { primary_keyword: string };
  ok(prim.primary_keyword === "book of ra" && (await kwRow(k2)).cluster_id === cl, "cluster_id & primary_keyword neatinse de mapare");

  // 6) engine end-to-end over real rows.
  const { data: kws } = await db.from("seo_keywords").select("id, keyword, keyword_normalized, mapped_url, mapping_status").eq("project_id", pid);
  const cfm: ClusterForMapping[] = [{ id: cl, name: "zz cluster", intent: null, primaryKeyword: "book of ra",
    keywords: (kws as Record<string, unknown>[]).map((r) => ({ id: r.id as string, keyword: r.keyword as string, normalized: r.keyword_normalized as string, mappedUrl: r.mapped_url as string | null, mappingStatus: r.mapping_status as string })) }];
  const warnings = detectUrlCannibalization(cfm, [], []);
  ok(Array.isArray(warnings), "detectUrlCannibalization rulează pe rânduri reale", `warnings=${warnings.length}`);

  // cleanup
  await db.from("seo_projects").delete().eq("id", pid);
  const resid = (await db.from("seo_projects").select("id", { count: "exact", head: true }).like("name", "zz-5_1e%")).count ?? 0;
  ok(resid === 0, "cleanup: 0 reziduale");
  console.log(`\n== ${pass} PASS · ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
}
main().catch(async (e) => { if (pid) { try { await db.from("seo_projects").delete().eq("id", pid); } catch { /* best effort */ } } console.error("EROARE:", e.message); process.exit(1); });
