/** Shape consumed by <GuideCard />. Maps cleanly to a future DB row. */
export interface GuideCardData {
  slug: string;
  title: string;
  category: string;
  /** Category slug — used for filtering. */
  categorySlug: string;
  excerpt: string;
  /** Cover image path (local/public). Falls back to a placeholder when absent. */
  imageUrl?: string;
  author: string;
  updatedAt: string;
  /** Internal guide page. */
  href: string;
}

/** A content section rendered as an H2/H3 with paragraphs. */
export interface GuideSection {
  /** Anchor id (used by the table of contents). */
  id: string;
  heading: string;
  level: 2 | 3;
  body: string[];
}

export interface GuideRelatedLink {
  label: string;
  href: string;
}

/** Extra fields for the guide article page (merged with GuideCardData). */
export interface GuideDetailExtra {
  intro: string;
  readingTime?: string;
  sections: GuideSection[];
  /** Internal links to casinos/games/bonuses/providers/payment pages. */
  relatedLinks: GuideRelatedLink[];
  faq?: { question: string; answer: string }[];
  /** ISO timestamps for Article structured data (undefined when absent). */
  publishedAt?: string;
  modifiedAt?: string;
}

export type GuideDetail = GuideCardData & GuideDetailExtra;
