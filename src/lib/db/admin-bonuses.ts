import "server-only";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import type { Option } from "@/lib/db/admin-casinos";

export interface BonusEditData {
  id: string;
  slug: string;
  casinoId: string;
  bonusTypeId: string;
  offer: string;
  freeSpins: string;
  wagering: string;
  minDeposit: string;
  validity: string;
  code: string;
  intro: string;
  terms: string[];
  pros: string[];
  cons: string[];
  howToClaim: string[];
  faq: { question: string; answer: string }[];
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
  free_spins: number | null;
  wagering: string | null;
  min_deposit: string | null;
  validity: string | null;
  code: string | null;
  intro: string | null;
  terms: string[] | null;
  pros: string[] | null;
  cons: string[] | null;
  how_to_claim: string[] | null;
  faq: { question: string; answer: string }[] | null;
}

const EDIT_SELECT =
  "id, slug, casino_id, bonus_type_id, offer, free_spins, wagering, min_deposit, validity, code, intro, terms, pros, cons, how_to_claim, faq";

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
    freeSpins: r.free_spins != null ? String(r.free_spins) : "",
    wagering: r.wagering ?? "",
    minDeposit: r.min_deposit ?? "",
    validity: r.validity ?? "",
    code: r.code ?? "",
    intro: r.intro ?? "",
    terms: r.terms ?? [],
    pros: r.pros ?? [],
    cons: r.cons ?? [],
    howToClaim: r.how_to_claim ?? [],
    faq: r.faq ?? [],
  };
}
