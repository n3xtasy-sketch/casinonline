import "server-only";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import type { Option } from "@/lib/db/admin-casinos";
import type { ContentStatus } from "@/lib/content-status";

/** One reward tranche (reward_stages jsonb item). label required; rest optional. */
export interface RewardStage {
  label: string;
  amount?: string;
  free_spins?: number;
  spin_value?: number;
  wagering_multiplier?: number;
  wagering_basis?: string;
  trigger?: string;
  within?: string;
  note?: string;
}

export interface BonusEditData {
  id: string;
  slug: string;
  casinoId: string;
  bonusTypeId: string;
  offer: string;
  amount: string;
  freeSpins: string;
  spinValue: string;
  maxWin: string;
  eligibleSlots: string[];
  wagering: string;
  wageringMultiplier: string;
  wageringBasis: string;
  minDeposit: string;
  validity: string;
  code: string;
  kycRequired: "" | "true" | "false";
  termsUrl: string;
  verifiedAt: string;
  expiresAt: string;
  rewardStages: RewardStage[];
  intro: string;
  terms: string[];
  pros: string[];
  cons: string[];
  howToClaim: string[];
  faq: { question: string; answer: string }[];
  /** "" = use the casino's main link (NULL); otherwise the specific affiliate_links.id. */
  affiliateLinkId: string;
  authorSlug: string;
  verifierSlug: string;
  /** YYYY-MM-DD for the date input ("" when none). */
  editorialVerifiedAt: string;
}

/** One affiliate link, client-safe, for the bonus form picker. Includes inactive so the
 *  form can warn when a bonus still points at a deactivated link. */
export interface AffiliateLinkChoice {
  id: string;
  casinoId: string;
  placement: string;
  campaign: string | null;
  url: string;
  isActive: boolean;
}

/** All affiliate links (active + inactive) for the bonus picker — admin session (RLS = is_admin). */
export async function listAffiliateLinkChoices(): Promise<AffiliateLinkChoice[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db
    .from("affiliate_links")
    .select("id, casino_id, placement, url, campaign, is_active")
    .order("placement");
  if (error) throw new Error(`listAffiliateLinkChoices: ${error.message}`);
  return (
    (data as unknown as {
      id: string;
      casino_id: string;
      placement: string;
      url: string;
      campaign: string | null;
      is_active: boolean;
    }[]) ?? []
  ).map((r) => ({
    id: r.id,
    casinoId: r.casino_id,
    placement: r.placement,
    campaign: r.campaign,
    url: r.url,
    isActive: r.is_active,
  }));
}

/** id → slug for every casino (admin), for building /go/<casino>/<bonus> + preview. */
export async function listCasinoSlugs(): Promise<Record<string, string>> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("casinos").select("id, slug");
  if (error) throw new Error(`listCasinoSlugs: ${error.message}`);
  const out: Record<string, string> = {};
  for (const r of (data as unknown as { id: string; slug: string }[]) ?? []) out[r.id] = r.slug;
  return out;
}

export interface AdminBonusRow {
  id: string;
  slug: string;
  offer: string;
  bonusType: string;
  casinoName: string;
  freeSpins: number | null;
  casinoArchived: boolean;
  status: ContentStatus;
}

/**
 * Admin bonus listing — uses the admin session so bonuses of ARCHIVED casinos stay
 * visible/editable (the public reader hides them). Flags archived-casino bonuses.
 */
export async function listAdminBonuses(filter: "all" | ContentStatus = "all"): Promise<AdminBonusRow[]> {
  const db = await getSupabaseAuthClient();
  let query = db
    .from("bonuses")
    .select(
      "id, slug, offer, free_spins, status, bonus_type:bonus_types(label), casino:casinos(name, status)",
    )
    .order("created_at");
  if (filter !== "all") query = query.eq("status", filter);
  const { data, error } = await query;
  if (error) throw new Error(`listAdminBonuses: ${error.message}`);
  return (
    (data as unknown as {
      id: string;
      slug: string;
      offer: string;
      free_spins: number | null;
      status: ContentStatus;
      bonus_type: { label: string } | null;
      casino: { name: string; status: string } | null;
    }[]) ?? []
  ).map((r) => ({
    id: r.id,
    slug: r.slug,
    offer: r.offer,
    bonusType: r.bonus_type?.label ?? "",
    casinoName: r.casino?.name ?? "",
    freeSpins: r.free_spins,
    casinoArchived: r.casino?.status === "archived",
    status: r.status,
  }));
}

