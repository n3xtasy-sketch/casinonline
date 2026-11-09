/**
 * AI-2.9A Author Knowledge Layer — PURE, DETERMINISTIC, no I/O, no AI SDK, NO prompt wiring (that is
 * AI-2.9B). A versioned TypeScript registry of the author's reusable EDITORIAL knowledge: expert
 * explanations, editorial observations and writing guidance. It is deliberately SEPARATE from CmsFact.
 *
 * FACTUAL ISOLATION (hard contract): AuthorKnowledge is interpretation / method / guidance — NEVER a
 * factual source. It must NOT enter cmsFacts, confirmedEntityKeys or the factual-source allowlist, and
 * it can NEVER support a factualClaim (fact-verification.ts / cms-facts.ts / the validator are untouched).
 * Entries carry no operator-specific offer values (amounts, wagering numbers, licence codes) and make no
 * personal-experience / testing claims — the registry validator flags both.
 */

import { isKnownAuthor } from "@/lib/authors";
import type { ContentPageType, SectionKind } from "@/lib/ai/content-prompt";

export type KnowledgeCategory = "expert_explanation" | "editorial_observation" | "writing_guidance";
export type KnowledgeStatus = "draft" | "published" | "archived";
export type KnowledgeProvenance = "author_expertise" | "editorial_method" | "market_context";

export const KNOWLEDGE_CATEGORIES: readonly KnowledgeCategory[] = ["expert_explanation", "editorial_observation", "writing_guidance"];
export const KNOWLEDGE_STATUSES: readonly KnowledgeStatus[] = ["draft", "published", "archived"];
const PAGE_TYPES: ReadonlySet<ContentPageType> = new Set(["guide", "casino_review", "bonus_category", "operator_evergreen", "generic"]);
const SECTION_KINDS: ReadonlySet<SectionKind> = new Set(["intro", "outline", "faq"]);

/** Where an entry is relevant. At least one dimension must be set (no unbounded "global" entries). */
export interface KnowledgeApplicability {
  pageTypes?: ContentPageType[];
  intents?: string[];
  sectionKinds?: SectionKind[];
  /** Lowercase topic/theme tokens (e.g. "rulaj", "kyc"). */
  topics?: string[];
  /** Registry entity ids ("<type>:<cmsId>" or taxonomy ids like "bonus_type:fara-depunere"). */
  entityIds?: string[];
}

export interface AuthorKnowledge {
  /** Stable kebab-case id (never reused). */
  id: string;
  category: KnowledgeCategory;
  title: string;
  /** RO without diacritics; general-correct explanation / guidance — NO operator-specific values. */
  content: string;
  /** author_slug from src/lib/authors.ts. */
  author: string;
  provenance: KnowledgeProvenance;
  /** Optional review date (ISO yyyy-mm-dd) — means "the author reviewed this note", NOT a verified fact. */
  verifiedAt?: string | null;
  status: KnowledgeStatus;
  applicability: KnowledgeApplicability;
}

