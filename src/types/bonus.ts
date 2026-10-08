/** Shape consumed by <BonusCard />. Maps cleanly to a future DB row. */
export interface BonusCardData {
  slug: string;
  /** Bonus type slug — used for filtering. */
  typeSlug: string;
  /** e.g. "Bonus fără depunere". */
  bonusType: string;
  casinoName: string;
  /** Casino slug — used to resolve the associated casino. */
  casinoSlug: string;
  /** Main offer line, e.g. "100% până la 1.000 RON". */
  offer: string;
  freeSpins?: number;
  /** Wagering requirement, e.g. "x30" or "Fără rulaj". */
  wagering?: string;
  code?: string;
  /** Internal bonus detail page. */
  href: string;
  /** Affiliate claim URL (centralized handling added later). */
  claimUrl: string;
}

/** Extra fields for the bonus detail page (merged with BonusCardData). */
export interface BonusDetailExtra {
  intro: string;
  minDeposit?: string;
  validity?: string;
  terms: string[];
  pros: string[];
  cons: string[];
  howToClaim: string[];
  faq?: { question: string; answer: string }[];
}

export type BonusDetail = BonusCardData & BonusDetailExtra;
