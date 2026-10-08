/**
 * Temporary mock data for Phase 1 shell widgets only.
 * Replaced by real data sources later (see CLAUDE.md / PROJECT.md).
 */

export interface RankedRow {
  name: string;
  rating: number;
}

export const topCasinos: RankedRow[] = [
  { name: "Superbet Casino", rating: 4.9 },
  { name: "Betano Casino", rating: 4.8 },
  { name: "Unibet Casino", rating: 4.7 },
  { name: "Winbet Casino", rating: 4.6 },
  { name: "NetBet Casino", rating: 4.5 },
];

export const popularGames: RankedRow[] = [
  { name: "Sweet Bonanza", rating: 4.8 },
  { name: "Gates of Olympus", rating: 4.7 },
  { name: "Shining Crown", rating: 4.6 },
  { name: "Book of Dead", rating: 4.5 },
  { name: "Big Bass Bonanza", rating: 4.5 },
];