// ── Initial registry (6-8 entries). General, correct, no invented experience / stats / operator values. ──
export const AUTHOR_KNOWLEDGE: readonly AuthorKnowledge[] = [
  {
    id: "wagering-basis-explainer",
    category: "expert_explanation",
    title: "Baza de calcul a rulajului",
    content:
      "Rulajul (wagering) arata de cate ori trebuie pariata o suma inainte de retragere. Baza de calcul difera de la o oferta la alta: unele cer rulajul doar pe valoarea bonusului, altele pe bonus plus depunere, iar la rotiri gratuite rulajul se aplica de obicei pe castigul obtinut din rotiri. Acelasi multiplicator inseamna sume foarte diferite in functie de ce se ruleaza, asa ca baza exacta se ia mereu din termenii ofertei.",
    author: "radu-bogdan-gabriel",
    provenance: "author_expertise",
    status: "published",
    applicability: { pageTypes: ["bonus_category", "operator_evergreen", "guide"], intents: ["informational"], sectionKinds: ["outline", "faq"], topics: ["rulaj", "wagering", "baza de calcul"], entityIds: ["bonus_type:fara-depunere"] },
  },
  {
    id: "bonus-vs-winnings",
    category: "expert_explanation",
    title: "Diferenta dintre bonus si castig",
    content:
      "Banii din bonus si castigurile obtinute cu ei sunt tratati separat. Pana la indeplinirea rulajului, soldul din bonus este restrictionat; dupa rulaj, partea eligibila devine retragibila. Multe oferte limiteaza cat din castig poate fi transformat in bani reali. Un bonus nu trebuie prezentat ca si cum ar fi numerar disponibil imediat.",
    author: "radu-bogdan-gabriel",
    provenance: "author_expertise",
    status: "published",
    applicability: { pageTypes: ["bonus_category", "operator_evergreen"], intents: ["informational"], sectionKinds: ["outline", "faq"], topics: ["bonus", "castig", "sold restrictionat"] },
  },
  {
    id: "max-win-vs-withdrawal",
    category: "expert_explanation",
    title: "Limita de castig vs limita de retragere",
    content:
      "Castigul maxim dintr-un bonus este plafonul sumei pe care o poti obtine din acel bonus; nu este acelasi lucru cu o limita de retragere, care tine de politica generala a contului si de metoda de plata. Cele doua nu se confunda: un castig maxim mic inseamna ca orice depaseste plafonul se pierde, independent de limitele sau viteza de retragere.",
    author: "radu-bogdan-gabriel",
    provenance: "author_expertise",
    status: "published",
    applicability: { pageTypes: ["bonus_category", "operator_evergreen", "casino_review"], intents: ["informational"], sectionKinds: ["outline", "faq"], topics: ["castig maxim", "max win", "retragere", "plafon"] },
  },
  {
    id: "kyc-and-claiming",
    category: "expert_explanation",
    title: "KYC si revendicarea bonusurilor",
    content:
      "Verificarea identitatii (KYC) este ceruta de operatorii licentiati si poate fi declansata la inregistrare, la prima retragere sau la atingerea unor praguri. La bonusurile fara depunere, verificarea contului este frecvent necesara inainte de prima retragere, ca masura anti-frauda. Procesul se explica drept o cerinta standard de conformitate, nu drept un obstacol.",
    author: "radu-bogdan-gabriel",
    provenance: "author_expertise",
    status: "published",
    applicability: { pageTypes: ["bonus_category", "operator_evergreen", "casino_review"], intents: ["informational"], sectionKinds: ["outline", "faq"], topics: ["kyc", "verificare cont", "revendicare"], entityIds: ["bonus_type:fara-depunere"] },
  },
  {
    id: "eligible-games-restrictions",
    category: "expert_explanation",
    title: "Restrictii pentru jocurile eligibile",
    content:
      "Nu toate jocurile contribuie la fel la rulaj: sloturile contribuie de obicei integral, jocurile de masa contribuie partial sau deloc, iar unele titluri sunt excluse complet. In timpul rulajului pot fi interzise si pariurile peste o anumita valoare. Cititorul este indrumat sa verifice lista de jocuri eligibile si ponderile din termeni.",
    author: "radu-bogdan-gabriel",
    provenance: "author_expertise",
    status: "published",
    applicability: { pageTypes: ["bonus_category", "operator_evergreen"], intents: ["informational"], sectionKinds: ["outline", "faq"], topics: ["jocuri eligibile", "contributie rulaj", "sloturi"] },
  },
  {
    id: "promo-validity",
    category: "editorial_observation",
    title: "Valabilitatea promotiilor",
    content:
      "Ofertele au adesea o fereastra de valabilitate: bonusul trebuie revendicat si rulat intr-un interval limitat, altfel expira. O oferta se prezinta ca activa doar daca termenii curenti o confirma; cand o promotie a expirat sau nu mai este listata de operator, nu se descrie la timpul prezent. Datele de valabilitate se iau din termeni, nu se presupun.",
    author: "radu-bogdan-gabriel",
    provenance: "editorial_method",
    status: "published",
    applicability: { pageTypes: ["bonus_category", "operator_evergreen"], intents: ["informational", "commercial"], sectionKinds: ["intro", "outline", "faq"], topics: ["valabilitate", "expirare", "promotie activa"] },
  },
  {
    id: "comparing-no-deposit-offers",
    category: "editorial_observation",
    title: "Compararea ofertelor fara depunere",
    content:
      "Cand compari bonusuri fara depunere, valoarea nominala conteaza mai putin decat conditiile: rulajul, plafonul de castig, jocurile eligibile si valabilitatea decid cat de utila este oferta. O suma mai mare cu rulaj mult mai dur poate fi mai slaba decat una mica cu conditii relaxate. Compararea se face pe baza conditiilor verificate, nu doar a cifrei afisate.",
    author: "radu-bogdan-gabriel",
    provenance: "editorial_method",
    status: "published",
    applicability: { pageTypes: ["bonus_category"], intents: ["commercial", "informational"], sectionKinds: ["intro", "outline"], topics: ["comparatie", "bonus fara depunere", "conditii"], entityIds: ["bonus_type:fara-depunere"] },
  },
  {
    id: "faq-writing-guidance",
    category: "writing_guidance",
    title: "Redactarea raspunsurilor FAQ",
    content:
      "La FAQ, raspunde direct in prima propozitie, apoi adauga un detaliu util. Pune intai intrebarile pe care si le pune jucatorul: cat este rulajul, ce castig maxim are, este nevoie de KYC, pana cand e valabila oferta. Evita reformularea intrebarii si introducerile de umplutura; foloseste doar valori care provin din date verificate.",
    author: "radu-bogdan-gabriel",
    provenance: "editorial_method",
    status: "published",
    applicability: { sectionKinds: ["faq"], intents: ["informational"], topics: ["faq", "redactare"] },
  },
];

