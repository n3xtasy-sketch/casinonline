import "server-only";
import { createHash } from "node:crypto";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { parseCsvObjects } from "@/lib/io/csv";
import { toCsv } from "@/lib/bulk";
import { buildRows, lookupKeysFor, type RowResult, type SlugMaps } from "@/lib/io/validate";
import {
  ENTITY_DESCRIPTORS,
  csvColumns,
  LIST_SEP,
  type IoEntity,
  type LookupKey,
} from "@/lib/io/entities";

type DB = Awaited<ReturnType<typeof getSupabaseAuthClient>>;

export const MAX_IMPORT_ROWS = 1000;
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

const LOOKUP_TABLE: Record<LookupKey, string> = {
  providers: "providers",
  game_categories: "game_categories",
  casinos: "casinos",
  bonus_types: "bonus_types",
  payment_types: "payment_types",
  guide_categories: "guide_categories",
  tags: "tags",
  games: "games",
  payment_methods: "payment_methods",
};

export function contentHash(entity: string, csvText: string): string {
  return createHash("sha256").update(`${entity}\n${csvText}`).digest("hex");
}

async function loadSlugMaps(db: DB, keys: LookupKey[]): Promise<SlugMaps> {
  const maps: SlugMaps = new Map();
  for (const k of keys) {
    const { data } = await db.from(LOOKUP_TABLE[k]).select("id, slug");
    const m = new Map<string, string>();
    for (const r of (data as unknown as { id: string; slug: string }[]) ?? []) m.set(r.slug, r.id);
    maps.set(k, m);
  }
  return maps;
}

export interface ImportReport {
  entity: IoEntity;
  hash: string;
  total: number;
  valid: number;
  warning: number;
  errors: number;
  rows: RowResult[];
}

async function prepare(entity: IoEntity, csvText: string) {
  const desc = ENTITY_DESCRIPTORS[entity as Exclude<IoEntity, "affiliate_links">];
  const db = await getSupabaseAuthClient();
  const { rows } = parseCsvObjects(csvText);
  const maps = await loadSlugMaps(db, lookupKeysFor(desc));
  const { data: existing } = await db.from(desc.table).select("slug");
  const existingSlugs = new Set(((existing as unknown as { slug: string }[]) ?? []).map((r) => r.slug));
  const built = buildRows(desc, rows, maps, existingSlugs);
  return { db, desc, built };
}

export async function dryRunImport(
  entity: IoEntity,
  csvText: string,
): Promise<ImportReport | { error: string }> {
  const { rows } = parseCsvObjects(csvText);
  if (rows.length === 0) return { error: "Fișier gol sau fără rânduri de date." };
  if (rows.length > MAX_IMPORT_ROWS) return { error: `Prea multe rânduri (${rows.length} > ${MAX_IMPORT_ROWS}).` };

  const { built } = await prepare(entity, csvText);
  return {
    entity,
    hash: contentHash(entity, csvText),
    total: built.length,
    valid: built.filter((b) => b.level === "valid").length,
    warning: built.filter((b) => b.level === "warning").length,
    errors: built.filter((b) => b.level === "error").length,
    rows: built.map(({ line, slug, level, messages }) => ({ line, slug, level, messages })),
  };
}

export interface ImportOutcome {
  created: number;
  skipped: number;
  failed: number;
  rows: { line: number; slug: string; outcome: string }[];
}

export async function applyImport(
  entity: IoEntity,
  csvText: string,
  expectedHash: string,
): Promise<ImportOutcome | { error: string }> {
  if (contentHash(entity, csvText) !== expectedHash) {
    return { error: "Conținutul nu corespunde celui validat în dry-run. Re-rulează verificarea." };
  }
  const { rows } = parseCsvObjects(csvText);
  if (rows.length > MAX_IMPORT_ROWS) return { error: `Prea multe rânduri (${rows.length} > ${MAX_IMPORT_ROWS}).` };

  const { db, desc, built } = await prepare(entity, csvText);
  const out: ImportOutcome = { created: 0, skipped: 0, failed: 0, rows: [] };

  for (const b of built) {
    if (b.level === "error") {
      out.skipped++;
      out.rows.push({ line: b.line, slug: b.slug, outcome: `sărit: ${b.messages.join("; ")}` });
      continue;
    }
    const { data: ins, error } = await db.from(desc.table).insert(b.dbRow).select("id").single();
    if (error || !ins) {
      out.failed++;
      out.rows.push({ line: b.line, slug: b.slug, outcome: `eșuat: ${error?.message ?? "insert"}` });
      continue;
    }
    const id = (ins as { id: string }).id;
    let relMsg = "";
    for (const r of b.relations) {
      if (!r.ids.length) continue;
      const { error: relErr } = await db
        .from(r.junction)
        .insert(r.ids.map((otherId) => ({ [r.selfCol]: id, [r.otherCol]: otherId })));
      if (relErr) relMsg = ` (relații parțiale: ${relErr.message})`;
    }
    out.created++;
    out.rows.push({
      line: b.line,
      slug: b.slug,
      outcome: `creat (draft)${b.level === "warning" ? " · warning" : ""}${relMsg}`,
    });
  }
  return out;
}

