import { allGuides } from "./guides";
import type { GuideDetail, GuideDetailExtra } from "@/types/guide";

/** Mock guide content (replaced by real data later). */
const extras: Record<string, GuideDetailExtra> = {
  "cum-functioneaza-rulajul": {
    intro:
      "Rulajul (sau wagering) este cea mai importantă condiție a oricărui bonus de cazino. Îți explicăm cum funcționează, cum se calculează și cum să îl compari corect între oferte.",
    readingTime: "5 min",
    sections: [
      {
        id: "ce-este-rulajul",
        heading: "Ce este rulajul",
        level: 2,
        body: [
          "Rulajul reprezintă de câte ori trebuie să pariezi valoarea bonusului înainte de a putea retrage câștigurile. Un rulaj de x30 pentru un bonus de 100 RON înseamnă că trebuie să pariezi 3.000 RON.",
          "Cu cât rulajul este mai mic, cu atât bonusul este mai avantajos pentru tine.",
        ],
      },
      {
        id: "cum-se-calculeaza",
        heading: "Cum se calculează",
        level: 2,
        body: [
          "Se înmulțește valoarea bonusului cu numărul rulajului. Uneori rulajul se aplică și la depunere, nu doar la bonus, așa că citește mereu termenii ofertei.",
        ],
      },
      {
        id: "la-ce-sa-fii-atent",
        heading: "La ce să fii atent",
        level: 2,
        body: [
          "Verifică ce jocuri contribuie la rulaj și în ce procent. Sloturile contribuie de obicei 100%, în timp ce jocurile de masă contribuie mult mai puțin.",
          "Atenție și la termenul de valabilitate: rulajul trebuie îndeplinit într-un interval limitat.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Vezi toate bonusurile de cazino", href: "/bonusuri" },
      { label: "Bonus de bun venit Superbet", href: "/bonusuri-casino/superbet-bonus-bun-venit" },
      { label: "Cazinouri recomandate", href: "/cazinouri-online" },
    ],
    faq: [
      { question: "Un rulaj mai mic este mereu mai bun?", answer: "În general da, pentru că trebuie să pariezi mai puțin înainte de a retrage câștigurile din bonus." },
    ],
  },
  "ce-este-rtp": {
    intro:
      "RTP și volatilitatea sunt doi indicatori esențiali ai unui slot. Îți arătăm ce înseamnă fiecare și cum te ajută să alegi jocurile potrivite stilului tău.",
    readingTime: "6 min",
    sections: [
      {
        id: "ce-inseamna-rtp",
        heading: "Ce înseamnă RTP",
        level: 2,
        body: [
          "RTP (Return to Player) este procentul teoretic pe care un slot îl returnează jucătorilor pe termen lung. Un RTP de 96% înseamnă că, statistic, jocul returnează 96 RON din fiecare 100 RON pariați.",
          "RTP-ul este o medie calculată pe milioane de rotiri, nu o garanție pentru o sesiune individuală.",
        ],
      },
      {
        id: "volatilitate",
        heading: "Volatilitatea jocului",
        level: 2,
        body: [
          "Volatilitatea descrie cât de des și cât de mari sunt câștigurile. Volatilitatea mare oferă câștiguri rare, dar potențial mari; cea mică oferă câștiguri frecvente, dar mai mici.",
        ],
      },
      {
        id: "cum-alegi",
        heading: "Cum alegi în funcție de stil",
        level: 2,
        body: [
          "Dacă vrei sesiuni lungi și relaxate, caută sloturi cu volatilitate redusă. Dacă urmărești premii mari și accepți riscul, alege volatilitate mare și un RTP cât mai ridicat.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Toate jocurile de cazino", href: "/pacanele-online" },
      { label: "Sweet Bonanza — detalii joc", href: "/pacanele-online/sweet-bonanza" },
      { label: "Furnizorul Pragmatic Play", href: "/furnizori/pragmatic-play" },
    ],
    faq: [
      { question: "Un RTP mai mare garantează câștiguri?", answer: "Nu. RTP este o medie pe termen lung; rezultatele pe o sesiune scurtă pot varia semnificativ." },
    ],
  },
  "verificare-cont-kyc": {
    intro:
      "Verificarea contului (KYC) este un pas obligatoriu înainte de prima retragere. Îți arătăm ce documente îți trebuie și cum eviți întârzierile.",
    readingTime: "4 min",
    sections: [
      {
        id: "ce-este-kyc",
        heading: "Ce este verificarea KYC",
        level: 2,
        body: [
          "KYC (Know Your Customer) este procesul prin care cazinoul confirmă identitatea ta, conform cerințelor ONJN. Este o măsură de siguranță și anti-fraudă.",
        ],
      },
      {
        id: "documente",
        heading: "Ce documente îți trebuie",
        level: 2,
        body: [
          "De obicei ai nevoie de un act de identitate valabil, o dovadă de adresă recentă și, uneori, o dovadă a metodei de plată folosite.",
        ],
      },
      {
        id: "cat-dureaza",
        heading: "Cât durează și cum eviți întârzierile",
        level: 2,
        body: [
          "Verificarea durează de obicei între câteva ore și 24 de ore. Trimite documente clare, la zi, pentru a evita respingerea și reluarea procesului.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Cazinouri licențiate ONJN", href: "/cazinouri-online" },
      { label: "Recenzie Superbet Casino", href: "/cazinouri-online/superbet-casino" },
      { label: "Metode de plată acceptate", href: "/metode-de-plata" },
    ],
  },
  "cum-alegi-cazino-sigur": {
    intro:
      "Nu toate cazinourile online sunt la fel. Îți prezentăm criteriile care contează cu adevărat pentru o alegere sigură și de încredere.",
    readingTime: "6 min",
    sections: [
      {
        id: "licenta-onjn",
        heading: "Licența ONJN",
        level: 2,
        body: [
          "Primul și cel mai important criteriu este licența ONJN, singura autoritate care reglementează jocurile de noroc online în România. Un cazino fără licență ONJN nu oferă protecție legală.",
        ],
      },
      {
        id: "retrageri-reputatie",
        heading: "Retrageri și reputație",
        level: 2,
        body: [
          "Verifică viteza retragerilor și experiențele altor jucători. Un cazino bun procesează retragerile rapid și comunică transparent condițiile.",
        ],
      },
      {
        id: "metode-si-suport",
        heading: "Metode de plată și suport",
        level: 2,
        body: [
          "Alege un cazino cu metode de plată de încredere și un suport disponibil, de preferat 24/7. Aceste detalii fac diferența în experiența reală.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Compară cazinourile online", href: "/cazinouri-online" },
      { label: "Recenzie Superbet Casino", href: "/cazinouri-online/superbet-casino" },
      { label: "Plata cu Visa la cazinouri", href: "/metode-de-plata/visa" },
    ],
    faq: [
      { question: "Cum verific dacă un cazino are licență ONJN?", answer: "Operatorii licențiați afișează licența ONJN în subsolul site-ului, iar lista oficială este publicată de ONJN." },
    ],
  },
  "ghid-bonus-bun-venit": {
    intro:
      "Bonusul de bun venit este cea mai căutată ofertă pentru jucătorii noi. Îți arătăm cum să compari ofertele și cum să îi maximizezi valoarea reală.",
    readingTime: "5 min",
    sections: [
      {
        id: "ce-conteaza",
        heading: "Ce contează cu adevărat",
        level: 2,
        body: [
          "Valoarea maximă a bonusului este importantă, dar la fel de important este rulajul. Un bonus mai mic cu rulaj redus poate valora mai mult decât unul mare cu rulaj ridicat.",
        ],
      },
      {
        id: "rotiri-si-termeni",
        heading: "Rotiri gratuite și termeni",
        level: 2,
        body: [
          "Multe bonusuri includ rotiri gratuite. Verifică pe ce sloturi se aplică și ce rulaj au câștigurile din ele.",
        ],
      },
      {
        id: "cum-maximizezi",
        heading: "Cum maximizezi valoarea",
        level: 2,
        body: [
          "Citește termenii, alege jocuri care contribuie 100% la rulaj și respectă termenul de valabilitate. Așa transformi bonusul într-un avantaj real.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Toate bonusurile de bun venit", href: "/bonusuri" },
      { label: "Bonus de bun venit Betano", href: "/bonusuri-casino/betano-bonus-bun-venit" },
      { label: "Cazinouri recomandate", href: "/cazinouri-online" },
    ],
  },
  "metode-plata-rapide": {
    intro:
      "Viteza retragerii depinde în mare măsură de metoda de plată aleasă. Comparăm cardurile, portofelele electronice și plățile mobile.",
    readingTime: "4 min",
    sections: [
      {
        id: "portofele-electronice",
        heading: "Portofelele electronice sunt cele mai rapide",
        level: 2,
        body: [
          "Skrill și Neteller oferă de obicei cele mai rapide retrageri, procesate în câteva ore până la 24 de ore.",
        ],
      },
      {
        id: "carduri",
        heading: "Cardurile sunt comode, dar mai lente",
        level: 2,
        body: [
          "Visa și Mastercard sunt acceptate aproape peste tot, însă retragerile pot dura 1 până la 3 zile lucrătoare din cauza procesării bancare.",
        ],
      },
      {
        id: "plati-mobile",
        heading: "Plăți mobile și preplătite",
        level: 2,
        body: [
          "Apple Pay este excelent pentru depuneri rapide, iar Paysafecard este ideal pentru control al bugetului, dar nu permite retrageri.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Toate metodele de plată", href: "/metode-de-plata" },
      { label: "Retrageri rapide cu Skrill", href: "/metode-de-plata/skrill" },
      { label: "Cazinouri cu retrageri rapide", href: "/cazinouri-online" },
    ],
  },
};

export function getGuideDetail(slug: string): GuideDetail | null {
  const base = allGuides.find((g) => g.slug === slug);
  const extra = extras[slug];
  if (!base || !extra) return null;
  return { ...base, ...extra };
}

export function getAllGuideSlugs(): string[] {
  return allGuides.filter((g) => extras[g.slug]).map((g) => g.slug);
}
