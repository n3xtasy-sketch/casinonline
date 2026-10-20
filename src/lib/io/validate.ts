/** Pure CSV-row validation + mapping for import (no server deps — unit-testable). */

import { LIST_SEP, type EntityDesc, type JsonFieldDef, type LookupKey } from "@/lib/io/entities";
import { slugify, isSafeInternalPath } from "@/lib/guide-format";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isText = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

/**
 * Validate a parsed JSON value against the shape expected for a jsonb column.
 * Returns the normalized value, or an error message (null = ok). Strict: wrong
 * shape / unsafe internal links / bad levels are rejected with a clear message.
 */
function validateJsonField(
  kind: JsonFieldDef["kind"],
  parsed: unknown,
): { value: unknown; error: string | null } {
  if (!Array.isArray(parsed)) return { value: null, error: "trebuie să fie o listă JSON ([...])" };
  const items = parsed as Record<string, unknown>[];

  if (kind === "faq") {
    const out: { question: string; answer: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      const o = items[i];
      if (!o || typeof o !== "object" || !isText(o.question) || !isText(o.answer))
        return { value: null, error: `elementul ${i + 1} are nevoie de "question" și "answer" (text)` };
      out.push({ question: o.question.trim(), answer: o.answer.trim() });
    }
    return { value: out, error: null };
  }

  if (kind === "related_links") {
    const out: { label: string; href: string }[] = [];
    const bad: string[] = [];
    for (let i = 0; i < items.length; i++) {
      const o = items[i];
      if (!o || typeof o !== "object" || !isText(o.label) || !isText(o.href))
        return { value: null, error: `elementul ${i + 1} are nevoie de "label" și "href" (text)` };
      if (!isSafeInternalPath(o.href)) { bad.push(o.href); continue; }
      out.push({ label: o.label.trim(), href: o.href.trim() });
    }
    if (bad.length) return { value: null, error: `href-uri non-interne (doar căi "/..."): ${bad.join(", ")}` };
    return { value: out, error: null };
  }

  // sections
  const out: { id: string; heading: string; level: 2 | 3; body: string[] }[] = [];
  const usedIds = new Set<string>();
  for (let i = 0; i < items.length; i++) {
    const o = items[i];
    if (!o || typeof o !== "object" || !isText(o.heading))
      return { value: null, error: `secțiunea ${i + 1}: lipsește "heading" (text)` };
    if (o.level !== 2 && o.level !== 3)
      return { value: null, error: `secțiunea ${i + 1}: "level" trebuie 2 sau 3` };
    if (!Array.isArray(o.body) || !o.body.every((b) => typeof b === "string"))
      return { value: null, error: `secțiunea ${i + 1}: "body" trebuie listă de paragrafe (text)` };
    const base = slugify(o.heading) || "sectiune";
    let id = isText(o.id) ? o.id.trim() : base;
    let n = 2;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);
    out.push({
      id,
      heading: o.heading.trim(),
      level: o.level,
      body: (o.body as string[]).map((b) => b.trim()).filter(Boolean),
    });
  }
  return { value: out, error: null };
}

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

    // jsonb columns supplied as JSON strings in the CSV (e.g. guide sections/faq).
    for (const jf of desc.jsonFields ?? []) {
      const raw = (row[jf.col] ?? "").trim();
      if (!raw) {
        dbRow[jf.col] = [];
        continue;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        err(`${jf.col}: JSON invalid`);
        continue;
      }
      const res = validateJsonField(jf.kind, parsed);
      if (res.error) err(`${jf.col}: ${res.error}`);
      else dbRow[jf.col] = res.value;
    }

    if (desc.key === "casinos") dbRow.offer_url = `/go/${slug}`;
    if (desc.key === "bonuses") {
      const cslug = (row.casino_slug ?? "").trim().toLowerCase();
      dbRow.claim_url = cslug ? `/go/${cslug}` : null;
    }

    return { line, slug, level, messages, dbRow, relations };
  });
}
