/** Shape consumed by <PaymentMethodCard />. Maps cleanly to a future DB row. */
export interface PaymentMethodCardData {
  slug: string;
  /** Display name — must match the strings used in casino payment lists. */
  name: string;
  logoUrl?: string;
  /** Type display label, e.g. "Card". */
  type: string;
  /** Type slug — used for filtering. */
  typeSlug: string;
  /** Internal payment method page. */
  href: string;
}

/** Extra fields for the payment method detail page (merged with the card data). */
export interface PaymentMethodDetailExtra {
  intro: string;
  deposits: string;
  withdrawals: string;
  depositSpeed?: string;
  withdrawalSpeed?: string;
  fees?: string;
  minLimit?: string;
  maxLimit?: string;
  pros: string[];
  cons: string[];
  faq?: { question: string; answer: string }[];
}

export type PaymentMethodDetail = PaymentMethodCardData & PaymentMethodDetailExtra;