// ── Validation (pure) ───────────────────────────────────────────────────────────────
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Personal-experience / testing claims are forbidden in editorial knowledge (hard error). */
const PERSONAL_EXPERIENCE = /\b(am|ne-am)\s+(testat|jucat|incercat|pariat|retras|depus)\b|din experienta mea|personal am|dupa ce am testat/i;
/** Heuristic (ADVISORY, not a proof): an operator-specific figure (currency amount / percentage / licence
 *  code) has no place in a GENERAL knowledge entry — those belong to CmsFact. Flagged, not a guarantee. */
const OPERATOR_VALUE = /\b\d[\d.,]*\s*(ron|lei|eur|€)\b|\d+\s*%|\bL\d{6,}\b/i;

export interface KnowledgeIssue {
  id: string;
  level: "error" | "warning";
  message: string;
}

const CATS = new Set<string>(KNOWLEDGE_CATEGORIES);
const STATS = new Set<string>(KNOWLEDGE_STATUSES);

function applicabilityIssues(k: AuthorKnowledge): string[] {
  const a = k.applicability;
  const dims = [a.pageTypes, a.intents, a.sectionKinds, a.topics, a.entityIds].filter((d) => Array.isArray(d) && d.length);
  const out: string[] = [];
  if (!dims.length) out.push("applicability goala (fara nicio dimensiune) — un entry nu poate fi global");
  if (a.pageTypes && !a.pageTypes.every((p) => PAGE_TYPES.has(p))) out.push("pageTypes contine o valoare necunoscuta");
  if (a.sectionKinds && !a.sectionKinds.every((s) => SECTION_KINDS.has(s))) out.push("sectionKinds contine o valoare necunoscuta");
  for (const [key, arr] of [["topics", a.topics], ["entityIds", a.entityIds], ["intents", a.intents]] as const) {
    if (arr && !arr.every((v) => typeof v === "string" && v.trim().length > 0)) out.push(`${key} contine valori goale`);
  }
  return out;
}

/** Validate ONE entry. Returns errors (structural / safety) + warnings (advisory factual-risk heuristics). */
export function validateKnowledgeEntry(k: AuthorKnowledge): KnowledgeIssue[] {
  const issues: KnowledgeIssue[] = [];
  const err = (message: string) => issues.push({ id: k.id || "(fara id)", level: "error", message });
  const warn = (message: string) => issues.push({ id: k.id || "(fara id)", level: "warning", message });

  if (!k.id || !KEBAB.test(k.id)) err("id invalid (trebuie kebab-case ne-vid)");
  if (!CATS.has(k.category)) err(`categorie invalida: ${k.category}`);
  if (!STATS.has(k.status)) err(`status invalid: ${k.status}`);
  if (!isKnownAuthor(k.author)) err(`autor necunoscut: ${k.author}`);
  if (!k.title?.trim()) err("title gol");
  if (!k.content?.trim() || k.content.trim().length < 30) err("content gol sau prea scurt");
  for (const m of applicabilityIssues(k)) err(m);

  // Safety: no personal-experience claims (hard); operator-specific figures are advisory flags.
  if (k.content && PERSONAL_EXPERIENCE.test(k.content)) err("afirmatie de experienta/testare personala (interzis in knowledge)");
  if (k.content && OPERATOR_VALUE.test(k.content)) warn("posibila valoare factuala specifica (cifra/procent/licenta) — verifica; valorile apartin CmsFact, nu knowledge");

  return issues;
}

/** Validate the whole registry: per-entry issues + duplicate-id detection. */
export function validateKnowledgeRegistry(list: readonly AuthorKnowledge[] = AUTHOR_KNOWLEDGE): KnowledgeIssue[] {
  const issues: KnowledgeIssue[] = [];
  const seen = new Set<string>();
  for (const k of list) {
    if (seen.has(k.id)) issues.push({ id: k.id, level: "error", message: "id duplicat" });
    seen.add(k.id);
    issues.push(...validateKnowledgeEntry(k));
  }
  return issues;
}

/** Published, non-draft/archived entries (for later retrieval in AI-2.9B). */
export function publishedKnowledge(list: readonly AuthorKnowledge[] = AUTHOR_KNOWLEDGE): AuthorKnowledge[] {
  return list.filter((k) => k.status === "published");
}
