/**
 * AI-2.4 Editorial Quality Gate — PURE, DETERMINISTIC, no I/O, no AI SDK, no "AI detectors".
 *
 * ADVISORY ONLY. This produces editorial WARNINGS + SUGGESTIONS about style (generic/bland marketing
 * phrasing, keyword over-repetition, thin informative contribution, claimed personal testing,
 * unjustified categorical claims). It NEVER rewrites content and NEVER blocks generation — factual
 * grounding stays the job of validateGeneratedSection (content-output.ts). Heuristics are intentionally
 * conservative: a single stylistic hit is a hint, not a verdict. ASCII-form matching (the author voice
 * mandates Romanian without diacritics, so generated text is ASCII).
 */

import type { GeneratedSection } from "@/lib/ai/content-output";

export interface EditorialReport {
  /** Detected stylistic/editorial issues (advisory — do not affect validation.ok). */
  warnings: string[];
  /** Concrete editorial suggestions tied to the warnings. */
  suggestions: string[];
}

// Generic / bland-marketing clichés and AI boilerplate (ASCII forms).
const CLICHES: { re: RegExp; label: string }[] = [
  { re: /in lumea (cazinourilor|gamblingului|jocurilor|pariurilor)/i, label: "introducere generica („in lumea...”)" },
  { re: /atunci cand vine vorba/i, label: "cliseu de marketing („atunci cand vine vorba”)" },
  { re: /este important (de retinut|sa (stii|retii|mentionam))/i, label: "umplutura („este important de retinut”)" },
  { re: /\bin concluzie\b/i, label: "incheiere generica („in concluzie”)" },
  { re: /fara (indoiala|dubii)/i, label: "formulare vaga („fara indoiala”)" },
  { re: /nu doar[^.]{0,40}\bci si\b/i, label: "sablon „nu doar... ci si”" },
  { re: /\bdescopera\b/i, label: "indemn promotional („descopera”)" },
  { re: /lume[ao]? (fascinant|captivant|incitant)/i, label: "limbaj promotional vag" },
];

const SUPERLATIVES = /\b(cel mai bun|cea mai buna|cele mai bune|incredibil|senzational|uimitor|extraordinar|spectaculos|revolutionar)\b/i;
const CATEGORICAL = /\b(intotdeauna|niciodata|garantat|absolut toti|absolut toate|orice cazino|toate cazinourile|fara exceptie)\b/i;
const PERSONAL_TEST = /\b(din experienta mea|dupa ce am testat|personal am testat|am verificat personal|am jucat personal|am incercat personal)\b/i;

// Informative signals: expert vocabulary or a concrete figure — their ABSENCE in short text is thin.
const INFORMATIVE_SIGNAL = /\b(rulaj|wagering|retragere|plafon|rotir|kyc|valabilitate|eligibil|depunere|castig|cota|cont|verificare|conditi)\w*|\d/i;
const THIN_WORD_LIMIT = 45;

const KEYWORD_EDITORIAL_MAX = 4; // softer than the validator's hard-stuffing threshold

function wordCount(s: string): number {
  return (s.trim().match(/\S+/g) ?? []).length;
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle.trim()) return 0;
  const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  return (haystack.match(re) ?? []).length;
}

/** Does the content mostly restate its own heading (little added beyond the title)? */
function restatesHeading(content: string, heading: string): boolean {
  const h = heading.trim();
  if (!h) return false;
  return countOccurrences(content, h) >= 2 && wordCount(content) < 60;
}

/**
 * Run the editorial quality gate on a generated section. Returns advisory warnings + suggestions only;
 * it does not mutate the section and does not decide validity.
 */
export function editorialQualityCheck(section: GeneratedSection, keywords: string[] = []): EditorialReport {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const content = typeof section?.content === "string" ? section.content : "";
  if (!content.trim()) return { warnings, suggestions };

  // 1) generic / bland-marketing phrasing.
  const clicheHits = CLICHES.filter((c) => c.re.test(content)).map((c) => c.label);
  if (clicheHits.length) {
    warnings.push(`Expresii generice/marketing: ${clicheHits.join("; ")}.`);
    suggestions.push("Inlocuieste formulele generice cu o observatie concreta de specialist.");
  }
  if (SUPERLATIVES.test(content)) {
    warnings.push("Superlative nejustificate in text.");
    suggestions.push("Inlocuieste superlativele cu detalii verificabile (mecanica, conditie, comparatie).");
  }

  // 2) unjustified categorical claims.
  if (CATEGORICAL.test(content)) {
    warnings.push("Afirmatii categorice nejustificate (ex: „intotdeauna”, „garantat”).");
    suggestions.push("Nuanteaza afirmatiile categorice sau sustine-le cu o conditie din blocul DATE.");
  }

  // 3) claimed personal testing (soft forms; the validator already hard-errors the explicit ones).
  if (PERSONAL_TEST.test(content)) {
    warnings.push("Formulare care pare sa pretinda testare/verificare personala.");
    suggestions.push("Reformuleaza ca analiza de specialitate, fara a pretinde teste personale.");
  }

  // 4) excessive keyword repetition (editorial threshold, softer than the validator).
  for (const k of keywords.filter(Boolean)) {
    const n = countOccurrences(content, k);
    if (n >= KEYWORD_EDITORIAL_MAX) {
      warnings.push(`Keywordul „${k}” apare de ${n} ori — posibila repetare mecanica.`);
      suggestions.push(`Foloseste sinonime sau reformuleaza pentru a reduce repetarea „${k}”.`);
    }
  }

  // 5) thin informative contribution: short AND no concrete/expert signal, or mere title restatement.
  if (restatesHeading(content, section.heading ?? "")) {
    warnings.push("Paragraful pare sa reformuleze titlul sectiunii, fara informatie noua.");
    suggestions.push("Adauga o mecanica, o conditie sau o comparatie concreta dincolo de titlu.");
  } else if (wordCount(content) < THIN_WORD_LIMIT && !INFORMATIVE_SIGNAL.test(content)) {
    warnings.push("Contributie informativa redusa (text scurt, fara detaliu concret).");
    suggestions.push("Include un detaliu util: rulaj, plafon de retragere, valabilitate, jocuri eligibile sau o comparatie.");
  }

  return { warnings, suggestions };
}
