import "server-only";
import type { ContentStatus } from "@/lib/content-status";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import type { Option } from "@/lib/db/admin-casinos";

export interface PaymentMethodEditData {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  paymentTypeId: string;
  depositSpeed: string;
  withdrawalSpeed: string;
  fees: string;
  minLimit: string;
  maxLimit: string;
  intro: string;
  deposits: string;
  withdrawals: string;
  pros: string[];
  cons: string[];
  faq: { question: string; answer: string }[];
  casinoIds: string[];
}

export async function listPaymentTypes(): Promise<Option[]> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db.from("payment_types").select("id, label").order("sort_order");
  if (error) throw new Error(`listPaymentTypes: ${error.message}`);
  return (data as unknown as Option[]) ?? [];
}

interface EditRow {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  payment_type_id: string | null;
  deposit_speed: string | null;
  withdrawal_speed: string | null;
  fees: string | null;
  min_limit: string | null;
  max_limit: string | null;
  intro: string | null;
  deposits: string | null;
  withdrawals: string | null;
  pros: string[] | null;
  cons: string[] | null;
  faq: { question: string; answer: string }[] | null;
  casino_payment_methods: { casino_id: string }[] | null;
}

const EDIT_SELECT =
  "id, slug, name, logo_url, payment_type_id, deposit_speed, withdrawal_speed, fees, min_limit, max_limit, intro, deposits, withdrawals, pros, cons, faq, casino_payment_methods(casino_id)";

export async function getPaymentMethodEdit(slug: string): Promise<PaymentMethodEditData | null> {
  const db = await getSupabaseAuthClient();
  const { data, error } = await db
    .from("payment_methods")
    .select(EDIT_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getPaymentMethodEdit: ${error.message}`);
  if (!data) return null;
  const r = data as unknown as EditRow;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    logoUrl: r.logo_url ?? "",
    paymentTypeId: r.payment_type_id ?? "",
    depositSpeed: r.deposit_speed ?? "",
    withdrawalSpeed: r.withdrawal_speed ?? "",
    fees: r.fees ?? "",
    minLimit: r.min_limit ?? "",
    maxLimit: r.max_limit ?? "",
    intro: r.intro ?? "",
    deposits: r.deposits ?? "",
    withdrawals: r.withdrawals ?? "",
    pros: r.pros ?? [],
    cons: r.cons ?? [],
    faq: r.faq ?? [],
    casinoIds: (r.casino_payment_methods ?? []).map((c) => c.casino_id),
  };
}

export interface AdminPaymentRow {
  id: string;
  slug: string;
  name: string;
  type: string;
  status: ContentStatus;
}

export async function listAdminPayments(filter: "all" | ContentStatus = "all"): Promise<AdminPaymentRow[]> {
  const db = await getSupabaseAuthClient();
  let q = db
    .from("payment_methods")
    .select("id, slug, name, status, payment_type:payment_types(label)")
    .order("status")
    .order("name");
  if (filter !== "all") q = q.eq("status", filter);
  const { data, error } = await q;
  if (error) throw new Error(`listAdminPayments: ${error.message}`);
  return (
    (data as unknown as {
      id: string; slug: string; name: string; status: ContentStatus;
      payment_type: { label?: string } | null;
    }[]) ?? []
  ).map((r) => ({
    id: r.id, slug: r.slug, name: r.name, type: r.payment_type?.label ?? "", status: r.status,
  }));
}
