/** Shape consumed by <GuideCard />. Maps cleanly to a future DB row. */
export interface GuideCardData {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  /** Cover image path (local/public). Falls back to a placeholder when absent. */
  imageUrl?: string;
  author: string;
  updatedAt: string;
  /** Internal guide page. */
  href: string;
}
