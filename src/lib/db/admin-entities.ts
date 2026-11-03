import "server-only";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import { buildEntityRegistry, type EntityRecord, type RegistryInput } from "@/lib/seo/entity-registry";

/**
 * Loads the CMS entity registry (KE-2A) under the admin session in a FIXED number of queries
 * (no N+1). Read-only: SELECT only, never service-role, RLS `is_admin()` applies. Content entities
 * are loaded non-archived (published + draft) so an entity can exist without a published page;
 * taxonomies have no status. The registry is GLOBAL CMS — association with clusters/briefs stays
 * project-scoped at the call site.
 */
export async function loadEntityRegistry(): Promise<EntityRecord[]> {
  const db = await getSupabaseAuthClient();

  const [casinos, bonuses, games, providers, payments, bonusTypes, gameCategories, tags] = await Promise.all([
    db.from("casinos").select("id, name, slug, status, license").neq("status", "archived"),
    db.from("bonuses").select("id, offer, slug, status").neq("status", "archived"),
    db.from("games").select("id, name, slug, status").neq("status", "archived"),
    db.from("providers").select("id, name, slug, status").neq("status", "archived"),
    db.from("payment_methods").select("id, name, slug, status").neq("status", "archived"),
    db.from("bonus_types").select("id, label, slug"),
    db.from("game_categories").select("id, label, slug"),
    db.from("tags").select("id, label, slug"),
  ]);

  for (const [name, res] of Object.entries({ casinos, bonuses, games, providers, payments, bonusTypes, gameCategories, tags })) {
    if (res.error) throw new Error(`loadEntityRegistry(${name}): ${res.error.message}`);
  }

  const input: RegistryInput = {
    casinos: (casinos.data as unknown as RegistryInput["casinos"]) ?? [],
    bonuses: (bonuses.data as unknown as RegistryInput["bonuses"]) ?? [],
    games: (games.data as unknown as RegistryInput["games"]) ?? [],
    providers: (providers.data as unknown as RegistryInput["providers"]) ?? [],
    payments: (payments.data as unknown as RegistryInput["payments"]) ?? [],
    bonusTypes: (bonusTypes.data as unknown as RegistryInput["bonusTypes"]) ?? [],
    gameCategories: (gameCategories.data as unknown as RegistryInput["gameCategories"]) ?? [],
    tags: (tags.data as unknown as RegistryInput["tags"]) ?? [],
  };
  return buildEntityRegistry(input);
}
