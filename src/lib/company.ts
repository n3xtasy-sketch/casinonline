/**
 * Single source of truth for the operating company + official contact details.
 * Reused by institutional pages, Footer, and Organization/ContactPoint JSON-LD.
 *
 * CasinOnline.ro and Bonusuri.ro are operated by the same company. The company
 * registration data below is the operator's official Trade Register identity.
 * The contact email is CasinOnline-specific (NOT the Bonusuri.ro address).
 *
 * ONJN: the operating company holds an ONJN AFFILIATE license (not a gambling
 * operator license). Per the platform owner, this company-level affiliate license
 * covers the company's projects, including CasinOnline.ro. We do not claim that the
 * casinonline.ro domain is individually authorized/notified beyond this; only the
 * confirmed number/date are stated. See /licente-si-reglementare.
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
  /**
   * Company ONJN AFFILIATE license (confirmed by the platform owner). This is a
   * license to promote/inform about licensed operators — NOT a license to organize
   * gambling. Only the confirmed number + date; no expiry or legal category invented.
   */
  onjnAffiliateLicense: {
    authority: "ONJN",
    type: "afiliat",
    number: "1046",
    date: "19.06.2017",
    /** Human-readable form used in copy: "nr. 1046/19.06.2017". */
    label: "nr. 1046/19.06.2017",
    source: "conform informatiilor furnizate de proprietarul platformei",
  },
} as const;

/**
 * Infrastructure / processors — ONLY facts confirmed from the codebase. No retention
 * periods, legal bases, or hosting regions are stated here (unconfirmed → must be set
 * after owner/legal confirmation before the Privacy page goes live).
 */
export const infrastructure = {
  supabase: {
    name: "Supabase",
    role: "Baza de date, autentificare administrativa si gazduire imagini (CDN).",
    /** Confirmed by owner: production project region. */
    region: "Central EU (Frankfurt, Germania), eu-central-1",
    note: "Imaginile publice se incarca din CDN-ul Supabase; IP-ul si user-agent-ul vizitatorului ajung la CDN la incarcarea imaginilor.",
  },
  vercel: {
    name: "Vercel",
    role: "Gazduire si livrare a site-ului.",
    note: "Ca orice furnizor de gazduire, poate pastra loguri tehnice de acces (ex. IP, user-agent).",
  },
  fonts: {
    name: "Google Fonts (self-hosted)",
    role: "Fonturile sunt servite din domeniul propriu (self-hosted la build).",
    note: "Nu se trimit date catre Google la incarcarea paginii.",
  },
  /** Owner-confirmed: no non-essential analytics is enabled anywhere. */
  analytics: {
    vercelWebAnalytics: "OFF",
    vercelSpeedInsights: "neconfigurat",
    note: "Nu folosim Google Analytics, Google Tag Manager, Meta Pixel sau instrumente proprii de analiza a traficului.",
  },
  /**
   * Honest caveat requested by the owner: hosting in Frankfurt does NOT guarantee that
   * every processing operation / transfer happens exclusively within the EU.
   */
  euCaveat:
    "Gazduirea in Frankfurt nu garanteaza ca toate prelucrarile sau transferurile de date au loc exclusiv in Uniunea Europeana; furnizorii pot efectua anumite operatiuni conform propriilor politici.",
} as const;
