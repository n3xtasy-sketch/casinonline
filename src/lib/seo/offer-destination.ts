/**
 * URL-1 Canonical Bonus Destination Resolver — PURE, DETERMINISTIC, no I/O, no AI/SERP/GSC.
 *
 * Maps a bonus offer to its SINGLE canonical SEO destination, with a 404-proof fallback chain.
 * An offer may match several intents; this resolver collapses them to ONE canonical intent via a
 * fixed priority, reusing the existing SEO-C predicate (`evergreenBonusMatches`) where the intent
 * already exists in the registry.
 *
 * Canonical intents (aligned to the approved operator structure):
 *   1. Bonus fără depunere                → bonus-fara-depunere
 *   2. Rotiri gratuite fără depunere       → bonus-fara-depunere   (no-deposit free spins collapse here)
 *   3. Bonus de bun venit (cu depunere)    → bonus-de-bun-venit
 *   4. Rotiri gratuite la depunere         → rotiri-gratuite       (deposit free spins)
 *   5. Cashback                            → bonus-cashback
 *
 * Destination resolution (never a 404):
 *   override (editor-chosen, same operator, PUBLISHED evergreen page) →
 *   published operator evergreen page for the canonical intent →
 *   published /bonusuri/<category> →
 *   /bonusuri (safe hub fallback).
 *
 * NOTE on `rotiri-gratuite`: it is NOT yet a registered EVERGREEN intent (the public evergreen route
 * does not accept it), so a published evergreen page cannot exist for it and such offers safely fall
 * back to the approved /bonusuri/rotiri-gratuite category. Promoting it to a live operator
 * destination requires extending EVERGREEN_INTENTS + a "deposit free spins" selector — a taxonomy
 * decision that is reported, not improvised here (it can affect existing published pages).
 *
 * The resolver API ACCEPTS an editorial `override`, so callers are ready once persistence lands.
 * Persisting the override requires a DB migration (see report) — no non-persistent control is built.
 */

import { evergreenBonusMatches, isValidIntent } from "@/lib/evergreen-bonus";
import type { BonusClassify } from "@/lib/seo-categories";

export type CanonicalIntent = "bonus-fara-depunere" | "bonus-de-bun-venit" | "rotiri-gratuite" | "bonus-cashback";
export type DestinationKind = "override" | "evergreen" | "category" | "hub";

/** Offer shape the resolver needs: its CMS classification + the operator slug. */
export interface OfferForDestination extends BonusClassify {
  casinoSlug: string;
}

/** Editorial override — the editor picks a valid evergreen page of the SAME operator. */
export interface DestinationOverride {
  casinoSlug: string;
  intent: string;
}

export interface DestinationContext {
  /** Keys `${casinoSlug}|${intent}` for PUBLISHED operator evergreen pages (operator also published). */
  publishedEvergreen: ReadonlySet<string>;
  /** Published seo_categories (namespace `bonus`) slugs, e.g. "fara-depunere". */
  publishedBonusCategories: ReadonlySet<string>;
  /** Editorial override (not persistable without a migration — see report). */
  override?: DestinationOverride | null;
}

export interface OfferDestination {
  url: string;
  kind: DestinationKind;
  /** The offer's canonical intent classification (independent of which destination won). */
  intent: CanonicalIntent | null;
  reasons: string[];
}

const HUB = "/bonusuri";
/** Canonical intent → approved /bonusuri category slug (the fallback category). */
const INTENT_CATEGORY: Record<CanonicalIntent, string> = {
  "bonus-fara-depunere": "fara-depunere",
  "bonus-de-bun-venit": "bonus-de-bun-venit",
  "rotiri-gratuite": "rotiri-gratuite",
  "bonus-cashback": "cashback",
};

/** Build the Set key used in `publishedEvergreen`. */
export function evergreenKey(casinoSlug: string, intent: string): string {
  return `${casinoSlug}|${intent}`;
}

const evergreenUrl = (casinoSlug: string, intent: string) => `/cazinouri-online/${casinoSlug}/${intent}`;

/**
 * Collapse an offer to its SINGLE canonical intent (rules 1–5, fixed priority). Returns null when
 * the offer does not map to any approved intent → the resolver falls back to the hub.
 */
export function offerCanonicalIntent(offer: OfferForDestination): CanonicalIntent | null {
  // Rules 1 & 2: any no-deposit offer (with or without free spins) → bonus-fara-depunere.
  if (evergreenBonusMatches("bonus-fara-depunere", offer)) return "bonus-fara-depunere";
  // Rule 5: cashback.
  if (evergreenBonusMatches("bonus-cashback", offer)) return "bonus-cashback";
  // Rule 4: deposit free spins (free spins AND not no-deposit).
  if ((offer.freeSpins ?? 0) > 0 && !offer.isNoDeposit) return "rotiri-gratuite";
  // Rule 3: welcome deposit bonus.
  if (evergreenBonusMatches("bonus-de-bun-venit", offer)) return "bonus-de-bun-venit";
  return null; // unclassifiable → safe hub fallback (never misclassified)
}

/**
 * Resolve an offer's single canonical SEO destination. Deterministic; never returns a 404 target
 * (every branch yields an existing page: override/evergreen only when published, category only when
 * published, else the always-present hub).
 */
export function resolveOfferDestination(offer: OfferForDestination, ctx: DestinationContext): OfferDestination {
  const reasons: string[] = [];
  const intent = offerCanonicalIntent(offer);

  // 1) Editorial override (rule 8): same operator + a PUBLISHED, valid evergreen page of that operator.
  const ov = ctx.override;
  if (ov) {
    const sameOperator = ov.casinoSlug === offer.casinoSlug;
    const valid = isValidIntent(ov.intent);
    const published = ctx.publishedEvergreen.has(evergreenKey(ov.casinoSlug, ov.intent));
    if (sameOperator && valid && published) {
      reasons.push(`Override editorial: pagină evergreen validă a operatorului (${ov.intent}).`);
      return { url: evergreenUrl(ov.casinoSlug, ov.intent), kind: "override", intent, reasons };
    }
    reasons.push(
      `Override ignorat (${!sameOperator ? "alt operator" : !valid ? "intent invalid" : "pagină nepublicată"}) — revin la rezolvarea automată, fără 404.`,
    );
  }

  // 2) Published operator evergreen page for the canonical intent.
  if (intent && ctx.publishedEvergreen.has(evergreenKey(offer.casinoSlug, intent))) {
    reasons.push(`Pagină evergreen publicată: ${offer.casinoSlug}/${intent}.`);
    return { url: evergreenUrl(offer.casinoSlug, intent), kind: "evergreen", intent, reasons };
  }

  // 3) Published relevant /bonusuri category (rule 10).
  if (intent) {
    const cat = INTENT_CATEGORY[intent];
    if (ctx.publishedBonusCategories.has(cat)) {
      reasons.push(`Fără evergreen publicat; categorie relevantă publicată /bonusuri/${cat}.`);
      return { url: `/bonusuri/${cat}`, kind: "category", intent, reasons };
    }
    reasons.push(`Nici evergreen, nici categoria /bonusuri/${cat} nu sunt publicate.`);
  } else {
    reasons.push("Ofertă neclasificabilă într-un intent canonic.");
  }

  // 4) Safe hub fallback (rule 10) — always exists.
  reasons.push("Fallback sigur: hub /bonusuri.");
  return { url: HUB, kind: "hub", intent, reasons };
}
