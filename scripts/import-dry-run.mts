#!/usr/bin/env -S npx tsx
/**
 * READ-ONLY import dry-run preview — mirrors Admin → Import dry-run (same buildRows
 * validator + the entity's existing slugs/lookups fetched from the DB). NEVER writes.
 * Usage:
 *   set -a; . ./.env.production.local; set +a
 *   npx tsx scripts/import-dry-run.mts <entity> <csvPath>
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parseCsvObjects } from "@/lib/io/csv";
import { buildRows, lookupKeysFor } from "@/lib/io/validate";
import { ENTITY_DESCRIPTORS } from "@/lib/io/entities";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const entity = process.argv[2];
const csvPath = process.argv[3];
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
const existing = new Set((await rest(`${desc.table}?select=slug`)).map((r) => r.slug));
const maps = new Map<string, Map<string, string>>();
for (const k of lookupKeysFor(desc)) {
  const data = await rest(`${k}?select=id,slug`);
  maps.set(k, new Map(data.map((r) => [r.slug, r.id])));
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const built = buildRows(desc, rows, maps as any, existing);
const hash = createHash("sha256").update(`${entity}\n${text}`).digest("hex");

const n = (lvl: string) => built.filter((b) => b.level === lvl).length;
console.log(`== DRY RUN (read-only) · ${entity} · ${csvPath} ==`);
console.log(`${built.length} rânduri | ${n("valid")} valide · ${n("warning")} warning · ${n("error")} erori`);
console.log(`hash: ${hash.slice(0, 16)}…`);
for (const b of built) {
  const dot = b.level === "error" ? "🔴" : b.level === "warning" ? "🟡" : "🟢";
  console.log(`  ${dot} linia ${b.line} · ${b.slug || "—"} · ${b.messages.join("; ") || "ok"}`);
}
console.log("\n(DRY RUN — nimic scris. Confirmarea importului se face în Admin → Import.)");
