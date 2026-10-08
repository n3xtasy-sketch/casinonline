import { allBonuses } from "./bonuses";
import type { BonusDetail, BonusDetailExtra } from "@/types/bonus";

/** Mock bonus detail (replaced by real data later). */
const extras: Record<string, BonusDetailExtra> = {
  "superbet-bonus-bun-venit": {
    intro:
      "Bonusul de bun venit Superbet dublează prima depunere până la 1.000 RON și adaugă 100 de rotiri gratuite, un pachet competitiv pentru jucătorii noi.",
    minDeposit: "20 RON",
    validity: "30 de zile",
    terms: [
      "Bonusul se acordă la prima depunere, cu un minim de 20 RON.",
      "Rulajul este de x35 pe suma bonusului.",
      "Rotirile gratuite se acordă pe un slot selectat de cazinou.",
      "Oferta este disponibilă o singură dată per cont.",
    ],
    pros: ["Procent de 100%", "100 rotiri gratuite incluse", "Depunere minimă accesibilă"],
    cons: ["Rulaj de x35", "Rotirile sunt limitate la un singur joc"],
    howToClaim: [
      "Creează un cont nou la Superbet Casino.",
      "Introdu codul promo SB100 dacă este solicitat.",
      "Efectuează prima depunere de minimum 20 RON.",
      "Bonusul și rotirile se adaugă automat în cont.",
    ],
    faq: [
      { question: "Ce rulaj are bonusul de bun venit Superbet?", answer: "Rulajul este de x35 pe suma bonusului, care trebuie îndeplinit în 30 de zile." },
    ],
  },
  "betano-bonus-bun-venit": {
    intro:
      "Betano oferă unul dintre cele mai mari bonusuri de bun venit din România, 100% până la 1.500 RON plus 150 de rotiri gratuite.",
    minDeposit: "20 RON",
    validity: "30 de zile",
    terms: [
      "Bonus de 100% la prima depunere, până la 1.500 RON.",
      "Rulaj de x35 pe valoarea bonusului.",
      "Rotirile gratuite se acordă etapizat.",
    ],
    pros: ["Valoare maximă mare (1.500 RON)", "150 rotiri gratuite", "Brand de încredere"],
    cons: ["Rulaj de x35", "Rotirile se acordă treptat"],
    howToClaim: [
      "Înregistrează un cont la Betano Casino.",
      "Accesează secțiunea de bonusuri și optează pentru oferta de cazino.",
      "Depune minimum 20 RON.",
      "Bonusul se activează automat.",
    ],
  },
  "unibet-fara-depunere": {
    intro:
      "Unibet oferă un bonus fără depunere de 50 RON, ideal pentru a testa cazinoul fără niciun risc financiar.",
    minDeposit: "Nu este necesară",
    validity: "7 zile",
    terms: [
      "Bonusul se acordă după verificarea contului.",
      "Rulaj de x30 pe suma bonusului.",
      "Câștigurile din bonus pot avea o limită de retragere.",
    ],
    pros: ["Nu necesită depunere", "Risc zero pentru testare", "Verificare rapidă"],
    cons: ["Valabilitate scurtă (7 zile)", "Posibilă limită de retragere"],
    howToClaim: [
      "Creează un cont nou la Unibet Casino.",
      "Verifică-ți identitatea (KYC).",
      "Bonusul de 50 RON se adaugă automat în cont.",
    ],
    faq: [
      { question: "Trebuie să depun bani pentru acest bonus?", answer: "Nu, bonusul fără depunere Unibet se acordă doar pe baza verificării contului." },
    ],
  },
  "winbet-rotiri-gratuite": {
    intro:
      "Winbet răsplătește jucătorii noi cu 200 de rotiri gratuite la prima depunere, o ofertă excelentă pentru fanii sloturilor.",
    minDeposit: "20 RON",
    validity: "14 zile",
    terms: [
      "200 rotiri gratuite la prima depunere de minimum 20 RON.",
      "Rulaj de x40 pe câștigurile din rotiri.",
      "Rotirile se acordă pe sloturi selectate.",
    ],
    pros: ["200 rotiri gratuite", "Depunere minimă mică", "Ideal pentru sloturi"],
    cons: ["Rulaj de x40", "Rotiri limitate la anumite jocuri"],
    howToClaim: [
      "Înregistrează-te la Winbet Casino.",
      "Depune minimum 20 RON.",
      "Cele 200 de rotiri se adaugă automat.",
    ],
  },
  "netbet-cashback": {
    intro:
      "Bonusul de cashback NetBet îți returnează 10% din pierderile săptămânale, oferind o plasă de siguranță constantă.",
    minDeposit: "20 RON",
    validity: "Săptămânal",
    terms: [
      "Se calculează 10% din pierderile nete ale săptămânii.",
      "Rulaj minim (x1) înainte de retragere.",
      "Cashback-ul se acordă în fiecare luni.",
    ],
    pros: ["Rulaj foarte mic (x1)", "Recompensă recurentă", "Reduce pierderile"],
    cons: ["Se bazează pe pierderi", "Procent moderat (10%)"],
    howToClaim: [
      "Joacă normal la NetBet Casino în timpul săptămânii.",
      "Cashback-ul se calculează automat pe pierderile nete.",
      "Suma este creditată lunea următoare.",
    ],
    faq: [
      { question: "Cum se calculează cashback-ul?", answer: "Se aplică 10% pe pierderile nete din săptămâna anterioară, creditate automat în fiecare luni." },
    ],
  },
  "vlad-bonus-bun-venit": {
    intro:
      "Vlad Casino oferă un bonus de bun venit de 75% până la 1.200 RON, cu condiții de rulaj prietenoase.",
    minDeposit: "25 RON",
    validity: "30 de zile",
    terms: [
      "Bonus de 75% la prima depunere, până la 1.200 RON.",
      "Rulaj de x30 pe valoarea bonusului.",
    ],
    pros: ["Rulaj accesibil (x30)", "Valoare maximă bună", "Retrageri rapide"],
    cons: ["Procent mai mic (75%)", "Fără rotiri incluse"],
    howToClaim: [
      "Creează un cont la Vlad Casino.",
      "Depune minimum 25 RON.",
      "Bonusul se activează automat.",
    ],
  },
  "las-vegas-rotiri-gratuite": {
    intro:
      "Las Vegas Casino oferă 150 de rotiri gratuite la înregistrare și prima depunere, pentru un start plin de jocuri.",
    minDeposit: "20 RON",
    validity: "14 zile",
    terms: [
      "150 rotiri gratuite la prima depunere.",
      "Rulaj de x35 pe câștigurile din rotiri.",
    ],
    pros: ["150 rotiri gratuite", "Depunere minimă mică", "Catalog amplu de sloturi"],
    cons: ["Rulaj de x35", "Valabilitate de 14 zile"],
    howToClaim: [
      "Înregistrează-te la Las Vegas Casino.",
      "Depune minimum 20 RON.",
      "Rotirile se adaugă automat în cont.",
    ],
  },
  "maxbet-fara-depunere": {
    intro:
      "MaxBet oferă 25 RON fără depunere pentru jucătorii noi, o metodă simplă de a încerca platforma gratuit.",
    minDeposit: "Nu este necesară",
    validity: "7 zile",
    terms: [
      "Bonusul se acordă după verificarea contului.",
      "Rulaj de x40 pe suma bonusului.",
    ],
    pros: ["Nu necesită depunere", "Testare gratuită", "Brand recunoscut"],
    cons: ["Rulaj ridicat (x40)", "Valabilitate scurtă"],
    howToClaim: [
      "Creează un cont la MaxBet Casino.",
      "Verifică-ți contul.",
      "Cei 25 RON se adaugă automat.",
    ],
  },
  "betano-fara-rulaj": {
    intro:
      "Bonusul fără rulaj Betano îți oferă 200 RON pe care îi poți retrage imediat, fără condiții de rulaj.",
    minDeposit: "50 RON",
    validity: "30 de zile",
    terms: [
      "Bonus de 200 RON fără cerință de rulaj.",
      "Câștigurile pot fi retrase imediat.",
      "Depunere minimă de 50 RON.",
    ],
    pros: ["Fără rulaj", "Retragere imediată a câștigurilor", "Transparent"],
    cons: ["Depunere minimă mai mare", "Valoare fixă"],
    howToClaim: [
      "Înregistrează-te la Betano Casino.",
      "Depune minimum 50 RON.",
      "Bonusul fără rulaj se adaugă automat.",
    ],
    faq: [
      { question: "Ce înseamnă bonus fără rulaj?", answer: "Înseamnă că poți retrage câștigurile obținute din bonus imediat, fără a trebui să pariezi suma de un anumit număr de ori." },
    ],
  },
};

export function getBonusDetail(slug: string): BonusDetail | null {
  const base = allBonuses.find((b) => b.slug === slug);
  const extra = extras[slug];
  if (!base || !extra) return null;
  return { ...base, ...extra };
}

export function getAllBonusSlugs(): string[] {
  return allBonuses.filter((b) => extras[b.slug]).map((b) => b.slug);
}
