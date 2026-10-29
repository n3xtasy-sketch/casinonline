import type { GameCardData, GameVolatility } from "@/types/game";

/** Mock games (replaced by real data later). */
export const allGames: GameCardData[] = [
  { slug: "sweet-bonanza", name: "Sweet Bonanza", provider: "Pragmatic Play", providerSlug: "pragmatic-play", categorySlug: "sloturi", rtp: 96.5, volatility: "Mare", href: "/pacanele-online/sweet-bonanza" },
  { slug: "gates-of-olympus", name: "Gates of Olympus", provider: "Pragmatic Play", providerSlug: "pragmatic-play", categorySlug: "sloturi", rtp: 96.5, volatility: "Mare", href: "/pacanele-online/gates-of-olympus" },
  { slug: "big-bass-bonanza", name: "Big Bass Bonanza", provider: "Pragmatic Play", providerSlug: "pragmatic-play", categorySlug: "sloturi", rtp: 96.7, volatility: "Medie", href: "/pacanele-online/big-bass-bonanza" },
  { slug: "wolf-gold", name: "Wolf Gold", provider: "Pragmatic Play", providerSlug: "pragmatic-play", categorySlug: "jackpot", rtp: 96.0, volatility: "Medie", href: "/pacanele-online/wolf-gold" },
  { slug: "power-of-merlin-megaways", name: "Power of Merlin Megaways", provider: "Pragmatic Play", providerSlug: "pragmatic-play", categorySlug: "megaways", rtp: 96.5, volatility: "Mare", href: "/pacanele-online/power-of-merlin-megaways" },
  { slug: "shining-crown", name: "Shining Crown", provider: "EGT", providerSlug: "egt", categorySlug: "sloturi", rtp: 96.3, volatility: "Medie", href: "/pacanele-online/shining-crown" },
  { slug: "burning-hot", name: "Burning Hot", provider: "EGT", providerSlug: "egt", categorySlug: "sloturi", rtp: 95.8, volatility: "Medie", href: "/pacanele-online/burning-hot" },
  { slug: "20-super-hot", name: "20 Super Hot", provider: "EGT", providerSlug: "egt", categorySlug: "sloturi", rtp: 95.9, volatility: "Mică", href: "/pacanele-online/20-super-hot" },
  { slug: "bison-moon-megaways", name: "Bison Moon Megaways", provider: "EGT", providerSlug: "egt", categorySlug: "megaways", rtp: 96.1, volatility: "Mare", href: "/pacanele-online/bison-moon-megaways" },
  { slug: "book-of-dead", name: "Book of Dead", provider: "Play'n GO", providerSlug: "playn-go", categorySlug: "sloturi", rtp: 96.2, volatility: "Mare", href: "/pacanele-online/book-of-dead" },
  { slug: "reactoonz", name: "Reactoonz", provider: "Play'n GO", providerSlug: "playn-go", categorySlug: "sloturi", rtp: 96.5, volatility: "Mare", href: "/pacanele-online/reactoonz" },
  { slug: "rise-of-olympus", name: "Rise of Olympus", provider: "Play'n GO", providerSlug: "playn-go", categorySlug: "jackpot", rtp: 96.5, volatility: "Mare", href: "/pacanele-online/rise-of-olympus" },
];

/** Homepage subset. */
export const popularGames: GameCardData[] = allGames.slice(0, 8);

/** Filter + sort options for the games listing (reused by the filter/sort UI). */
export const gameProviderFilters = [
  { value: "pragmatic-play", label: "Pragmatic Play" },
  { value: "egt", label: "EGT" },
  { value: "playn-go", label: "Play'n GO" },
];

export const gameCategoryFilters = [
  { value: "sloturi", label: "Sloturi" },
  { value: "megaways", label: "Megaways" },
  { value: "jackpot", label: "Jackpot" },
];

export const gameVolatilityFilters = [
  { value: "mica", label: "Mică" },
  { value: "medie", label: "Medie" },
  { value: "mare", label: "Mare" },
];

/** Maps a volatility filter value (slug) to the stored display value. */
export const volatilityByValue: Record<string, GameVolatility> = {
  mica: "Mică",
  medie: "Medie",
  mare: "Mare",
};

export const gameSortOptions = [
  { value: "populare", label: "Populare" },
  { value: "rtp", label: "RTP (descrescător)" },
  { value: "nume", label: "Nume (A–Z)" },
];