/* --------------------------------- export --------------------------------- */

export async function exportEntity(
  entity: IoEntity,
  format: "csv" | "json",
  filters: { status?: string },
): Promise<string> {
  const db = await getSupabaseAuthClient();

  if (entity === "affiliate_links") {
    const { data } = await db
      .from("affiliate_links")
      .select("placement, url, campaign, is_active, casino:casinos(slug)")
      .order("placement");
    const rows = ((data as unknown as {
      placement: string; url: string; campaign: string | null; is_active: boolean;
      casino: { slug?: string } | null;
    }[]) ?? []).map((r) => ({
      casino_slug: r.casino?.slug ?? "", placement: r.placement, url: r.url,
      campaign: r.campaign ?? "", is_active: r.is_active,
    }));
    if (format === "json") return JSON.stringify(rows, null, 2);
    const cols = ["casino_slug", "placement", "url", "campaign", "is_active"];
    return toCsv(cols, rows.map((r) => cols.map((c) => (r as Record<string, unknown>)[c] as string)));
  }

  const desc = ENTITY_DESCRIPTORS[entity as Exclude<IoEntity, "affiliate_links">];

  const rev = new Map<LookupKey, Map<string, string>>();
  for (const k of lookupKeysFor(desc)) {
    const { data } = await db.from(LOOKUP_TABLE[k]).select("id, slug");
    const m = new Map<string, string>();
    for (const r of (data as unknown as { id: string; slug: string }[]) ?? []) m.set(r.id, r.slug);
    rev.set(k, m);
  }

  const scalarCols = [
    "id",
    "slug",
    "status",
    ...desc.fields.map((f) => f.db ?? f.col),
    ...desc.fks.map((f) => f.db),
    ...desc.jsonExtra.filter((j) => j !== "status"),
  ];
  let q = db.from(desc.table).select([...new Set(scalarCols)].join(", ")).order("slug");
  if (filters.status === "draft" || filters.status === "published" || filters.status === "archived") {
    q = q.eq("status", filters.status);
  }
  const { data: rowsRaw, error } = await q;
  if (error) throw new Error(`export ${entity}: ${error.message}`);
  const entityRows = (rowsRaw as unknown as Record<string, unknown>[]) ?? [];
  const ids = entityRows.map((r) => r.id as string);

  const m2mMap = new Map<string, Map<string, string[]>>();
  for (const m of desc.m2m) {
    const perEntity = new Map<string, string[]>();
    if (ids.length) {
      const { data } = await db.from(m.junction).select(`${m.selfCol}, ${m.otherCol}`).in(m.selfCol, ids);
      const revMap = rev.get(m.lookup)!;
      for (const j of (data as unknown as Record<string, string>[]) ?? []) {
        const self = j[m.selfCol];
        const slug = revMap.get(j[m.otherCol]);
        if (!slug) continue;
        if (!perEntity.has(self)) perEntity.set(self, []);
        perEntity.get(self)!.push(slug);
      }
    }
    m2mMap.set(m.col, perEntity);
  }

  const records = entityRows.map((r) => {
    const o: Record<string, unknown> = { slug: r.slug };
    for (const f of desc.fields) {
      const dbc = f.db ?? f.col;
      const v = r[dbc];
      o[f.col] = f.type === "list" ? ((v as string[] | null) ?? []).join(LIST_SEP) : v ?? "";
    }
    for (const fk of desc.fks) {
      o[fk.col] = rev.get(fk.lookup)!.get(r[fk.db] as string) ?? "";
    }
    for (const m of desc.m2m) {
      o[m.col] = (m2mMap.get(m.col)!.get(r.id as string) ?? []).join(LIST_SEP);
    }
    if (format === "json") {
      o.status = r.status;
      for (const j of desc.jsonExtra) if (j !== "status") o[j] = r[j] ?? null;
    }
    return o;
  });

  if (format === "json") return JSON.stringify(records, null, 2);
  const cols = csvColumns(desc);
  return toCsv(cols, records.map((rec) => cols.map((c) => rec[c] as string)));
}
