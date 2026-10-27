/**
 * Single source of truth for the operating company + official contact details.
 * Reused by institutional pages, Footer, and Organization/ContactPoint JSON-LD.
 *
 * CasinOnline.ro and Bonusuri.ro are operated by the same company. The company
 * registration data below is the operator's official Trade Register identity.
 * The contact email is CasinOnline-specific (NOT the Bonusuri.ro address).
 *
 * NOTE: no ONJN authorization is asserted here — the Bonusuri.ro ONJN decision is
 * not transferred to this domain (see /licente-si-reglementare).
 */

export const company = {
  legalName: "SC Betting PRO Advertising SRL",
  cui: "36665226",
  regCom: "J51/501/2016",
  address: "Str. Zefirului 10, Bl. H4, Sc. C, Et. 3, Ap. 11, cod 910154",
  /** CasinOnline.ro official contact — used consistently site-wide. */
  email: "contact@casinonline.ro",
  /** Sister project operated by the same company. */
  sisterSite: { name: "Bonusuri.ro", url: "https://bonusuri.ro" },
} as const;
