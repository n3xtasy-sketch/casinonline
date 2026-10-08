/** Shape consumed by <BonusCard />. Maps cleanly to a future DB row. */
export interface BonusCardData {
  slug: string;
  /** e.g. "Bonus fără depunere". */
  bonusType: string;
  casinoName: string;
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
