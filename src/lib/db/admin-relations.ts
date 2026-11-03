import "server-only";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { loadEntityRegistry } from "@/lib/db/admin-entities";
import { buildUrlInventory } from "@/lib/db/url-inventory";
import { buildEntityRelations, type EntityRelation, type RelationInput } from "@/lib/seo/entity-relations";
import { topicalCoverage, type TopicalRow } from "@/lib/seo/topical-coverage";
import type { EntityRecord } from "@/lib/seo/entity-registry";

export interface EntityGraph {
  registry: EntityRecord[];
  relations: EntityRelation[];
}

export interface SemanticContext extends EntityGraph {
  topical: TopicalRow[];
}

/**
 * Loads the KE-2B entity graph (registry + relations) under the admin session in a FIXED number of
 * queries (no N+1). Read-only: SELECT only, never service-role, RLS `is_admin()` applies. Relations
 * are filtered against the registry's known entity ids so orphan/archived references are dropped.
 * The graph is GLOBAL CMS — association with clusters/briefs stays project-scoped at the call site.
 */
export async function loadEntityGraph(): Promise<EntityGraph> {
  const db = await getSupabaseAuthClient();

  const [registry, bonuses, casinoGames, games, casinoPayments, casinoTags, casinoLicenses] = await Promise.all([
    loadEntityRegistry(),
    db.from("bonuses").select("id, casino_id, bonus_type_id").neq("status", "archived"),
    db.from("casino_games").select("casino_id, game_id"),
    db.from("games").select("id, provider_id").neq("status", "archived"),
    db.from("casino_payment_methods").select("casino_id, payment_method_id"),
    db.from("casino_tags").select("casino_id, tag_id"),
    db.from("casinos").select("id, license").neq("status", "archived"),
  ]);

  for (const [name, res] of Object.entries({ bonuses, casinoGames, games, casinoPayments, casinoTags, casinoLicenses })) {
    if ("error" in res && res.error) throw new Error(`loadEntityGraph(${name}): ${res.error.message}`);
  }

  const input: RelationInput = {
    bonuses: ((bonuses.data as { id: string; casino_id: string | null; bonus_type_id: string | null }[]) ?? [])
      .map((b) => ({ id: b.id, casinoId: b.casino_id, bonusTypeId: b.bonus_type_id })),
    casinoGames: ((casinoGames.data as { casino_id: string; game_id: string }[]) ?? [])
      .map((r) => ({ casinoId: r.casino_id, gameId: r.game_id })),
    games: ((games.data as { id: string; provider_id: string | null }[]) ?? [])
      .map((g) => ({ id: g.id, providerId: g.provider_id })),
    casinoPayments: ((casinoPayments.data as { casino_id: string; payment_method_id: string }[]) ?? [])
      .map((r) => ({ casinoId: r.casino_id, paymentMethodId: r.payment_method_id })),
    casinoTags: ((casinoTags.data as { casino_id: string; tag_id: string }[]) ?? [])
      .map((r) => ({ casinoId: r.casino_id, tagId: r.tag_id })),
    casinoLicenses: ((casinoLicenses.data as { id: string; license: string | null }[]) ?? [])
      .map((c) => ({ casinoId: c.id, license: c.license })),
  };

  const knownIds = new Set(registry.map((e) => e.id));
  return { registry, relations: buildEntityRelations(input, knownIds) };
}

/**
 * KE-2C: the entity graph PLUS topical coverage over the draft-inclusive URL inventory. Used by the
 * SEO Brief Workbench to compute read-only semantic recommendations. Read-only, admin RLS; fixed
 * query count (graph + one inventory build). GLOBAL CMS — brief/project scoping stays at the caller.
 */
export async function loadSemanticContext(): Promise<SemanticContext> {
  const { registry, relations } = await loadEntityGraph();
  const inventory = await buildUrlInventory({ includeDrafts: true });
  const byId = new Map(registry.map((e) => [e.id, e] as const));
  return { registry, relations, topical: topicalCoverage(relations, byId, inventory) };
}
