/**
 * Static author registry for CasinOnline.ro (no DB, no migration). Separate from the
 * institutional registry so individual author pages are NOT auto-linked in the Footer
 * (only the /autori hub is). Each author has a `ready` gate: an author page is served
 * and listed only when ready. Content is factual, sourced from the team's documented
 * public profiles — no invented studies, certifications, awards, or test results, and
 * nothing attributing prior work to CasinOnline (a new site).
 */

export interface AuthorRecord {
  slug: string;
  name: string;
  /** Editorial role shown as the subtitle + Person.jobTitle. */
  role: string;
  /** One-line tagline for the /autori hub card. */
  tagline: string;
  /** Bio paragraphs (original, from documented facts). */
  bio: string[];
  /** Documented professional experience (fact bullets). */
  experience: string[];
  /** Documented education — omit when not publicly documented (do not invent). */
  education?: string[];
  languages?: string[];
  /** Content areas / specializations → Person.knowsAbout. */
  specializations: string[];
  /** Live gate: individual page is 404 + absent from /autori + sitemap when false. */
  ready: boolean;
}

export const AUTHORS: AuthorRecord[] = [
  {
    slug: "radu-bogdan-gabriel",
    name: "Radu Bogdan Gabriel",
    role: "Autor · Expert cazinouri online si bonusuri",
    tagline: "Autor specializat in cazinouri online, bonusuri si afiliere iGaming.",
    bio: [
      "Radu Bogdan Gabriel este autorul principal al continutului despre cazinouri si bonusuri de pe CasinOnline.ro. Are experienta in industria de gambling online din Romania, cu accent pe SEO, marketing digital si continut pentru operatori licentiati ONJN.",
      "Si-a inceput activitatea in iGaming in suportul VIP pentru jucatori, unde a lucrat direct cu conturi de jucatori, bonusuri personalizate si rezolvarea sesizarilor. Ulterior s-a specializat in SEO si strategie de continut pentru piata de cazinouri online, inclusiv pe programe de afiliere cu operatori licentiati.",
      "La CasinOnline.ro redacteaza recenziile de cazinouri si analizele de bonusuri, aplicand metodologia editoriala a platformei. Materialele sale sunt verificate inainte de publicare.",
    ],
    experience: [
      "Suport VIP pentru jucatori la un operator de jocuri de noroc (2019 - 2021)",
      "SEO si strategie de continut pentru proiecte din industria cazinourilor online (din 2021)",
      "Experienta in programe de afiliere cu operatori licentiati ONJN",
    ],
    education: [
      "Marketing, Academia de Studii Economice (ASE) Bucuresti",
      "Studii internationale, Universitatea din Udine, Italia",
    ],
    languages: ["Romana", "Engleza", "Italiana"],
    specializations: [
      "Recenzii de cazinouri online",
      "Bonusuri si termeni promotionali",
      "SEO si continut iGaming",
      "Conformitate si licentiere ONJN",
    ],
    ready: true,
  },
  {
    slug: "radu-teodora-bianca",
    name: "Radu Teodora Bianca",
    role: "Verificator editorial · Expert marketing digital si afiliere",
    tagline: "Verificator de continut cu experienta in marketing digital si afiliere iGaming.",
    bio: [
      "Radu Teodora Bianca este verificatorul editorial al CasinOnline.ro. Revizuieste materialele inainte de publicare, pentru a verifica acuratetea informatiilor si respectarea standardelor editoriale ale platformei.",
      "Are experienta in marketing digital si in relatii cu operatori din industria iGaming, cu activitate la Green Tree Marketing, unde coordoneaza proiecte si parteneriate. Provine dintr-un background de comunicare si relatii publice si a lucrat pe proiecte internationale.",
    ],
    experience: [
      "Experienta in marketing digital",
      "Activitate la Green Tree Marketing (coordonare proiecte si parteneriate)",
      "Experienta pe proiecte internationale",
      "Rol de editor si verificator de continut",
    ],
    specializations: [
      "Marketing digital",
      "Afiliere iGaming",
      "Relatii cu operatori",
      "Verificare si revizuire editoriala",
    ],
    ready: true,
  },
];

export function authorBySlug(slug: string): AuthorRecord | undefined {
  return AUTHORS.find((a) => a.slug === slug);
}

/** Authors whose individual page is live — the ONLY ones shown on /autori + in the sitemap. */
export function readyAuthors(): AuthorRecord[] {
  return AUTHORS.filter((a) => a.ready);
}
