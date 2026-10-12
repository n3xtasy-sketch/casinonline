import "server-only";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import {
  entityDefaultMeta,
  evaluateSeo,
  type SeoType,
  type SeoOverride,
  type MetaDefaults,
  type SeoIndicator,
  type EntityMetaInput,
} from "@/lib/seo";

const SEO_COLUMNS =
  "entity_id, meta_title, meta_description, canonical, robots_index, robots_follow, og_title, og_description, og_image";

/** Per-type: table + the SELECT needed to build the default meta input. */
const FETCH: Record<SeoType, { table: string; select: string; toInput: (r: Record<string, unknown>) => EntityMetaInput }> = {
  casino: {
    table: "casinos",
    select: "id, slug, name, intro",
    toInput: (r) => ({ slug: r.slug as string, name: r.name as string, intro: r.intro as string }),
  },
  game: {
    table: "games",
    select: "id, slug, name, intro, provider:providers(name)",
    toInput: (r) => ({
      slug: r.slug as string,
      name: r.name as string,
      intro: r.intro as string,
      provider: (r.provider as { name?: string } | null)?.name ?? "",
    }),
  },
  provider: {
    table: "providers",
    select: "id, slug, name, intro",
    toInput: (r) => ({ slug: r.slug as string, name: r.name as string, intro: r.intro as string }),
  },
  payment_method: {
    table: "payment_methods",
    select: "id, slug, name, intro",
    toInput: (r) => ({ slug: r.slug as string, name: r.name as string, intro: r.intro as string }),
  },
  bonus: {
    table: "bonuses",
    select: "id, slug, intro, bonus_type:bonus_types(label), casino:casinos(name)",
    toInput: (r) => ({
      slug: r.slug as string,
      intro: r.intro as string,
      bonusType: (r.bonus_type as { label?: string } | null)?.label ?? "",
      casinoName: (r.casino as { name?: string } | null)?.name ?? "",
    }),
  },
  guide: {
    table: "guides",
    select: "id, slug, title, excerpt",
    toInput: (r) => ({ slug: r.slug as string, title: r.title as string, excerpt: r.excerpt as string }),
  },
};

export interface SeoListRow {
  type: SeoType;
  id: string;
  slug: string;
  label: string;
  indicator: SeoIndicator;
  issueCount: number;
  hasOverride: boolean;
}

export async function listSeoForType(type: SeoType): Promise<SeoListRow[]> {
  const db = await getSupabaseAuthClient();
  const cfg = FETCH[type];
  const [entitiesRes, seoRes] = await Promise.all([
    db.from(cfg.table).select(cfg.select).order("slug"),
    db.from("seo_metadata").select(SEO_COLUMNS).eq("entity_type", type),
  ]);
  const entities = (entitiesRes.data as unknown as (Record<string, unknown> & { id: string })[]) ?? [];
  const seoMap = new Map<string, SeoOverride>();
  for (const s of (seoRes.data as unknown as (SeoOverride & { entity_id: string })[]) ?? []) {
    seoMap.set(s.entity_id, s);
  }
  return entities.map((e) => {
    const input = cfg.toInput(e);
    const defaults = entityDefaultMeta(type, input);
    const seo = seoMap.get(e.id) ?? null;
    const { indicator, issues } = evaluateSeo(defaults, seo);
    return {
      type,
      id: e.id,
      slug: input.slug,
      label: defaults.title,
      indicator,
      issueCount: issues.length,
      hasOverride: !!seo,
    };
  });
}

export interface SeoEditData {
  type: SeoType;
  id: string;
  slug: string;
  label: string;
  defaults: MetaDefaults;
  seo: SeoOverride | null;
}

export async function getSeoEdit(type: SeoType, id: string): Promise<SeoEditData | null> {
  const db = await getSupabaseAuthClient();
  const cfg = FETCH[type];
  const [entityRes, seoRes] = await Promise.all([
    db.from(cfg.table).select(cfg.select).eq("id", id).maybeSingle(),
    db.from("seo_metadata").select(SEO_COLUMNS).eq("entity_type", type).eq("entity_id", id).maybeSingle(),
  ]);
  if (!entityRes.data) return null;
  const input = cfg.toInput(entityRes.data as unknown as Record<string, unknown>);
  const defaults = entityDefaultMeta(type, input);
  return {
    type,
    id,
    slug: input.slug,
    label: defaults.title,
    defaults,
    seo: (seoRes.data as unknown as SeoOverride | null) ?? null,
  };
}
