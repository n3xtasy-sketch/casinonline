export type GameVolatility = "Mică" | "Medie" | "Mare";

/** Shape consumed by <GameCard />. Maps cleanly to a future DB row. */
export interface GameCardData {
  slug: string;
  name: string;
  provider: string;
  /** Thumbnail path (local/public). Falls back to a placeholder when absent. */
  thumbnailUrl?: string;
  /** Return-to-player percentage, e.g. 96.5. */
  rtp?: number;
  volatility?: GameVolatility;
  /** Internal game page. */
  href: string;
}
