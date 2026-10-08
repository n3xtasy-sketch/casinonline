import type { PaymentMethodCardData } from "@/types/payment";

/** Mock payment methods (names match casino payment lists for relationship lookups). */
export const allPaymentMethods: PaymentMethodCardData[] = [
  { slug: "visa", name: "Visa", type: "Card", typeSlug: "card", href: "/metode-de-plata/visa" },
  { slug: "mastercard", name: "Mastercard", type: "Card", typeSlug: "card", href: "/metode-de-plata/mastercard" },
  { slug: "skrill", name: "Skrill", type: "Portofel electronic", typeSlug: "ewallet", href: "/metode-de-plata/skrill" },
  { slug: "neteller", name: "Neteller", type: "Portofel electronic", typeSlug: "ewallet", href: "/metode-de-plata/neteller" },
  { slug: "apple-pay", name: "Apple Pay", type: "Plăți mobile", typeSlug: "mobile", href: "/metode-de-plata/apple-pay" },
  { slug: "paysafecard", name: "Paysafecard", type: "Preplătit", typeSlug: "prepaid", href: "/metode-de-plata/paysafecard" },
];

/** Filter + sort options for the listing (reused by the filter/sort UI). */
export const paymentTypeFilters = [
  { value: "card", label: "Card" },
  { value: "ewallet", label: "Portofel electronic" },
  { value: "prepaid", label: "Preplătit" },
  { value: "mobile", label: "Plăți mobile" },
];

export const paymentSortOptions = [
  { value: "recomandate", label: "Recomandate" },
  { value: "nume", label: "Nume (A–Z)" },
];
