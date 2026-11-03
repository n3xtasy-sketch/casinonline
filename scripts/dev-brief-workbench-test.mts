/**
 * FAZA KE-0 — SEO Brief Workbench DEV E2E (DEV ONLY, throwaway data).
 *
 * Requires migration 0037 applied in DEV (adds brief columns + the partial unique index).
 * Verifies the DB behaviors the brief server actions rely on, against real Supabase DEV:
 *   - deterministic generation integrates end-to-end (buildBriefDraft over real keywords)
 *   - a brief row persists with provenance (confirmed vs suggested separated from SEO validation)
 *   - the partial unique index blocks a 2nd ACTIVE brief per cluster; archiving frees it
 *   - optimistic concurrency via updated_at (stale write → 0 rows; fresh write → 1 row)
 *   - regenerate merge preserves locked/manual/confirmed fields (engine integration)
 *   - RLS: anon cannot read/write seo_briefs
 *   - cleanup leaves no residual test data
 *
 * Run (after applying 0037 in DEV): `npx tsx scripts/dev-brief-workbench-test.mts`
 * The server actions add admin auth + request context a standalone script can't supply; the
 * generation/merge engine is covered separately by src/lib/seo/brief.test.ts.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeKeyword } from "@/lib/seo-research";
import { buildBriefDraft, mergeBriefDraft, type BriefKeyword, type BriefValues, type Provenance } from "@/lib/seo/brief";

const URL = process.env.SUPABASE_URL!;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON = process.env.SUPABASE_ANON_KEY;
if (!URL || !URL.includes("radhontyxrzjeatsaccg")) { console.error("⛔ DEV only (radhontyxrzjeatsaccg)"); process.exit(2); }
const db = createClient(URL, SVC, { auth: { persistSession: false } }) as unknown as SupabaseClient;

let pass = 0, fail = 0;
const ok = (c: boolean, l: string, e = "") => { if (c) { pass++; console.log(`  ✅ ${l}`); } else { fail++; console.log(`  ❌ ${l}${e ? ` · ${e}` : ""}`); } };
let projectId = "";

async function main() {
  console.log("== FAZA KE-0 brief workbench DEV E2E ==");
  projectId = (await db.from("seo_projects").insert({ name: "zz-brief ke0" }).select("id").single()).data!.id as string;
  const clusterId = (await db.from("seo_clusters").insert({ project_id: projectId, name: "zz-brief cluster", primary_keyword: "rotiri gratuite fara depunere", intent: "commercial" }).select("id").single()).data!.id as string;

  const kwRows = [
    { keyword: "rotiri gratuite fara depunere", parent: "Rotiri gratuite", volume: 800 },
    { keyword: "rotiri gratuite fara depunere 2026", parent: "Rotiri gratuite", volume: 300 },
    { keyword: "ce sunt rotirile gratuite", volume: 120, intent: "Informational" },
  ];
  await db.from("seo_keywords").insert(kwRows.map((r) => ({
    project_id: projectId, cluster_id: clusterId, keyword: r.keyword, keyword_normalized: normalizeKeyword(r.keyword),
    country: "ro", volume: r.volume, parent_topic: r.parent ?? null, intent: r.intent ?? null,
  })));

  // 1) Generation integration.
  const kw = (await db.from("seo_keywords").select("id, keyword, keyword_normalized, intent, volume, parent_topic").eq("cluster_id", clusterId)).data as Record<string, unknown>[];
  const keywords: BriefKeyword[] = kw.map((r) => ({ id: r.id as string, keyword: r.keyword as string, normalized: r.keyword_normalized as string, intent: r.intent as string | null, volume: r.volume as number | null, parentTopic: r.parent_topic as string | null }));
  const draft = buildBriefDraft({ clusterId, clusterName: "zz-brief cluster", clusterPrimaryKeyword: "rotiri gratuite fara depunere", clusterIntent: "commercial", keywords, mapping: { url: null, status: "none" }, recommendedUrl: null, importIds: [] });
  ok(draft.primaryKeyword === "rotiri gratuite fara depunere" && draft.fieldProvenance.primary_keyword === "confirmed", "primary confirmat din cluster");
  ok(draft.fieldProvenance.intent === "suggested", "intent marcat 'suggested' (fără validare SERP)");
  ok(draft.outline.some((o) => o.level === 2), "outline construit din parent topic (≥2 keyworduri)");
  ok(draft.faq.length >= 1, "FAQ din keyword interogativ");

  // 2) Persist a brief row.
  const briefId = (await db.from("seo_briefs").insert({
    project_id: projectId, cluster_id: clusterId, title: draft.title, primary_keyword: draft.primaryKeyword,
    secondary_keywords: draft.secondaryKeywords, intent: draft.intent, target_url: draft.targetUrl, h1: draft.h1,
    outline: draft.outline, entities: draft.entities, faq: draft.faq, sources: { ...draft.sources, reviewFlags: draft.reviewFlags },
    field_provenance: draft.fieldProvenance, locked_fields: [], status: "draft",
  }).select("id, updated_at").single()).data as { id: string; updated_at: string };
  ok(!!briefId.id, "brief creat (draft)");

  // 3) Duplicate protection (partial unique index).
  const dup = await db.from("seo_briefs").insert({ project_id: projectId, cluster_id: clusterId, title: "dup", status: "draft" });
  ok(!!dup.error && dup.error.code === "23505", "al 2-lea brief activ pe cluster → blocat (unique index)", dup.error?.code ?? "fără eroare");

  // 4) Archiving frees the cluster; a new active brief is then allowed.
  await db.from("seo_briefs").update({ status: "archived" }).eq("id", briefId.id);
  const reopen = await db.from("seo_briefs").insert({ project_id: projectId, cluster_id: clusterId, title: "după arhivare", status: "draft" }).select("id, updated_at").single();
  ok(!reopen.error && !!reopen.data, "după arhivare, un brief nou pe cluster e permis", reopen.error?.message ?? "");
  const activeId = (reopen.data as { id: string; updated_at: string }).id;
  const activeUpdatedAt = (reopen.data as { id: string; updated_at: string }).updated_at;

  // 5) Optimistic concurrency.
  const stale = await db.from("seo_briefs").update({ title: "stale" }).eq("id", activeId).eq("updated_at", "1999-01-01T00:00:00+00:00").select("id");
  ok(((stale.data as unknown[] | null)?.length ?? 0) === 0, "update cu updated_at învechit → 0 rânduri (conflict detectat)");
  const fresh = await db.from("seo_briefs").update({ title: "fresh" }).eq("id", activeId).eq("updated_at", activeUpdatedAt).select("id");
  ok(((fresh.data as unknown[] | null)?.length ?? 0) === 1, "update cu updated_at corect → 1 rând");

  // 6) Regenerate merge (engine): locked + confirmed preserved, suggested refreshed.
  const existing: BriefValues & { fieldProvenance: Record<string, Provenance> } = {
    title: "manual title", primaryKeyword: "rotiri gratuite fara depunere", secondaryKeywords: ["x"], intent: "commercial",
    targetUrl: "/confirmed", h1: "H1 manual", outline: draft.outline, entities: [], faq: [],
    fieldProvenance: { target_url: "confirmed", h1: "manual", title: "suggested" },
  };
  const merged = mergeBriefDraft(existing, draft, ["h1"]);
  ok(merged.values.targetUrl === "/confirmed" && merged.values.h1 === "H1 manual", "regenerare păstrează confirmed + locked");
  ok(merged.values.title === draft.title, "regenerare reîmprospătează câmpurile 'suggested'");

  // 7) RLS: anon blocked.
  if (ANON) {
    const anon = createClient(URL, ANON, { auth: { persistSession: false } }) as unknown as SupabaseClient;
    const r = await anon.from("seo_briefs").select("id").eq("id", activeId);
    ok(!!r.error || ((r.data as unknown[] | null)?.length ?? 0) === 0, "anon NU poate citi brief-ul (RLS/grant)");
    const w = await anon.from("seo_briefs").insert({ project_id: projectId, cluster_id: null, title: "anon" });
    ok(!!w.error, "anon NU poate insera brief (RLS/grant)");
  } else {
    console.log("  … (sar peste RLS anon — fără SUPABASE_ANON_KEY în mediu)");
  }

  // 8) Cleanup (cascade).
  await db.from("seo_projects").delete().eq("id", projectId);
  const resid = (await db.from("seo_projects").select("id", { count: "exact", head: true }).like("name", "zz-brief%")).count ?? 0;
  ok(resid === 0, "cleanup: 0 proiecte test reziduale");

  console.log(`\n== ${pass} PASS · ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
}
main().catch(async (e) => {
  if (projectId) { try { await db.from("seo_projects").delete().eq("id", projectId); } catch { /* best effort */ } }
  console.error("EROARE:", e.message);
  process.exit(1);
});
