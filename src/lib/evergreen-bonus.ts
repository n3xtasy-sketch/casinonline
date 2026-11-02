/**
 * Evergreen operator bonus pages (SEO-C) — PURE intent registry + helpers.
 *
 * The URL /cazinouri-online/[operator]/[bonus-intent] is keyed by SEO INTENT (not bonus_type).
 * Intents reuse the SEO-B bonus selectors so the same deterministic predicate decides which
 * offers match — one offer can satisfy several intents (e.g. free-spins + no-deposit) without
 * duplication. The registry is the SINGLE SOURCE of valid intents (kept in code, so new intents
 * need no DB migration); the CMS validates against it server-side.
 */

import { bonusMatches, type BonusClassify } from "@/lib/seo-categories";

export interface EvergreenIntent {
  selector: string; // reused SEO-B bonus selector
  label: string; // RO display label
}

export const EVERGREEN_INTENTS: Record<string, EvergreenIntent> = {
  "bonus-fara-depunere": { selector: "bonus:no_deposit", label: "Bonus fără depunere" },
  "rotiri-gratuite-fara-depunere": { selector: "bonus:no_deposit+free_spins", label: "Rotiri gratuite fără depunere" },
  "bonus-fara-rulaj": { selector: "bonus:no_wagering", label: "Bonus fără rulaj" },
  "bonus-de-bun-venit": { selector: "bonus:type=bonus-de-bun-venit", label: "Bonus de bun venit" },
  "bonus-cashback": { selector: "bonus:type=cashback", label: "Bonus cashback" },
};

/** All valid intent slugs (reserved URL segments under /cazinouri-online/[operator]/). */
export const EVERGREEN_INTENT_SLUGS = Object.keys(EVERGREEN_INTENTS);

export function isValidIntent(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(EVERGREEN_INTENTS, slug);
}

export function intentLabel(slug: string): string | null {
  return EVERGREEN_INTENTS[slug]?.label ?? null;
}

export function intentSelector(slug: string): string | null {
  return EVERGREEN_INTENTS[slug]?.selector ?? null;
}

/** Does a bonus match the SEO intent? (Reuses the deterministic SEO-B predicate.) */
export function evergreenBonusMatches(intent: string, bonus: BonusClassify): boolean {
  const selector = intentSelector(intent);
  return selector ? bonusMatches(selector, bonus) : false;
}
