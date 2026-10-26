import "server-only";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import type { Option } from "@/lib/db/admin-casinos";

export interface LinkedBonus {
  slug: string;
  offer: string;
}

export interface AffiliateLinkRow {
  id: string;
  casinoName: string;
  casinoSlug: string;
  placement: string;
  url: string;
  campaign: string | null;
  isActive: boolean;
  /** Bonuses whose affiliate_link_id points at this link (reverse usage). */
  bonuses: LinkedBonus[];
}

export interface AffiliateLinkFilters {
  casinoId?: string;
  active?: "active" | "inactive";
  placement?: string;
}

/** Admin affiliate-link listing with optional filters (admin session — sees all). */
export async function listAffiliateLinks(
  filters: AffiliateLinkFilters = {},
): Promise<AffiliateLinkRow[]> {
  const db = await getSupabaseAuthClient();
  let query = db
    .from("affiliate_links")
    .select("id, placement, url, campaign, is_active, casino:casinos(name, slug)")
    .order("placement");
  if (filters.casinoId) query = query.eq("casino_id", filters.casinoId);
  if (filters.active) query = query.eq("is_active", filters.active === "active");
  if (filters.placement) query = query.eq("placement", filters.placement);
  const { data, error } = await query;
  if (error) throw new Error(`listAffiliateLinks: ${error.message}`);
  const rows =
    (data as unknown as {
      id: string;
      placement: string;
      url: string;
      campaign: string | null;
      is_active: boolean;
      casino: { name: string; slug: string } | null;
    }[]) ?? [];

  // Reverse usage: which bonuses point at each listed link (one grouped query).
  const linkIds = rows.map((r) => r.id);
  const byLink = new Map<string, LinkedBonus[]>();
  if (linkIds.length) {
    const { data: bonusData, error: bErr } = await db
      .from("bonuses")
      .select("slug, offer, affiliate_link_id")
      .in("affiliate_link_id", linkIds)
      .order("slug");
    if (bErr) throw new Error(`listAffiliateLinks (bonuses): ${bErr.message}`);
    for (const b of (bonusData as unknown as {
      slug: string;
      offer: string;
      affiliate_link_id: string;
    }[]) ?? []) {
      const list = byLink.get(b.affiliate_link_id) ?? [];
      list.push({ slug: b.slug, offer: b.offer });
      byLink.set(b.affiliate_link_id, list);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    casinoName: r.casino?.name ?? "",
    casinoSlug: r.casino?.slug ?? "",
    placement: r.placement,
    url: r.url,
    campaign: r.campaign,
    isActive: r.is_active,
    bonuses: byLink.get(r.id) ?? [],
  }));
}

export interface AffiliateLinkEditData {
  id: string;
  casinoId: string;
  placement: string;
  url: string;
  campaign: string;
  isActive: boolean;
}

export async function getAffiliateLinkEdit(id: string): Promise<AffiliateLinkEditData | null> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db
    .from("affiliate_links")
    .select("id, casino_id, placement, url, campaign, is_active")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getAffiliateLinkEdit: ${error.message}`);
  if (!data) return null;
  const r = data as unknown as {
    id: string;
    casino_id: string;
    placement: string;
    url: string;
    campaign: string | null;
    is_active: boolean;
  };
  return {
    id: r.id,
    casinoId: r.casino_id,
    placement: r.placement,
    url: r.url,
    campaign: r.campaign ?? "",
    isActive: r.is_active,
  };
}

/** All casinos (incl. archived) for the link picker — admin session. */
export async function listAllCasinos(): Promise<Option[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("casinos").select("id, name").order("name");
  if (error) throw new Error(`listAllCasinos: ${error.message}`);
  return ((data as unknown as { id: string; name: string }[]) ?? []).map((r) => ({
    id: r.id,
    label: r.name,
  }));
}
