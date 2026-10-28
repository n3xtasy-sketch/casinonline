import "server-only";
import { selectedJunctionIds } from "@/lib/admin-relations";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import type { ContentStatus } from "@/lib/content-status";
import { authorName } from "@/lib/authors";
import type { EditorialRowView } from "@/lib/editorial-status";

/** Admin read helpers for the casino form. Use the admin session (RLS = is_admin). */

export interface Option {
  id: string;
  label: string;
}

export type CasinoStatus = ContentStatus;

export interface AdminCasinoRow {
  id: string;
  slug: string;
  name: string;
  rating: number | null;
  license: string | null;
  payoutSpeed: string | null;
  status: CasinoStatus;
  reviewUrl: string;
  editorial: EditorialRowView;
}

export interface CasinoEditData {
  id: string;
  slug: string;
  name: string;
  status: CasinoStatus;
  yearLaunched: string;
  logoUrl: string;
  rating: string;
  editorScore: string;
  license: string;
  licenseVerifiedAt: string;
  licenseSource: string;
  payoutSpeed: string;
  withdrawalTime: string;
  verifiedAt: string;
  verificationSource: string;
  minDeposit: string;
  kyc: string;
  support: string;
  mobile: string;
  intro: string;
  editorReview: string;
  pros: string[];
  cons: string[];
  faq: { question: string; answer: string }[];
  tagIds: string[];
  paymentMethodIds: string[];
  gameIds: string[];
  affiliateUrl: string;
  authorSlug: string;
  verifierSlug: string;
  editorialVerifiedAt: string;
}

/** Admin casino listing — sees every row (incl. archived) via the admin session. */
export async function listAdminCasinos(
  filter: "all" | ContentStatus = "all",
): Promise<AdminCasinoRow[]> {
  const db = await getSupabaseAuthClient();
  let query = db
    .from("casinos")
    .select(
      "id, slug, name, rating, license, payout_speed, status, updated_at, author_slug, verifier_slug, editorial_verified_at",
    )
    .order("status")
    .order("rating", { ascending: false });
  if (filter !== "all") query = query.eq("status", filter);
  const { data, error } = await query;
  if (error) throw new Error(`listAdminCasinos: ${error.message}`);
  return (
    (data as unknown as {
      id: string;
      slug: string;
      name: string;
      rating: number | null;
      license: string | null;
      payout_speed: string | null;
      status: CasinoStatus;
      updated_at: string | null;
      author_slug: string | null;
      verifier_slug: string | null;
      editorial_verified_at: string | null;
    }[]) ?? []
  ).map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    rating: r.rating,
    license: r.license,
    payoutSpeed: r.payout_speed,
    status: r.status,
    reviewUrl: `/cazinouri-online/${r.slug}`,
    editorial: {
      authorSlug: r.author_slug, verifierSlug: r.verifier_slug,
      editorialVerifiedAt: r.editorial_verified_at,
      authorName: authorName(r.author_slug), verifierName: authorName(r.verifier_slug),
      updatedAt: r.updated_at,
    },
  }));
}

export async function listTags(): Promise<Option[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("tags").select("id, label").order("sort_order");
  if (error) throw new Error(`listTags: ${error.message}`);
  return (data as unknown as Option[]) ?? [];
}

export async function listPaymentMethods(): Promise<Option[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("payment_methods").select("id, name").order("name");
  if (error) throw new Error(`listPaymentMethods: ${error.message}`);
  return ((data as unknown as { id: string; name: string }[]) ?? []).map((r) => ({
    id: r.id,
    label: r.name,
  }));
}

export async function listGames(): Promise<Option[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("games").select("id, name").order("name");
  if (error) throw new Error(`listGames: ${error.message}`);
  return ((data as unknown as { id: string; name: string }[]) ?? []).map((r) => ({
    id: r.id,
    label: r.name,
  }));
}

interface EditRow {
  id: string;
  slug: string;
  name: string;
  status: CasinoStatus;
  year_launched: number | null;
  logo_url: string | null;
  rating: number | null;
  editor_score: number | null;
  license: string | null;
  license_verified_at: string | null;
  license_source: string | null;
  payout_speed: string | null;
  withdrawal_time: string | null;
  verified_at: string | null;
  verification_source: string | null;
  min_deposit: string | null;
  kyc: string | null;
  support: string | null;
  mobile: string | null;
  intro: string | null;
  editor_review: string | null;
  pros: string[] | null;
  cons: string[] | null;
  faq: { question: string; answer: string }[] | null;
  casino_tags: { tag_id: string }[] | null;
  casino_payment_methods: { payment_method_id: string }[] | null;
  casino_games: { game_id: string }[] | null;
  affiliate_links: { url: string; placement: string }[] | null;
  author_slug: string | null;
  verifier_slug: string | null;
  editorial_verified_at: string | null;
}

const EDIT_SELECT =
  "id, slug, name, status, year_launched, logo_url, rating, editor_score, license, license_verified_at, license_source, payout_speed, withdrawal_time, verified_at, verification_source, min_deposit, kyc, support, mobile, intro, editor_review, pros, cons, faq, casino_tags(tag_id), casino_payment_methods(payment_method_id), casino_games(game_id), affiliate_links(url, placement), author_slug, verifier_slug, editorial_verified_at";

/** Full editable casino (admin only) by slug, or null. */
export async function getCasinoEdit(slug: string): Promise<CasinoEditData | null> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("casinos").select(EDIT_SELECT).eq("slug", slug).maybeSingle();
  if (error) throw new Error(`getCasinoEdit: ${error.message}`);
  if (!data) return null;
  const r = data as unknown as EditRow;
  const affiliate =
    (r.affiliate_links ?? []).find((a) => a.placement === "review_cta") ??
    (r.affiliate_links ?? [])[0];
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    status: r.status ?? "active",
    yearLaunched: r.year_launched != null ? String(r.year_launched) : "",
    logoUrl: r.logo_url ?? "",
    rating: r.rating != null ? String(r.rating) : "",
    editorScore: r.editor_score != null ? String(r.editor_score) : "",
    license: r.license ?? "",
    licenseVerifiedAt: r.license_verified_at ?? "",
    licenseSource: r.license_source ?? "",
    payoutSpeed: r.payout_speed ?? "",
    withdrawalTime: r.withdrawal_time ?? "",
    verifiedAt: r.verified_at ?? "",
    verificationSource: r.verification_source ?? "",
    minDeposit: r.min_deposit ?? "",
    kyc: r.kyc ?? "",
    support: r.support ?? "",
    mobile: r.mobile ?? "",
    intro: r.intro ?? "",
    editorReview: r.editor_review ?? "",
    pros: r.pros ?? [],
    cons: r.cons ?? [],
    faq: r.faq ?? [],
    tagIds: selectedJunctionIds(r.casino_tags, "tag_id"),
    paymentMethodIds: selectedJunctionIds(r.casino_payment_methods, "payment_method_id"),
    gameIds: selectedJunctionIds(r.casino_games, "game_id"),
    affiliateUrl: affiliate?.url ?? "",
    authorSlug: r.author_slug ?? "",
    verifierSlug: r.verifier_slug ?? "",
    editorialVerifiedAt: r.editorial_verified_at ? r.editorial_verified_at.slice(0, 10) : "",
  };
}
