/**
 * Pure field/relation diffing for the import dry-run preview (no server deps).
 * Change detection runs on RAW values; sensitive values (URLs) are masked for
 * display so the full value never leaves the server.
 */

import { LIST_SEP } from "@/lib/io/entities";

export type DiffColKind = "scalar" | "list" | "url" | "fk" | "json";

export interface DiffCol {
  col: string; // CSV column name (what the admin sees)
  db: string; // DB column (key into patch/before)
  kind: DiffColKind;
}

export interface FieldChange {
  col: string;
  before: string; // display (masked if sensitive)
  after: string; // display (masked if sensitive)
  cleared: boolean; // intentional clear via __CLEAR__ (raw new value is empty)
  sensitive: boolean; // value was masked
}

export interface RelChange {
  col: string;
  added: string[];
  removed: string[];
}

export interface RowDiff {
  fields: FieldChange[];
  relations: RelChange[];
  /** editing a currently-published record's content → needs extra confirmation. */
  publishedContentChange: boolean;
  hasChanges: boolean;
}

export interface BuildRowDiffInput {
  cols: DiffCol[];
  /** db-col → provided new value; a key being present means the column was supplied. */
  patch: Record<string, unknown>;
  /** db-col → existing value. */
  before: Record<string, unknown>;
  /** for fk cols: resolved slug display for before/after, keyed by CSV col. */
  fkSlugs?: Record<string, { before: string; after: string }>;
  /** m2m changes as resolved slug lists. */
  relations: { col: string; before: string[]; after: string[] }[];
  targetStatus: string | null;
}

/** Mask a URL to scheme+host so the full affiliate/tracking path is never shown. */
export function maskUrl(value: string): string {
  if (!value) return "";
  try {
    const u = new URL(value);
    return `${u.protocol}//${u.host}/…`;
  } catch {
    return "•••";
  }
}

function renderScalar(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}
function renderList(v: unknown): string {
  if (Array.isArray(v)) return (v as unknown[]).map(String).join(LIST_SEP);
  return v == null ? "" : String(v);
}

export function buildRowDiff(input: BuildRowDiffInput): RowDiff {
  const fields: FieldChange[] = [];

  for (const c of input.cols) {
    if (!(c.db in input.patch)) continue; // column not supplied → unchanged by definition

    let cmpBefore: string;
    let cmpAfter: string;
    let dispBefore: string;
    let dispAfter: string;
    let sensitive = false;

    if (c.kind === "fk") {
      const r = input.fkSlugs?.[c.col] ?? { before: "", after: "" };
      cmpBefore = dispBefore = r.before;
      cmpAfter = dispAfter = r.after;
    } else if (c.kind === "list") {
      cmpBefore = dispBefore = renderList(input.before[c.db]);
      cmpAfter = dispAfter = renderList(input.patch[c.db]);
    } else if (c.kind === "json") {
      // compare by content, display as element count
      cmpBefore = JSON.stringify(input.before[c.db] ?? []);
      cmpAfter = JSON.stringify(input.patch[c.db] ?? []);
      const bn = Array.isArray(input.before[c.db]) ? (input.before[c.db] as unknown[]).length : 0;
      const an = Array.isArray(input.patch[c.db]) ? (input.patch[c.db] as unknown[]).length : 0;
      dispBefore = bn ? `${bn} element(e)` : "";
      dispAfter = an ? `${an} element(e)` : "";
    } else if (c.kind === "url") {
      sensitive = true;
      cmpBefore = renderScalar(input.before[c.db]);
      cmpAfter = renderScalar(input.patch[c.db]);
      dispBefore = maskUrl(cmpBefore);
      dispAfter = maskUrl(cmpAfter);
    } else {
      cmpBefore = dispBefore = renderScalar(input.before[c.db]);
      cmpAfter = dispAfter = renderScalar(input.patch[c.db]);
    }

    if (cmpBefore === cmpAfter) continue; // provided the same value → not a change
    fields.push({ col: c.col, before: dispBefore, after: dispAfter, cleared: cmpAfter === "", sensitive });
  }

  const relations: RelChange[] = [];
  for (const r of input.relations) {
    const beforeSet = new Set(r.before);
    const afterSet = new Set(r.after);
    const added = r.after.filter((x) => !beforeSet.has(x));
    const removed = r.before.filter((x) => !afterSet.has(x));
    if (added.length || removed.length) relations.push({ col: r.col, added, removed });
  }

  const hasChanges = fields.length > 0 || relations.length > 0;
  const publishedContentChange = hasChanges && input.targetStatus === "published";
  return { fields, relations, publishedContentChange, hasChanges };
}
