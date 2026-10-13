/** Pure CSV-row validation + mapping for import (no server deps — unit-testable). */

import { LIST_SEP, type EntityDesc, type LookupKey } from "@/lib/io/entities";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type RowLevel = "valid" | "warning" | "error";

export interface RowResult {
  line: number;
  slug: string;
  level: RowLevel;
  messages: string[];
}

export interface BuiltRow extends RowResult {
  dbRow: Record<string, unknown>;
  relations: { junction: string; selfCol: string; otherCol: string; ids: string[] }[];
}

export type SlugMaps = Map<LookupKey, Map<string, string>>;

function num(v: string, int: boolean): number | null | "err" {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return "err";
  return int ? Math.trunc(n) : n;
}

export function lookupKeysFor(desc: EntityDesc): LookupKey[] {
  const keys = new Set<LookupKey>();
  desc.fks.forEach((f) => keys.add(f.lookup));
  desc.m2m.forEach((m) => keys.add(m.lookup));
  return [...keys];
}

export function buildRows(
  desc: EntityDesc,
  rows: Record<string, string>[],
  slugToId: SlugMaps,
  existingSlugs: Set<string>,
): BuiltRow[] {
  const seen = new Set<string>();
  return rows.map((row, i) => {
    const line = i + 2; // header is line 1
    const messages: string[] = [];
    let level: RowLevel = "valid";
    const err = (m: string) => {
      messages.push(m);
      level = "error";
    };
    const warn = (m: string) => {
      messages.push(m);
      if (level !== "error") level = "warning";
    };

    const slug = (row.slug ?? "").trim().toLowerCase();
    const dbRow: Record<string, unknown> = { status: "draft" };

    if (!slug) err("slug lipsă");
    else if (!SLUG_RE.test(slug)) err("slug invalid (doar litere mici, cifre, cratime)");
    else if (seen.has(slug)) err("slug duplicat în fișier");
    else if (existingSlugs.has(slug)) err("slug există deja (create-only)");
    if (slug) seen.add(slug);
    dbRow.slug = slug;

    for (const f of desc.fields) {
      const raw = (row[f.col] ?? "").trim();
      const dbc = f.db ?? f.col;
      if (f.required && !raw) {
        err(`${f.col} lipsă (obligatoriu)`);
        continue;
      }
      if (!raw) {
        dbRow[dbc] = f.type === "list" ? [] : null;
        continue;
      }
      if (f.type === "int" || f.type === "float") {
        const n = num(raw, f.type === "int");
        if (n === "err") err(`${f.col} nu e număr valid`);
        else dbRow[dbc] = n;
      } else if (f.type === "url") {
        if (!/^https?:\/\/\S+$/.test(raw)) err(`${f.col} nu e URL valid (http(s)://)`);
        else dbRow[dbc] = raw;
      } else if (f.type === "list") {
        dbRow[dbc] = raw.split(LIST_SEP).map((x) => x.trim()).filter(Boolean);
      } else {
        dbRow[dbc] = raw;
      }
    }

    for (const fk of desc.fks) {
      const raw = (row[fk.col] ?? "").trim().toLowerCase();
      if (!raw) {
        if (fk.required) err(`${fk.col} lipsă (obligatoriu)`);
        else dbRow[fk.db] = null;
        continue;
      }
      const id = slugToId.get(fk.lookup)?.get(raw);
      if (!id) err(`${fk.col}: slug „${raw}" inexistent`);
      else dbRow[fk.db] = id;
    }

    const relations: BuiltRow["relations"] = [];
    for (const m of desc.m2m) {
      const raw = (row[m.col] ?? "").trim();
      if (!raw) continue;
      const slugs = raw.split(LIST_SEP).map((x) => x.trim().toLowerCase()).filter(Boolean);
      const ids: string[] = [];
      for (const sg of slugs) {
        const id = slugToId.get(m.lookup)?.get(sg);
        if (!id) warn(`${m.col}: „${sg}" inexistent (relație omisă)`);
        else ids.push(id);
      }
      relations.push({ junction: m.junction, selfCol: m.selfCol, otherCol: m.otherCol, ids });
    }

    if (desc.key === "casinos") dbRow.offer_url = `/go/${slug}`;
    if (desc.key === "bonuses") {
      const cslug = (row.casino_slug ?? "").trim().toLowerCase();
      dbRow.claim_url = cslug ? `/go/${cslug}` : null;
    }

    return { line, slug, level, messages, dbRow, relations };
  });
}
