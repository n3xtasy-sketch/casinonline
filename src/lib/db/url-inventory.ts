import "server-only";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { INSTITUTIONAL_PAGES } from "@/lib/institutional";
import { AUTHORS } from "@/lib/authors";

/**
 * URL inventory for SEO Research URL Mapping (FAZA 5.1E). Enumerates every PUBLIC page the
 * site can serve, so clusters can be mapped to real URLs. Read under the admin session
 * (RLS is_admin()) so DRAFT content is visible too — a draft is a *planned* URL (the dynamic
 * route exists but nothing is published there yet), distinct from an *existing* (published)
 * live page. Archived rows are excluded (neither live nor planned). /admin, /go and private
 * routes are never included.
 */

export type UrlType =
  | "home" | "hub" | "casino" | "bonus" | "guide" | "game" | "provider" | "payment" | "institutional" | "author";

export interface UrlEntry {
  url: string; // site-relative path, e.g. "/cazinouri-online/netbet"
  type: UrlType;
  title: string;
  source: string; // human-readable data source
  status: "existing" | "planned"; // existing = published/live; planned = draft route, no content yet
}

interface ContentSpec {
  table: string;
  base: string;
  titleCol: string;
  type: UrlType;
}

// Detail routes backed by CMS content (title column differs per table).
const CONTENT: ContentSpec[] = [
  { table: "casinos", base: "/cazinouri-online", titleCol: "name", type: "casino" },
  { table: "bonuses", base: "/bonusuri-casino", titleCol: "offer", type: "bonus" },
  { table: "guides", base: "/ghiduri", titleCol: "title", type: "guide" },
  { table: "games", base: "/jocuri-casino", titleCol: "name", type: "game" },
  { table: "providers", base: "/furnizori", titleCol: "name", type: "provider" },
  { table: "payment_methods", base: "/metode-de-plata", titleCol: "name", type: "payment" },
];

// Hub / listing routes (always live).
const HUBS: { url: string; title: string; type: UrlType }[] = [
  { url: "/", title: "Acasă", type: "home" },
  { url: "/cazinouri-online", title: "Cazinouri online", type: "hub" },
  { url: "/bonusuri-casino", title: "Bonusuri casino", type: "hub" },
  { url: "/ghiduri", title: "Ghiduri", type: "hub" },
  { url: "/jocuri-casino", title: "Jocuri casino", type: "hub" },
  { url: "/furnizori", title: "Furnizori", type: "hub" },
  { url: "/metode-de-plata", title: "Metode de plată", type: "hub" },
];

export async function buildUrlInventory(): Promise<UrlEntry[]> {
  const db = await getSupabaseAuthClient();
  const out: UrlEntry[] = [];

  for (const h of HUBS) out.push({ url: h.url, type: h.type, title: h.title, source: "rută statică", status: "existing" });

  await Promise.all(
    CONTENT.map(async (c) => {
      const { data, error } = await db.from(c.table).select(`slug, ${c.titleCol}, status`);
      if (error) throw new Error(`buildUrlInventory(${c.table}): ${error.message}`);
      for (const row of (data as unknown as Record<string, string>[]) ?? []) {
        if (row.status === "archived") continue; // excluded: neither live nor planned
        out.push({
          url: `${c.base}/${row.slug}`,
          type: c.type,
          title: String(row[c.titleCol] ?? row.slug),
          source: `tabel ${c.table}`,
          status: row.status === "published" ? "existing" : "planned",
        });
      }
    }),
  );

  for (const p of INSTITUTIONAL_PAGES)
    out.push({ url: `/${p.slug}`, type: "institutional", title: p.title, source: "pagini instituționale", status: p.ready ? "existing" : "planned" });

  for (const a of AUTHORS)
    out.push({ url: `/autori/${a.slug}`, type: "author", title: a.name, source: "registru autori", status: a.ready ? "existing" : "planned" });

  // Deterministic order: existing before planned, then by url.
  out.sort((x, y) => (x.status === y.status ? x.url.localeCompare(y.url) : x.status === "existing" ? -1 : 1));
  return out;
}
