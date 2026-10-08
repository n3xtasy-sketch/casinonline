export type GameVolatility = "Mică" | "Medie" | "Mare";

/** Shape consumed by <GameCard />. Maps cleanly to a future DB row. */
export interface GameCardData {
  slug: string;
  name: string;
  /** Provider display name. */
  provider: string;
  /** Provider slug — used for filtering (maps to a future join table). */
  providerSlug: string;
  /** Category slug — used for filtering. */
  categorySlug: string;
  /** Thumbnail path (local/public). Falls back to a placeholder when absent. */
  thumbnailUrl?: string;
  /** Return-to-player percentage, e.g. 96.5. */
  rtp?: number;
  volatility?: GameVolatility;
  /** Internal game page. */
  href: string;
}

/** Extra fields for the game detail page (merged with GameCardData). */
export interface GameDetailExtra {
  intro: string;
  maxWin?: string;
  releaseDate?: string;
  reels?: string;
  paylines?: string;
  betRange?: string;
  mechanics: string;
  bonusFeatures?: string[];
  /** Casino slugs where the game is available. */
  availableCasinos?: string[];
  faq?: { question: string; answer: string }[];
}

export type GameDetail = GameCardData & GameDetailExtra;
