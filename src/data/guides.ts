import type { GuideCardData } from "@/types/guide";

/** Mock guides (replaced by real data later). */
export const allGuides: GuideCardData[] = [
  {
    slug: "cum-functioneaza-rulajul",
    title: "Cum funcționează rulajul (wagering) la bonusuri",
    category: "Bonusuri",
    categorySlug: "bonusuri",
    excerpt:
      "Ce înseamnă x30 sau x40, cum se calculează și la ce să fii atent înainte să accepți un bonus.",
    author: "Echipa CasinOnline",
    updatedAt: "oct. 2026",
    href: "/ghiduri/cum-functioneaza-rulajul",
  },
  {
    slug: "ce-este-rtp",
    title: "Ce este RTP și cum îl interpretezi corect",
    category: "Jocuri",
    categorySlug: "jocuri",
    excerpt:
      "RTP, volatilitate și cum influențează acestea experiența reală la sloturi, explicate pe înțelesul tuturor.",
    author: "Echipa CasinOnline",
    updatedAt: "oct. 2026",
    href: "/ghiduri/ce-este-rtp",
  },
  {
    slug: "verificare-cont-kyc",
    title: "Verificarea contului (KYC) pas cu pas",
    category: "Ghiduri",
    categorySlug: "ghiduri",
    excerpt:
      "Ce documente îți trebuie, cât durează verificarea și cum eviți întârzierile la prima retragere.",
    author: "Echipa CasinOnline",
    updatedAt: "sept. 2026",
    href: "/ghiduri/verificare-cont-kyc",
  },
  {
    slug: "cum-alegi-cazino-sigur",
    title: "Cum alegi un cazino online sigur în România",
    category: "Ghiduri",
    categorySlug: "ghiduri",
    excerpt:
      "Licența ONJN, viteza retragerilor și reputația — criteriile esențiale pentru o alegere sigură.",
    author: "Echipa CasinOnline",
    updatedAt: "sept. 2026",
    href: "/ghiduri/cum-alegi-cazino-sigur",
  },
  {
    slug: "ghid-bonus-bun-venit",
    title: "Ghid complet pentru bonusul de bun venit",
    category: "Bonusuri",
    categorySlug: "bonusuri",
    excerpt:
      "Cum alegi cel mai bun bonus de bun venit și cum maximizezi valoarea lui reală.",
    author: "Echipa CasinOnline",
    updatedAt: "aug. 2026",
    href: "/ghiduri/ghid-bonus-bun-venit",
  },
  {
    slug: "metode-plata-rapide",
    title: "Care sunt cele mai rapide metode de plată",
    category: "Metode de plată",
    categorySlug: "metode-de-plata",
    excerpt:
      "Comparație între carduri, portofele electronice și plăți mobile din perspectiva vitezei de retragere.",
    author: "Echipa CasinOnline",
    updatedAt: "aug. 2026",
    href: "/ghiduri/metode-plata-rapide",
  },
];

/** Homepage subset. */
export const latestGuides: GuideCardData[] = allGuides.slice(0, 3);

/** Filter + sort options for the listing (reused by the filter/sort UI). */
export const guideCategoryFilters = [
  { value: "bonusuri", label: "Bonusuri" },
  { value: "jocuri", label: "Jocuri" },
  { value: "ghiduri", label: "Ghiduri" },
  { value: "metode-de-plata", label: "Metode de plată" },
];

export const guideSortOptions = [
  { value: "recomandate", label: "Recomandate" },
  { value: "titlu", label: "Titlu (A–Z)" },
];
