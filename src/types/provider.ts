/** Shape consumed by <ProviderCard />. Maps cleanly to a future DB row. */
export interface ProviderCardData {
  slug: string;
  name: string;
  /** Logo path (local/public). Falls back to initials when absent. */
  logoUrl?: string;
  gameCount: number;
  category?: string;
  /** Internal provider page. */
  href: string;
}

/** Extra fields for the provider detail page (merged with ProviderCardData). */
export interface ProviderDetailExtra {
  intro: string;
  founded?: string;
  country?: string;
  specialty?: string;
  rtpRange?: string;
  faq?: { question: string; answer: string }[];
}

export type ProviderDetail = ProviderCardData & ProviderDetailExtra;
