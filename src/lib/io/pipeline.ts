/**
 * CSV import/export pipeline (dependency-injected Supabase client — no server-only
 * binding), so the SAME real code runs both from the Admin server actions and from
 * DEV test scripts. The server entry (@/lib/db/io) is a thin wrapper that injects
 * the authenticated client; nothing here reaches for request context.
 */

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCsvObjects } from "@/lib/io/csv";
import { toCsv } from "@/lib/bulk";
import {
  buildRows,
  lookupKeysFor,
  type RowResult,
  type SlugMaps,
  type ImportMode,
  type ExistingRecord,
} from "@/lib/io/validate";
import {
  ENTITY_DESCRIPTORS,
  csvColumns,
  LIST_SEP,
  type IoEntity,
  type LookupKey,
  type EntityDesc,
} from "@/lib/io/entities";
import { buildRowDiff, type RowDiff, type DiffCol, type DiffColKind } from "@/lib/io/diff";
import { planRowUpdate } from "@/lib/io/apply-row";

export type DB = SupabaseClient;

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

export function contentHash(entity: string, csvText: string, mode: ImportMode = "create"): string {
  return createHash("sha256").update(`${entity}\n${mode}\n${csvText}`).digest("hex");
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

export type ReportRow = RowResult & { diff: RowDiff | null };

export interface ImportReport {
  entity: IoEntity;
  mode: ImportMode;
  hash: string;
  total: number;
  valid: number;
  warning: number;
  errors: number;
  toCreate: number;
  toUpdate: number;
  toUnchanged: number;
  publishedChanges: number;
  rows: ReportRow[];
}

type PreparedRow = ReturnType<typeof buildRows>[number] & { diff: RowDiff | null };

/** Columns in the CSV header that the importer does NOT recognize for this entity.
 * The importer reads strictly by column name, so unknown columns would otherwise be
 * silently ignored (silent data loss). Dry-run/apply reject them explicitly. */
export function unknownColumns(desc: EntityDesc, headers: string[]): string[] {
  const allowed = new Set(csvColumns(desc));
  return headers.filter((h) => !allowed.has(h));
}
const fmtUnknown = (cols: string[]) => cols.map((c) => (c === "" ? "(coloană goală)" : c)).join(", ");

/** DiffCol specs for an entity (slug + scalar/list/url fields + fks + json). */
function diffCols(desc: EntityDesc): DiffCol[] {
  return [
    { col: "slug", db: "slug", kind: "scalar" },
    ...desc.fields.map((f) => ({
      col: f.col,
      db: f.db ?? f.col,
      kind: (f.type === "list" ? "list" : f.type === "url" ? "url" : "scalar") as DiffColKind,
    })),
    ...desc.fks.map((f) => ({ col: f.col, db: f.db, kind: "fk" as DiffColKind })),
    ...(desc.jsonFields ?? []).map((j) => ({ col: j.col, db: j.col, kind: "json" as DiffColKind })),
  ];
}

async function prepare(db: DB, entity: IoEntity, csvText: string, mode: ImportMode) {
  const desc = ENTITY_DESCRIPTORS[entity as Exclude<IoEntity, "affiliate_links">];
  const { rows } = parseCsvObjects(csvText);
  const maps = await loadSlugMaps(db, lookupKeysFor(desc));
  const { data: existing } = await db.from(desc.table).select("id, slug, status");
  const existingRecords = (existing as unknown as ExistingRecord[]) ?? [];
  const built = buildRows(desc, rows, maps, existingRecords, mode);

  // Field/relation diffs are only meaningful for upsert UPDATE rows.
  const updates = built.filter((b) => b.operation === "update" && b.level !== "error" && b.targetId);
  const diffByLine = new Map<number, RowDiff>();

  if (mode === "upsert" && updates.length) {
    const targetIds = updates.map((b) => b.targetId!) as string[];
    const statusById = new Map(existingRecords.map((e) => [e.id, e.status ?? null]));

    const scalarCols = [
      "id",
      "slug",
      "status",
      ...desc.fields.map((f) => f.db ?? f.col),
      ...desc.fks.map((f) => f.db),
      ...(desc.jsonFields ?? []).map((j) => j.col),
    ];
    const { data: fullRows } = await db
      .from(desc.table)
      .select([...new Set(scalarCols)].join(", "))
      .in("id", targetIds);
    const fullById = new Map<string, Record<string, unknown>>();
    for (const r of (fullRows as unknown as Record<string, unknown>[]) ?? []) fullById.set(r.id as string, r);

    // reverse lookup maps (id → slug) for fk + m2m rendering
    const rev = new Map<LookupKey, Map<string, string>>();
    for (const k of lookupKeysFor(desc)) {
      const { data } = await db.from(LOOKUP_TABLE[k]).select("id, slug");
      const m = new Map<string, string>();
      for (const r of (data as unknown as { id: string; slug: string }[]) ?? []) m.set(r.id, r.slug);
      rev.set(k, m);
    }

    // existing m2m slugs per column per target
    const existRel = new Map<string, Map<string, string[]>>();
    for (const m of desc.m2m) {
      const perTarget = new Map<string, string[]>();
      const { data } = await db.from(m.junction).select(`${m.selfCol}, ${m.otherCol}`).in(m.selfCol, targetIds);
      const rm = rev.get(m.lookup)!;
      for (const j of (data as unknown as Record<string, string>[]) ?? []) {
        const self = j[m.selfCol];
        const slug = rm.get(j[m.otherCol]);
        if (!slug) continue;
        if (!perTarget.has(self)) perTarget.set(self, []);
        perTarget.get(self)!.push(slug);
      }
      existRel.set(m.col, perTarget);
    }

    const cols = diffCols(desc);
    for (const b of updates) {
      const tid = b.targetId!;
      const before = fullById.get(tid) ?? {};
      const fkSlugs: Record<string, { before: string; after: string }> = {};
      for (const f of desc.fks) {
        const rm = rev.get(f.lookup)!;
        fkSlugs[f.col] = {
          before: rm.get(before[f.db] as string) ?? "",
          after: f.db in b.dbRow ? rm.get(b.dbRow[f.db] as string) ?? "" : "",
        };
      }
      const relations = b.relations.map((r) => {
        const rm = rev.get(desc.m2m.find((m) => m.col === r.col)!.lookup)!;
        return {
          col: r.col,
          before: existRel.get(r.col)?.get(tid) ?? [],
          after: r.ids.map((id) => rm.get(id) ?? id),
        };
      });
      diffByLine.set(
        b.line,
        buildRowDiff({ cols, patch: b.dbRow, before, fkSlugs, relations, targetStatus: statusById.get(tid) ?? null }),
      );
    }
  }

  const prepared: PreparedRow[] = built.map((b) => ({ ...b, diff: diffByLine.get(b.line) ?? null }));
  return { desc, built: prepared };
}

export async function dryRunImport(
  db: DB,
  entity: IoEntity,
  csvText: string,
  mode: ImportMode = "create",
): Promise<ImportReport | { error: string }> {
  const desc = ENTITY_DESCRIPTORS[entity as Exclude<IoEntity, "affiliate_links">];
  const { headers, rows } = parseCsvObjects(csvText);
  if (rows.length === 0) return { error: "Fișier gol sau fără rânduri de date." };
  if (rows.length > MAX_IMPORT_ROWS) return { error: `Prea multe rânduri (${rows.length} > ${MAX_IMPORT_ROWS}).` };
  const unknown = unknownColumns(desc, headers);
  if (unknown.length) {
    return {
      error: `Coloane nesuportate în CSV: ${fmtUnknown(unknown)}. Antete acceptate: ${csvColumns(desc).join(", ")}.`,
    };
  }

  const { built } = await prepare(db, entity, csvText, mode);
  const isUpdate = (b: PreparedRow) => b.level !== "error" && b.operation === "update";
  return {
    entity,
    mode,
    hash: contentHash(entity, csvText, mode),
    total: built.length,
    valid: built.filter((b) => b.level === "valid").length,
    warning: built.filter((b) => b.level === "warning").length,
    errors: built.filter((b) => b.level === "error").length,
    toCreate: built.filter((b) => b.level !== "error" && b.operation === "create").length,
    toUpdate: built.filter((b) => isUpdate(b) && b.diff?.hasChanges).length,
    toUnchanged: built.filter((b) => isUpdate(b) && !b.diff?.hasChanges).length,
    publishedChanges: built.filter((b) => b.diff?.publishedContentChange).length,
    rows: built.map(({ line, slug, level, messages, operation, diff }) => ({ line, slug, level, messages, operation, diff })),
  };
}

export interface ImportOutcome {
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  failed: number;
  rows: { line: number; slug: string; outcome: string }[];
}

export async function applyImport(
  db: DB,
  entity: IoEntity,
  csvText: string,
  expectedHash: string,
  mode: ImportMode = "create",
  confirmPublished = false,
): Promise<ImportOutcome | { error: string }> {
  if (contentHash(entity, csvText, mode) !== expectedHash) {
    return { error: "Conținutul nu corespunde celui validat în dry-run. Re-rulează verificarea." };
  }
  const descCheck = ENTITY_DESCRIPTORS[entity as Exclude<IoEntity, "affiliate_links">];
  const { headers, rows } = parseCsvObjects(csvText);
  if (rows.length > MAX_IMPORT_ROWS) return { error: `Prea multe rânduri (${rows.length} > ${MAX_IMPORT_ROWS}).` };
  const unknownApply = unknownColumns(descCheck, headers);
  if (unknownApply.length) return { error: `Coloane nesuportate în CSV: ${fmtUnknown(unknownApply)}.` };

  const { desc, built } = await prepare(db, entity, csvText, mode);

  // Guard: editing the content of currently-published records needs explicit
  // confirmation (recomputed against fresh DB state, not just the dry-run).
  const publishedCount = built.filter((b) => b.diff?.publishedContentChange).length;
  if (publishedCount > 0 && !confirmPublished) {
    return {
      error: `${publishedCount} înregistrare(i) publicată(e) ar fi modificate. Confirmă explicit modificarea conținutului publicat pentru a continua.`,
    };
  }

  const out: ImportOutcome = { created: 0, updated: 0, unchanged: 0, skipped: 0, failed: 0, rows: [] };

  for (const b of built) {
    if (b.level === "error") {
      out.skipped++;
      out.rows.push({ line: b.line, slug: b.slug, outcome: `sărit: ${b.messages.join("; ")}` });
      continue;
    }

    if (b.operation === "update" && b.targetId) {
      const plan = planRowUpdate(b);
      // No real change (blank cells / provided-same values) → never UPDATE.
      if (!plan) {
        out.unchanged++;
        out.rows.push({ line: b.line, slug: b.slug, outcome: "neschimbat" });
        continue;
      }
      // Atomic per-row apply: scalar patch + all changed relations run in ONE
      // transaction (import_apply_row, 0022). Any failure rolls the whole row back,
      // so a failed relation never leaves scalars or other relations half-applied.
      const { error } = await db.rpc("import_apply_row", {
        p_table: desc.table,
        p_id: b.targetId,
        p_patch: plan.patch,
        p_junctions: plan.junctions,
      });
      if (error) {
        out.failed++;
        out.rows.push({ line: b.line, slug: b.slug, outcome: `eșuat (rând anulat integral): ${error.message}` });
        continue;
      }
      out.updated++;
      out.rows.push({
        line: b.line,
        slug: b.slug,
        outcome: `actualizat${b.level === "warning" ? " · warning" : ""}`,
      });
      continue;
    }

    // Atomic create: INSERT row (status forced to draft) + all m2m relations in ONE
    // transaction (import_create_row, 0023). A failing relation rolls the whole row
    // back — no orphan row, no partial relations. status is never CSV-controlled.
    const row = { ...b.dbRow };
    delete row.status;
    const junctions = b.relations
      .filter((r) => r.ids.length)
      .map((r) => ({ table: r.junction, self_col: r.selfCol, other_col: r.otherCol, ids: r.ids }));
    const { error } = await db.rpc("import_create_row", {
      p_table: desc.table,
      p_row: row,
      p_junctions: junctions,
    });
    if (error) {
      out.failed++;
      out.rows.push({ line: b.line, slug: b.slug, outcome: `eșuat (rând anulat integral): ${error.message}` });
      continue;
    }
    out.created++;
    out.rows.push({
      line: b.line,
      slug: b.slug,
      outcome: `creat (draft)${b.level === "warning" ? " · warning" : ""}`,
    });
  }
  return out;
}

/* --------------------------------- export --------------------------------- */

export async function exportEntity(
  db: DB,
  entity: IoEntity,
  format: "csv" | "json",
  filters: { status?: string },
): Promise<string> {
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
    ...(desc.jsonFields ?? []).map((j) => j.col),
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
    const o: Record<string, unknown> = { id: r.id, slug: r.slug, status: r.status ?? "" };
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
    for (const jf of desc.jsonFields ?? []) {
      o[jf.col] = JSON.stringify(r[jf.col] ?? []); // CSV round-trip as JSON string
    }
    if (format === "json") {
      for (const j of desc.jsonExtra) if (j !== "status") o[j] = r[j] ?? null;
    }
    return o;
  });

  if (format === "json") return JSON.stringify(records, null, 2);
  const cols = csvColumns(desc);
  return toCsv(cols, records.map((rec) => cols.map((c) => rec[c] as string)));
}
