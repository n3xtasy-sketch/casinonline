#!/usr/bin/env -S npx tsx
/**
 * END-TO-END CSV UPSERT test — DEV ONLY. Drives the REAL importer pipeline
 * (@/lib/io/pipeline: exportEntity / dryRunImport / applyImport) against DEV via a
 * service_role client. Creates only clearly-marked throwaway casinos (slug zz-e2e-*),
 * never touches real rows, and cleans up in finally with a post-cleanup check.
 * Usage:
 *   set -a; . ./.env.local; set +a
 *   npx tsx scripts/dev-csv-e2e-test.mts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { exportEntity, dryRunImport, applyImport } from "@/lib/io/pipeline";
import { parseCsvObjects } from "@/lib/io/csv";
import { toCsv } from "@/lib/bulk";
import { csvColumns, ENTITY_DESCRIPTORS } from "@/lib/io/entities";

const URL = process.env.SUPABASE_URL!;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !SVC) { console.error("Lipsește SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (.env.local)."); process.exit(2); }
if (URL.includes("rmnltqmmemqfgvjglzqa")) { console.error("REFUZ: URL de PRODUCȚIE. Rulează doar pe DEV."); process.exit(2); }

const db = createClient(URL, SVC, { auth: { persistSession: false } }) as unknown as SupabaseClient;
const H = csvColumns(ENTITY_DESCRIPTORS.casinos);
const blank = () => Object.fromEntries(H.map((c) => [c, ""])) as Record<string, string>;
const PFX = "zz-e2e-";

let pass = 0, fail = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "✅" : "❌"} ${name}${detail ? " · " + detail : ""}`);
  if (ok) pass++; else fail++;
}
const err = (r: unknown): r is { error: string } => typeof r === "object" && r !== null && "error" in r;
async function md(slug: string) {
  const { data } = await db.from("casinos").select("min_deposit,payout_speed,status").eq("slug", slug).maybeSingle();
  return data as { min_deposit: string | null; payout_speed: string | null; status: string } | null;
}
async function tagsOf(slug: string) {
  const { data } = await db.from("casinos").select("id").eq("slug", slug).maybeSingle();
  const id = (data as { id: string } | null)?.id;
  if (!id) return [];
  const { data: t } = await db.from("casino_tags").select("tag:tags(slug)").eq("casino_id", id);
  return ((t as unknown as { tag: { slug: string } }[]) ?? []).map((x) => x.tag?.slug);
}
async function cleanup() {
  const { data } = await db.from("casinos").select("id").like("slug", `${PFX}%`);
  const ids = ((data as { id: string }[]) ?? []).map((r) => r.id);
  if (ids.length) {
    await db.from("casino_tags").delete().in("casino_id", ids);
    await db.from("casinos").delete().in("id", ids);
  }
  return ids.length;
}

async function main() {
  console.log(`== DEV CSV E2E · ${URL.replace(/https:\/\/([a-z0-9]+).*/, "$1")} ==`);
  await cleanup(); // leftovers from a previous run

  const { data: tagRow } = await db.from("tags").select("slug").limit(1).maybeSingle();
  const TAG = (tagRow as { slug: string } | null)?.slug;
  if (!TAG) { console.error("Nu există tag-uri în DEV."); process.exit(3); }

  // Fixtures: alpha PUBLISHED (to exercise the published-content gate), beta DRAFT.
  const ins = await db.from("casinos").insert([
    { slug: `${PFX}alpha`, name: "E2E Alpha", status: "published", min_deposit: "ALPHA-OLD", payout_speed: "24h", offer_url: `/go/${PFX}alpha` },
    { slug: `${PFX}beta`, name: "E2E Beta", status: "draft", min_deposit: "BETA", offer_url: `/go/${PFX}beta` },
  ]).select("slug");
  if (ins.error || !ins.data) { console.error("Insert fixtures eșuat:", ins.error?.message ?? "fără date"); process.exit(3); }
  console.log(`  (fixtures create: ${PFX}alpha [published], ${PFX}beta [draft])`);

  try {
    // 1) EXPORT real (read-only) → trebuie să conțină id,slug,...,status + rândurile de test
    const csv = await exportEntity(db, "casinos", "csv", {});
    const parsed = parseCsvObjects(csv);
    check("export: header are id+slug+status", parsed.headers[0] === "id" && parsed.headers.includes("slug") && parsed.headers.includes("status"));
    const alpha0 = parsed.rows.find((r) => r.slug === `${PFX}alpha`);
    const beta0 = parsed.rows.find((r) => r.slug === `${PFX}beta`);
    check("export: conține rândurile de test", !!alpha0 && !!beta0);
    if (!alpha0 || !beta0) throw new Error("export fără rândurile de test");

    // 2) Modificare controlată: alpha scalar+CLEAR+relație; beta neschimbat; gamma nou; invalid (name gol)
    const alpha = { ...alpha0, min_deposit: "ALPHA-NEW", payout_speed: "__CLEAR__", tag_slugs: TAG };
    const beta = { ...beta0 };
    const gamma = { ...blank(), slug: `${PFX}gamma`, name: "E2E Gamma", status: "draft", tag_slugs: TAG };
    const invalid = { ...blank(), slug: `${PFX}invalid`, name: "" }; // obligatoriu lipsă → eroare
    const workRows: Record<string, string>[] = [alpha, beta, gamma, invalid];
    const work = toCsv(H, workRows.map((o) => H.map((c) => o[c] ?? "")));

    // 3) DRY-RUN CREATE → slug-urile existente dau eroare create-only
    const dCreate = await dryRunImport(db, "casinos", work, "create");
    if (err(dCreate)) throw new Error("dryRun create a dat error global");
    const aCreate = dCreate.rows.find((r) => r.slug === `${PFX}alpha`);
    check("dry-run CREATE: slug existent respins (create-only)", !!aCreate && aCreate.level === "error" && aCreate.messages.join().includes("există deja"));

    // 4) DRY-RUN UPSERT → diff corect pe categorii
    const d = await dryRunImport(db, "casinos", work, "upsert");
    if (err(d)) throw new Error("dryRun upsert a dat error global");
    const rep = d as Exclude<typeof d, { error: string }>;
    check("dry-run UPSERT: 1 create (gamma)", rep.toCreate === 1, `toCreate=${rep.toCreate}`);
    check("dry-run UPSERT: 1 update (alpha)", rep.toUpdate === 1, `toUpdate=${rep.toUpdate}`);
    check("dry-run UPSERT: 1 unchanged (beta)", rep.toUnchanged === 1, `toUnchanged=${rep.toUnchanged}`);
    check("dry-run UPSERT: 1 eroare (invalid)", rep.errors === 1, `errors=${rep.errors}`);
    check("dry-run UPSERT: 1 schimbare la publicat (alpha)", rep.publishedChanges === 1, `published=${rep.publishedChanges}`);
    const aDiff = rep.rows.find((r) => r.slug === `${PFX}alpha`)?.diff;
    check("dry-run UPSERT: alpha are CLEAR pe payout_speed", !!aDiff?.fields.find((f) => f.col === "payout_speed" && f.cleared));
    check("dry-run UPSERT: alpha adaugă relația tag", !!aDiff?.relations.find((x) => x.col === "tag_slugs" && x.added.includes(TAG)));

    // 5) Dry-run nu scrie nimic
    check("dry-run nu a scris nimic (alpha încă ALPHA-OLD)", (await md(`${PFX}alpha`))?.min_deposit === "ALPHA-OLD");

    // 6) SHA-256: CSV diferit de cel previzualizat e respins
    const shaBad = await applyImport(db, "casinos", work + "\n", rep.hash, "upsert", true);
    check("SHA-256 blochează un CSV modificat", err(shaBad) && (shaBad as { error: string }).error.includes("nu corespunde"));

    // 7) Apply FĂRĂ confirmare publicat → respins, nimic schimbat
    const noConfirm = await applyImport(db, "casinos", work, rep.hash, "upsert", false);
    check("apply fără confirmare publicat → respins", err(noConfirm) && (noConfirm as { error: string }).error.includes("publicat"));
    check("apply respins → alpha neschimbat", (await md(`${PFX}alpha`))?.min_deposit === "ALPHA-OLD");

    // 8) Apply CU confirmare → create+update+unchanged+skip raportate corect (izolare rând)
    const applied = await applyImport(db, "casinos", work, rep.hash, "upsert", true);
    if (err(applied)) throw new Error("apply a dat error global: " + (applied as { error: string }).error);
    const o = applied as Exclude<typeof applied, { error: string }>;
    check("apply: 1 creat", o.created === 1, `created=${o.created}`);
    check("apply: 1 actualizat", o.updated === 1, `updated=${o.updated}`);
    check("apply: 1 neschimbat", o.unchanged === 1, `unchanged=${o.unchanged}`);
    check("apply: 1 sărit (rândul invalid)", o.skipped === 1, `skipped=${o.skipped}`);
    check("apply: 0 eșuate", o.failed === 0, `failed=${o.failed}`);

    // 9) Valorile salvate
    const a = await md(`${PFX}alpha`);
    check("salvat: alpha.min_deposit = ALPHA-NEW", a?.min_deposit === "ALPHA-NEW");
    check("salvat: alpha.payout_speed CLEAR → NULL", a?.payout_speed === null);
    check("salvat: alpha.status rămâne published (status read-only)", a?.status === "published");
    check("salvat: relația m2m tag aplicată", (await tagsOf(`${PFX}alpha`)).includes(TAG));
    check("salvat: beta neschimbat (BETA)", (await md(`${PFX}beta`))?.min_deposit === "BETA");
    check("salvat: gamma creat ca draft", (await md(`${PFX}gamma`))?.status === "draft");
    check("salvat: gamma CREATE cu relație (tag aplicat atomic)", (await tagsOf(`${PFX}gamma`)).includes(TAG));
    check("salvat: rândul invalid NU a fost creat", (await md(`${PFX}invalid`)) === null);

    // 10) Reimport același CSV → totul UNCHANGED (fără invalid)
    const d2 = await dryRunImport(db, "casinos", work, "upsert");
    if (err(d2)) throw new Error("reimport dry-run error");
    const rep2 = d2 as Exclude<typeof d2, { error: string }>;
    check("reimport: 0 de actualizat", rep2.toUpdate === 0, `toUpdate=${rep2.toUpdate}`);
    check("reimport: 3 neschimbate (alpha,beta,gamma)", rep2.toUnchanged === 3, `toUnchanged=${rep2.toUnchanged}`);
    check("reimport: hash stabil (același CSV)", rep2.hash === rep.hash);
  } finally {
    const n = await cleanup();
    const { data: left } = await db.from("casinos").select("slug").like("slug", `${PFX}%`);
    const remaining = ((left as { slug: string }[]) ?? []).length;
    console.log(`  (cleanup: ${n} rânduri șterse · reziduale: ${remaining})`);
    if (remaining > 0) { console.error("❌ DATE REZIDUALE rămase!"); fail++; }
  }

  console.log(`\n== ${pass} PASS · ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
