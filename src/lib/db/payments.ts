import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PaymentMethodCardData, PaymentMethodDetail } from "@/types/payment";

interface PaymentRow {
  slug: string;
  name: string;
  logo_url: string | null;
  payment_type: { slug: string; label: string } | null;
}

interface PaymentDetailRow extends PaymentRow {
  intro: string | null;
  deposits: string | null;
  withdrawals: string | null;
  deposit_speed: string | null;
  withdrawal_speed: string | null;
  fees: string | null;
  min_limit: string | null;
  max_limit: string | null;
  pros: string[] | null;
  cons: string[] | null;
  faq: { question: string; answer: string }[] | null;
}

function toCard(row: PaymentRow): PaymentMethodCardData {
  return {
    slug: row.slug,
    name: row.name,
    logoUrl: row.logo_url ?? undefined,
    type: row.payment_type?.label ?? "",
    typeSlug: row.payment_type?.slug ?? "",
    href: `/metode-de-plata/${row.slug}`,
  };
}

function toDetail(row: PaymentDetailRow): PaymentMethodDetail {
  return {
    ...toCard(row),
    intro: row.intro ?? "",
    deposits: row.deposits ?? "",
    withdrawals: row.withdrawals ?? "",
    depositSpeed: row.deposit_speed ?? undefined,
    withdrawalSpeed: row.withdrawal_speed ?? undefined,
    fees: row.fees ?? undefined,
    minLimit: row.min_limit ?? undefined,
    maxLimit: row.max_limit ?? undefined,
    pros: row.pros ?? [],
    cons: row.cons ?? [],
    faq: row.faq ?? [],
  };
}

const CARD_SELECT = "slug, name, logo_url, payment_type:payment_types(slug, label)";
const DETAIL_SELECT = `${CARD_SELECT}, intro, deposits, withdrawals, deposit_speed, withdrawal_speed, fees, min_limit, max_limit, pros, cons, faq`;

/** All payment methods for the listing (the page applies filter/sort). */
export async function getPaymentMethods(): Promise<PaymentMethodCardData[]> {
  const db = getSupabaseServerClient();
  const { data, error } = await db.from("payment_methods").select(CARD_SELECT).order("name");
  if (error) throw new Error(`getPaymentMethods: ${error.message}`);
  return (data as unknown as PaymentRow[]).map(toCard);
}

/** Single payment method (detail) by slug, or null when not found. */
export async function getPaymentMethodBySlug(slug: string): Promise<PaymentMethodDetail | null> {
  const db = getSupabaseServerClient();
  const { data, error } = await db
    .from("payment_methods")
    .select(DETAIL_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getPaymentMethodBySlug: ${error.message}`);
  return data ? toDetail(data as unknown as PaymentDetailRow) : null;
}
