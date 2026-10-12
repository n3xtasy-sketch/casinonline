/** Controlled affiliate placement vocabulary — client-safe (no server-only deps).
 *  Mirrors the 0013 CHECK constraint on affiliate_links.placement. */

export const AFFILIATE_PLACEMENTS = [
  { value: "review_cta", label: "Review CTA (principal)" },
  { value: "bonus_claim", label: "Bonus claim" },
  { value: "listing_card", label: "Listing card" },
] as const;

export type AffiliatePlacement = (typeof AFFILIATE_PLACEMENTS)[number]["value"];

export const PLACEMENT_VALUES = AFFILIATE_PLACEMENTS.map((p) => p.value) as readonly string[];

export function placementLabel(value: string): string {
  return AFFILIATE_PLACEMENTS.find((p) => p.value === value)?.label ?? value;
}
