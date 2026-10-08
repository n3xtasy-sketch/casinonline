import type { ProviderCardData } from "@/types/provider";

/** Mock providers (replaced by real data later). */
export const allProviders: ProviderCardData[] = [
  { slug: "pragmatic-play", name: "Pragmatic Play", gameCount: 320, category: "Sloturi & Live", href: "/furnizori/pragmatic-play" },
  { slug: "egt", name: "EGT / Amusnet", gameCount: 180, category: "Sloturi", href: "/furnizori/egt" },
  { slug: "playn-go", name: "Play'n GO", gameCount: 240, category: "Sloturi", href: "/furnizori/playn-go" },
  { slug: "greentube", name: "Greentube / Novomatic", gameCount: 150, category: "Sloturi", href: "/furnizori/greentube" },
  { slug: "hacksaw", name: "Hacksaw Gaming", gameCount: 90, category: "Sloturi", href: "/furnizori/hacksaw" },
  { slug: "playson", name: "Playson", gameCount: 110, category: "Sloturi", href: "/furnizori/playson" },
];

/** Homepage subset. */
export const popularProviders: ProviderCardData[] = allProviders.slice(0, 6);

/** Sort options for the listing (reused by the sort UI). */
export const providerSortOptions = [
  { value: "recomandate", label: "Recomandate" },
  { value: "jocuri", label: "Număr de jocuri" },
  { value: "nume", label: "Nume (A–Z)" },
];
