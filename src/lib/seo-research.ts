/**
 * SEO Research — pure helpers (client+server safe, no deps). FAZA 5.1B foundation.
 *
 * normalizeKeyword is used ONLY for deduplication (the uq_seo_keywords_dedup unique
 * key). It is NOT a semantic signal: stripping diacritics / casing says nothing about
 * search intent, so clustering (later phases) must not rely on it. The original
 * keyword is always stored + displayed as typed.
 */

const RO_DIACRITICS: Record<string, string> = {
  ă: "a", â: "a", î: "i", ș: "s", ş: "s", ț: "t", ţ: "t",
  Ă: "a", Â: "a", Î: "i", Ș: "s", Ş: "s", Ț: "t", Ţ: "t",
};

/** Dedup key: lowercase, trim, collapse inner whitespace, strip Romanian diacritics. */
export function normalizeKeyword(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[ăâîșşțţ]/gi, (ch) => RO_DIACRITICS[ch] ?? ch)
    .replace(/\s+/g, " ");
}

export type SeoProjectInput = { name: string; defaultCountry: string };

/** Validate a new-project form. Returns an error message (RO) or null. */
export function validateProjectInput(input: { name: string; defaultCountry?: string }): string | null {
  const name = input.name.trim();
  if (!name) return "Numele proiectului este obligatoriu.";
  if (name.length > 120) return "Numele proiectului este prea lung (max 120 de caractere).";
  const country = (input.defaultCountry ?? "").trim();
  if (country && !/^[a-z]{2}$/i.test(country)) return "Codul de țară trebuie să aibă 2 litere (ex. ro).";
  return null;
}

export interface SeoProjectStats {
  keywords: number;
  clusters: number;
  imports: number;
  briefs: number;
}
