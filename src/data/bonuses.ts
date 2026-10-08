import type { BonusCardData } from "@/types/bonus";

/** Mock bonuses for Phase 2 homepage (replaced by real data later). */
export const latestBonuses: BonusCardData[] = [
  {
    slug: "unibet-bonus-fara-depunere",
    bonusType: "Bonus fără depunere",
    casinoName: "Unibet Casino",
    offer: "50 RON fără depunere",
    wagering: "x30",
    href: "/bonusuri-casino/unibet-bonus-fara-depunere",
    claimUrl: "/go/unibet-casino",
  },
  {
    slug: "superbet-bonus-bun-venit",
    bonusType: "Bonus de bun venit",
    casinoName: "Superbet Casino",
    offer: "100% până la 1.000 RON",
    freeSpins: 100,
    wagering: "x35",
    code: "SB100",
    href: "/bonusuri-casino/superbet-bonus-bun-venit",
    claimUrl: "/go/superbet-casino",
  },
  {
    slug: "winbet-rotiri-gratuite",
    bonusType: "Rotiri gratuite",
    casinoName: "Winbet Casino",
    offer: "200 Rotiri Gratuite",
    freeSpins: 200,
    wagering: "x40",
    href: "/bonusuri-casino/winbet-rotiri-gratuite",
    claimUrl: "/go/winbet-casino",
  },
];
