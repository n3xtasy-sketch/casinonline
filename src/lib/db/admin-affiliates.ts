import "server-only";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import type { Option } from "@/lib/db/admin-casinos";

export interface AffiliateLinkRow {
  id: string;
  casinoName: string;
  casinoSlug: string;
  placement: string;
  url: string;
  campaign: string | null;
  isActive: boolean;
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
  return (
    (data as unknown as {
      id: string;
      placement: string;
      url: string;
      campaign: string | null;
      is_active: boolean;
      casino: { name: string; slug: string } | null;
    }[]) ?? []
  ).map((r) => ({
    id: r.id,
    casinoName: r.casino?.name ?? "",
    casinoSlug: r.casino?.slug ?? "",
    placement: r.placement,
    url: r.url,
    campaign: r.campaign,
    isActive: r.is_active,
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