export async function listCasinos(): Promise<Option[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("casinos").select("id, name").order("name");
  if (error) throw new Error(`listCasinos: ${error.message}`);
  return ((data as unknown as { id: string; name: string }[]) ?? []).map((r) => ({
    id: r.id,
    label: r.name,
  }));
}

export async function listBonusTypes(): Promise<Option[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("bonus_types").select("id, label").order("sort_order");
  if (error) throw new Error(`listBonusTypes: ${error.message}`);
  return (data as unknown as Option[]) ?? [];
}

interface EditRow {
  id: string;
  slug: string;
  casino_id: string;
  bonus_type_id: string | null;
  offer: string;
  amount: string | null;
  free_spins: number | null;
  spin_value: number | null;
  max_win: number | null;
  eligible_slots: string[] | null;
  wagering: string | null;
  wagering_multiplier: number | null;
  wagering_basis: string | null;
  min_deposit: string | null;
  validity: string | null;
  code: string | null;
  kyc_required: boolean | null;
  terms_url: string | null;
  verified_at: string | null;
  expires_at: string | null;
  reward_stages: RewardStage[] | null;
  intro: string | null;
  terms: string[] | null;
  pros: string[] | null;
  cons: string[] | null;
  how_to_claim: string[] | null;
  faq: { question: string; answer: string }[] | null;
  affiliate_link_id: string | null;
  author_slug: string | null;
  verifier_slug: string | null;
  editorial_verified_at: string | null;
}

const EDIT_SELECT =
  "id, slug, casino_id, bonus_type_id, offer, amount, free_spins, spin_value, max_win, eligible_slots, wagering, wagering_multiplier, wagering_basis, min_deposit, validity, code, kyc_required, terms_url, verified_at, expires_at, reward_stages, intro, terms, pros, cons, how_to_claim, faq, affiliate_link_id, author_slug, verifier_slug, editorial_verified_at";

export async function getBonusEdit(slug: string): Promise<BonusEditData | null> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("bonuses").select(EDIT_SELECT).eq("slug", slug).maybeSingle();
  if (error) throw new Error(`getBonusEdit: ${error.message}`);
  if (!data) return null;
  const r = data as unknown as EditRow;
  return {
    id: r.id,
    slug: r.slug,
    casinoId: r.casino_id,
    bonusTypeId: r.bonus_type_id ?? "",
    offer: r.offer ?? "",
    amount: r.amount ?? "",
    freeSpins: r.free_spins != null ? String(r.free_spins) : "",
    spinValue: r.spin_value != null ? String(r.spin_value) : "",
    maxWin: r.max_win != null ? String(r.max_win) : "",
    eligibleSlots: r.eligible_slots ?? [],
    wagering: r.wagering ?? "",
    wageringMultiplier: r.wagering_multiplier != null ? String(r.wagering_multiplier) : "",
    wageringBasis: r.wagering_basis ?? "",
    minDeposit: r.min_deposit ?? "",
    validity: r.validity ?? "",
    code: r.code ?? "",
    kycRequired: r.kyc_required == null ? "" : r.kyc_required ? "true" : "false",
    termsUrl: r.terms_url ?? "",
    verifiedAt: r.verified_at ?? "",
    expiresAt: r.expires_at ?? "",
    rewardStages: r.reward_stages ?? [],
    intro: r.intro ?? "",
    terms: r.terms ?? [],
    pros: r.pros ?? [],
    cons: r.cons ?? [],
    howToClaim: r.how_to_claim ?? [],
    faq: r.faq ?? [],
    affiliateLinkId: r.affiliate_link_id ?? "",
    authorSlug: r.author_slug ?? "",
    verifierSlug: r.verifier_slug ?? "",
    editorialVerifiedAt: r.editorial_verified_at ? r.editorial_verified_at.slice(0, 10) : "",
  };
}
