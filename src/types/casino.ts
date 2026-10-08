export type BadgeTone = "accent" | "gold" | "info" | "neutral" | "danger";

export interface CasinoBadge {
  label: string;
  tone?: BadgeTone;
}

export interface CasinoBonusSummary {
  /** Main offer line, e.g. "100% până la 1.000 RON". */
  headline: string;
  /** Optional free spins count shown as a secondary line. */
  freeSpins?: number;
}

/** Shape consumed by <CasinoCard />. Maps cleanly to a future DB row. */
export interface CasinoCardData {
  slug: string;
  name: string;
  /** Logo path (local/public). Falls back to initials when absent. */
  logoUrl?: string;
  /** Rating on a 0–5 scale. */
  rating: number;
  bonus?: CasinoBonusSummary;
  license?: string;
  payoutSpeed?: string;
  verifiedAt?: string;
  badges?: CasinoBadge[];
  /** Internal review page. */
  reviewUrl: string;
  /** Affiliate offer URL (centralized handling added later). */
  offerUrl: string;
}
