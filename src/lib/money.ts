/**
 * Single, explicit site currency. casinonline.ro targets Romania → RON.
 * There is intentionally NO per-row currency column; numeric money fields
 * (bonuses.spin_value, bonuses.max_win, reward_stages amounts) are RON.
 * `wagering_multiplier` is a plain multiplier, NOT money — do not format it here.
 * If multi-currency offers are ever needed, add a `currency` column then (separate decision).
 */

export const MONEY_CURRENCY = "RON";

const fmt = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: MONEY_CURRENCY,
  maximumFractionDigits: 2,
});

/** Format a numeric RON value, e.g. 10000 → "10.000,00 RON". Null/invalid → "". */
export function formatMoney(value: number | null | undefined): string {
  if (value == null || typeof value !== "number" || !Number.isFinite(value)) return "";
  return fmt.format(value);
}
