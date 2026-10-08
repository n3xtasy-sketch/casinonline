import type { BonusCardData } from "@/types/bonus";

/** Mock bonuses (replaced by real data later). */
export const allBonuses: BonusCardData[] = [
  { slug: "superbet-bonus-bun-venit", typeSlug: "bonus-de-bun-venit", bonusType: "Bonus de bun venit", casinoName: "Superbet Casino", casinoSlug: "superbet-casino", offer: "100% până la 1.000 RON", freeSpins: 100, wagering: "x35", code: "SB100", href: "/bonusuri-casino/superbet-bonus-bun-venit", claimUrl: "/go/superbet-casino" },
  { slug: "betano-bonus-bun-venit", typeSlug: "bonus-de-bun-venit", bonusType: "Bonus de bun venit", casinoName: "Betano Casino", casinoSlug: "betano-casino", offer: "100% până la 1.500 RON", freeSpins: 150, wagering: "x35", href: "/bonusuri-casino/betano-bonus-bun-venit", claimUrl: "/go/betano-casino" },
  { slug: "unibet-fara-depunere", typeSlug: "fara-depunere", bonusType: "Bonus fără depunere", casinoName: "Unibet Casino", casinoSlug: "unibet-casino", offer: "50 RON fără depunere", wagering: "x30", href: "/bonusuri-casino/unibet-fara-depunere", claimUrl: "/go/unibet-casino" },
  { slug: "winbet-rotiri-gratuite", typeSlug: "rotiri-gratuite", bonusType: "Rotiri gratuite", casinoName: "Winbet Casino", casinoSlug: "winbet-casino", offer: "200 Rotiri Gratuite", freeSpins: 200, wagering: "x40", href: "/bonusuri-casino/winbet-rotiri-gratuite", claimUrl: "/go/winbet-casino" },
  { slug: "netbet-cashback", typeSlug: "cashback", bonusType: "Cashback", casinoName: "NetBet Casino", casinoSlug: "netbet-casino", offer: "10% cashback săptămânal", wagering: "x1", href: "/bonusuri-casino/netbet-cashback", claimUrl: "/go/netbet-casino" },
  { slug: "vlad-bonus-bun-venit", typeSlug: "bonus-de-bun-venit", bonusType: "Bonus de bun venit", casinoName: "Vlad Casino", casinoSlug: "vlad-casino", offer: "75% până la 1.200 RON", wagering: "x30", href: "/bonusuri-casino/vlad-bonus-bun-venit", claimUrl: "/go/vlad-casino" },
  { slug: "las-vegas-rotiri-gratuite", typeSlug: "rotiri-gratuite", bonusType: "Rotiri gratuite", casinoName: "Las Vegas Casino", casinoSlug: "las-vegas-casino", offer: "150 Rotiri Gratuite", freeSpins: 150, wagering: "x35", href: "/bonusuri-casino/las-vegas-rotiri-gratuite", claimUrl: "/go/las-vegas-casino" },
  { slug: "maxbet-fara-depunere", typeSlug: "fara-depunere", bonusType: "Bonus fără depunere", casinoName: "MaxBet Casino", casinoSlug: "maxbet-casino", offer: "25 RON fără depunere", wagering: "x40", href: "/bonusuri-casino/maxbet-fara-depunere", claimUrl: "/go/maxbet-casino" },
  { slug: "betano-fara-rulaj", typeSlug: "fara-rulaj", bonusType: "Bonus fără rulaj", casinoName: "Betano Casino", casinoSlug: "betano-casino", offer: "200 RON fără rulaj", href: "/bonusuri-casino/betano-fara-rulaj", claimUrl: "/go/betano-casino" },
];

/** Homepage subset. */
export const latestBonuses: BonusCardData[] = allBonuses.slice(0, 3);

/** Filter + sort options for the listing (reused by the filter/sort UI). */
export const bonusTypeFilters = [
  { value: "bonus-de-bun-venit", label: "Bonus de bun venit" },
  { value: "fara-depunere", label: "Fără depunere" },
  { value: "rotiri-gratuite", label: "Rotiri gratuite" },
  { value: "cashback", label: "Cashback" },
  { value: "fara-rulaj", label: "Fără rulaj" },
];

export const bonusSortOptions = [
  { value: "recomandate", label: "Recomandate" },
  { value: "rotiri", label: "Cele mai multe rotiri" },
  { value: "cazino", label: "Cazino (A–Z)" },
];
