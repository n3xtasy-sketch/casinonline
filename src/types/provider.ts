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
