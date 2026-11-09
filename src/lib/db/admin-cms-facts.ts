import "server-only";
import { getSupabaseAuthClient } from "@/lib/supabase/auth-server";
import type { BonusFactRow, CasinoFactRow, CmsFactRows } from "@/lib/ai/cms-facts";

/**
 * AI-2.6 (server-only): load the STRUCTURED factual columns (bonuses 0026, casinos 0024) under the
 * admin session. Read-only SELECTs, RLS `is_admin()` applies; archived rows are excluded. Fixed query
 * count (2). These feed the pure `buildCmsFacts` extractor — this module does no extraction itself.
 */
export async function loadCmsFactRows(): Promise<CmsFactRows> {
  const db = await getSupabaseAuthClient();

  const [bonuses, casinos] = await Promise.all([
    db
      .from("bonuses")
      .select("id, casino_id, offer, amount, wagering_multiplier, wagering_basis, is_no_wagering, spin_value, max_win, kyc_required, eligible_slots, verified_at, expires_at, terms_url")
      .neq("status", "archived"),
    db
      .from("casinos")
      .select("id, name, license, license_verified_at, license_source")
      .neq("status", "archived"),
  ]);

  if (bonuses.error) throw new Error(`loadCmsFactRows(bonuses): ${bonuses.error.message}`);
  if (casinos.error) throw new Error(`loadCmsFactRows(casinos): ${casinos.error.message}`);

  type BonusDb = {
    id: string; casino_id: string | null; offer: string | null; amount: string | null;
    wagering_multiplier: number | null; wagering_basis: string | null; is_no_wagering: boolean | null;
    spin_value: number | null; max_win: number | null; kyc_required: boolean | null;
    eligible_slots: unknown; verified_at: string | null; expires_at: string | null; terms_url: string | null;
  };
  type CasinoDb = { id: string; name: string | null; license: string | null; license_verified_at: string | null; license_source: string | null };

  const bonusRows: BonusFactRow[] = ((bonuses.data as BonusDb[]) ?? []).map((b) => ({
    id: b.id,
    casinoId: b.casino_id,
    offer: b.offer,
    amount: b.amount,
    wageringMultiplier: b.wagering_multiplier,
    wageringBasis: b.wagering_basis,
    isNoWagering: b.is_no_wagering,
    spinValue: b.spin_value,
    maxWin: b.max_win,
    kycRequired: b.kyc_required,
    eligibleSlots: b.eligible_slots,
    verifiedAt: b.verified_at,
    expiresAt: b.expires_at,
    termsUrl: b.terms_url,
  }));

  const casinoRows: CasinoFactRow[] = ((casinos.data as CasinoDb[]) ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    license: c.license,
    licenseVerifiedAt: c.license_verified_at,
    licenseSource: c.license_source,
  }));

  return { bonuses: bonusRows, casinos: casinoRows };
}
