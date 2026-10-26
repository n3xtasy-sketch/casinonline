#!/usr/bin/env -S npx tsx
/**
 * READ-ONLY import dry-run preview — mirrors Admin → Import dry-run (same buildRows
 * validator + the entity's existing slugs/lookups fetched from the DB). NEVER writes.
 * Usage:
 *   set -a; . ./.env.production.local; set +a
 *   npx tsx scripts/import-dry-run.mts <entity> <csvPath> [create|upsert]
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseCsvObjects } from "@/lib/io/csv";
import { buildRows, lookupKeysFor, type ExistingRecord, type ImportMode } from "@/lib/io/validate";
import { ENTITY_DESCRIPTORS } from "@/lib/io/entities";
import { buildRowDiff, type DiffCol, type DiffColKind } from "@/lib/io/diff";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const entity = process.argv[2];
const csvPath = process.argv[3];
const mode: ImportMode = process.argv[4] === "upsert" ? "upsert" : "create";
if (!URL || !KEY) { console.error("Lipsește SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY."); process.exit(2); }
const desc = (ENTITY_DESCRIPTORS as Record<string, (typeof ENTITY_DESCRIPTORS)[keyof typeof ENTITY_DESCRIPTORS]>)[entity];
if (!desc || !csvPath) { console.error("Usage: import-dry-run.mts <entity> <csvPath>"); process.exit(2); }

async function rest(path: string): Promise<Record<string, string>[]> {
  const r = await fetch(`${URL}/rest/v1/${path}`, { headers: { apikey: KEY!, Authorization: `Bearer ${KEY!}` } });
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${await r.text()}`);
  return r.json();
}

const text = readFileSync(csvPath, "utf8");
const { rows } = parseCsvObjects(text);
const existing = (await rest(`${desc.table}?select=id,slug,status`)) as unknown as ExistingRecord[];
const maps = new Map<string, Map<string, string>>();
for (const k of lookupKeysFor(desc)) {
  const data = await rest(`${k}?select=id,slug`);
  maps.set(k, new Map(data.map((r) => [r.slug, r.id])));
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const built = buildRows(desc, rows, maps as any, existing, mode);
const hash = createHash("sha256").update(`${entity}\n${mode}\n${text}`).digest("hex");

// Field/relation diffs for upsert UPDATE rows (mirrors prepare() in io.ts, read-only).
const diffByLine = new Map<number, ReturnType<typeof buildRowDiff>>();
if (mode === "upsert") {
  const updates = built.filter((b) => b.operation === "update" && b.level !== "error" && b.targetId);
  if (updates.length) {
    const ids = updates.map((b) => b.targetId!);
    const idList = ids.map((x) => `"${x}"`).join(",");
    const statusById = new Map(existing.map((e) => [e.id, e.status ?? null]));
    const full = await rest(`${desc.table}?id=in.(${idList})`);
    const fullById = new Map(full.map((r) => [r.id as unknown as string, r as Record<string, unknown>]));
    const rev = new Map<string, Map<string, string>>();
    for (const k of lookupKeysFor(desc)) {
      const data = await rest(`${k}?select=id,slug`);
      rev.set(k, new Map(data.map((r) => [r.id, r.slug])));
    }
    const existRel = new Map<string, Map<string, string[]>>();
    for (const m of desc.m2m) {
      const perTarget = new Map<string, string[]>();
      const data = await rest(`${m.junction}?select=${m.selfCol},${m.otherCol}&${m.selfCol}=in.(${idList})`);
      const rm = rev.get(m.lookup)!;
      for (const j of data) {
        const self = j[m.selfCol] as unknown as string;
        const slug = rm.get(j[m.otherCol] as unknown as string);
        if (!slug) continue;
        if (!perTarget.has(self)) perTarget.set(self, []);
        perTarget.get(self)!.push(slug);
      }
      existRel.set(m.col, perTarget);
    }
    const cols: DiffCol[] = [
      { col: "slug", db: "slug", kind: "scalar" },
      ...desc.fields.map((f) => ({ col: f.col, db: f.db ?? f.col, kind: (f.type === "list" ? "list" : f.type === "url" ? "url" : "scalar") as DiffColKind })),
      ...desc.fks.map((f) => ({ col: f.col, db: f.db, kind: "fk" as DiffColKind })),
      ...(desc.jsonFields ?? []).map((j) => ({ col: j.col, db: j.col, kind: "json" as DiffColKind })),
    ];
    for (const b of updates) {
      const tid = b.targetId!;
      const before = fullById.get(tid) ?? {};
      const fkSlugs: Record<string, { before: string; after: string }> = {};
      for (const f of desc.fks) {
        const rm = rev.get(f.lookup)!;
        fkSlugs[f.col] = { before: rm.get(before[f.db] as string) ?? "", after: f.db in b.dbRow ? rm.get(b.dbRow[f.db] as string) ?? "" : "" };
      }
      const relations = b.relations.map((r) => {
        const rm = rev.get(desc.m2m.find((m) => m.col === r.col)!.lookup)!;
        return { col: r.col, before: existRel.get(r.col)?.get(tid) ?? [], after: r.ids.map((id) => rm.get(id) ?? id) };
      });
      diffByLine.set(b.line, buildRowDiff({ cols, patch: b.dbRow, before, fkSlugs, relations, targetStatus: statusById.get(tid) ?? null }));
    }
  }
}

const n = (lvl: string) => built.filter((b) => b.level === lvl).length;
const cat = (b: (typeof built)[number]) => {
  if (b.level === "error") return "SKIP";
  if (b.operation === "create") return "NEW";
  return diffByLine.get(b.line)?.hasChanges ? "UPD" : "NOCHG";
};
const catCount = (c: string) => built.filter((b) => cat(b) === c).length;
const pubCount = [...diffByLine.values()].filter((d) => d.publishedContentChange).length;
console.log(`== DRY RUN (read-only) · ${entity} · ${mode} · ${csvPath} ==`);
console.log(`${built.length} rânduri | ${n("valid")} valide · ${n("warning")} warning · ${n("error")} erori`);
console.log(`→ ${catCount("NEW")} de creat · ${catCount("UPD")} de actualizat · ${catCount("NOCHG")} neschimbate · ${catCount("SKIP")} sărite`);
console.log(`⚠ ${pubCount} modificare(i) de conținut la înregistrări PUBLICATE (cer confirmare la apply)`);
console.log(`hash: ${hash.slice(0, 16)}…`);
for (const b of built) {
  const dot = b.level === "error" ? "🔴" : b.level === "warning" ? "🟡" : "🟢";
  const tag = cat(b);
  console.log(`  ${dot} [${tag}] linia ${b.line} · ${b.slug || "—"} · ${b.messages.join("; ") || "ok"}`);
  const d = diffByLine.get(b.line);
  if (d?.hasChanges) {
    for (const f of d.fields) console.log(`        ~ ${f.col}: ${f.cleared ? "GOLIT (__CLEAR__)" : `${f.before || "∅"} → ${f.after || "∅"}`}${f.sensitive ? " [mascat]" : ""}`);
    for (const rel of d.relations) console.log(`        ~ ${rel.col}: ${rel.added.length ? "+" + rel.added.join(",") : ""} ${rel.removed.length ? "−" + rel.removed.join(",") : ""}`.trimEnd());
  }
}
console.log("\n(DRY RUN — nimic scris. Confirmarea importului se face în Admin → Import.)");
