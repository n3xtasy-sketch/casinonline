import { allCasinos } from "./casinos";
import type { CasinoDetail, CasinoDetailExtra } from "@/types/casino";

/** Mock review detail per casino (replaced by real data later). */
const extras: Record<string, CasinoDetailExtra> = {
  "superbet-casino": {
    intro:
      "Superbet Casino este unul dintre cele mai cunoscute brand-uri din România, cu o ofertă de jocuri bogată, retrageri rapide și o aplicație mobilă solidă.",
    pros: ["Retrageri rapide (1–2 ore)", "Bibliotecă mare de sloturi", "Aplicație mobilă excelentă"],
    cons: ["Rulaj puțin mai ridicat la bonus", "Fără secțiune dedicată crypto"],
    editorReview:
      "Superbet rămâne o alegere sigură: licențiat ONJN, cu plăți rapide și suport de calitate. Bonusul de bun venit este competitiv, iar experiența pe mobil este printre cele mai bune de pe piață.",
    editorScore: 9.2,
    minDeposit: "20 RON",
    withdrawalTime: "1–2 ore",
    kyc: "Rapidă (24h)",
    support: "Chat 24/7, email",
    mobile: "Aplicație iOS & Android",
    paymentMethods: ["Visa", "Mastercard", "Skrill", "Neteller", "Apple Pay"],
    faq: [
      { question: "Este Superbet Casino licențiat în România?", answer: "Da, Superbet deține licență ONJN pentru jocuri de noroc online în România." },
      { question: "Cât durează o retragere?", answer: "De regulă între 1 și 2 ore pentru portofele electronice, după verificarea contului." },
    ],
  },
  "betano-casino": {
    intro:
      "Betano Casino combină o secțiune de cazino modernă cu promoții frecvente și o gamă largă de furnizori de top.",
    pros: ["Promoții frecvente", "Interfață modernă", "Furnizori de top"],
    cons: ["Retrageri ceva mai lente", "Verificare uneori mai strictă"],
    editorReview:
      "Betano impresionează prin design și prin varietatea promoțiilor. Retragerile sunt de încredere, chiar dacă nu cele mai rapide din clasă.",
    editorScore: 9.0,
    minDeposit: "20 RON",
    withdrawalTime: "2–4 ore",
    kyc: "Standard",
    support: "Chat 24/7",
    mobile: "Aplicație & web mobil",
    paymentMethods: ["Visa", "Mastercard", "Skrill", "Neteller"],
    faq: [
      { question: "Ce bonus oferă Betano noilor jucători?", answer: "Un bonus de bun venit la prima depunere, plus rotiri gratuite — vezi oferta curentă pentru detalii și termeni." },
    ],
  },
  "unibet-casino": {
    intro:
      "Unibet Casino se remarcă prin oferta fără depunere pentru jucătorii noi și printr-un portofoliu internațional matur.",
    pros: ["Bonus fără depunere", "Brand internațional de încredere", "Secțiune live bogată"],
    cons: ["Retrageri mai lente (până la 24h)", "Rulaj la bonusul fără depunere"],
    editorReview:
      "Unibet este ideal pentru cei care vor să testeze fără risc datorită bonusului fără depunere. Experiența live este un punct forte.",
    editorScore: 8.8,
    minDeposit: "40 RON",
    withdrawalTime: "până la 24 ore",
    kyc: "Standard",
    support: "Chat, email",
    mobile: "Aplicație & web mobil",
    paymentMethods: ["Visa", "Mastercard", "Skrill", "Paysafecard"],
  },
  "winbet-casino": {
    intro:
      "Winbet Casino atrage prin oferte generoase de rotiri gratuite și o experiență prietenoasă pentru începători.",
    pros: ["Multe rotiri gratuite", "Ușor de folosit", "Retrageri rapide"],
    cons: ["Catalog de jocuri mai mic", "Mai puține metode de plată"],
    editorReview:
      "Winbet este o opțiune bună pentru fanii sloturilor, cu promoții de rotiri atractive și plăți prompte.",
    editorScore: 8.5,
    minDeposit: "20 RON",
    withdrawalTime: "1–3 ore",
    kyc: "Rapidă",
    support: "Chat 24/7",
    mobile: "Web mobil optimizat",
    paymentMethods: ["Visa", "Mastercard", "Skrill"],
  },
  "netbet-casino": {
    intro:
      "NetBet Casino oferă un echilibru bun între sloturi, jocuri live și promoții recurente pentru jucătorii fideli.",
    pros: ["Program de loialitate", "Varietate de jocuri", "Suport prietenos"],
    cons: ["Design puțin încărcat", "Retrageri de viteză medie"],
    editorReview:
      "NetBet este un cazino echilibrat, potrivit pentru jucătorii care apreciază programele de loialitate și o ofertă variată.",
    editorScore: 8.3,
    minDeposit: "20 RON",
    withdrawalTime: "2–6 ore",
    kyc: "Standard",
    support: "Chat, email",
    mobile: "Aplicație & web mobil",
    paymentMethods: ["Visa", "Mastercard", "Skrill", "Neteller"],
  },
  "vlad-casino": {
    intro:
      "Vlad Casino mizează pe retrageri rapide și pe o selecție solidă de sloturi românești populare.",
    pros: ["Retrageri rapide", "Sloturi populare în RO", "Interfață simplă"],
    cons: ["Fără aplicație dedicată", "Promoții mai puține"],
    editorReview:
      "Vlad Casino este o alegere bună pentru cei care pun preț pe viteza retragerilor și pe jocurile clasice.",
    editorScore: 8.1,
    minDeposit: "25 RON",
    withdrawalTime: "1–2 ore",
    kyc: "Standard",
    support: "Chat",
    mobile: "Web mobil",
    paymentMethods: ["Visa", "Mastercard", "Skrill"],
  },
  "las-vegas-casino": {
    intro:
      "Las Vegas Casino oferă pachete de bun venit generoase și un catalog amplu de sloturi și jocuri de masă.",
    pros: ["Pachet de bun venit mare", "Catalog amplu de jocuri", "Multe rotiri gratuite"],
    cons: ["Retrageri mai lente", "Rulaj ridicat la pachet"],
    editorReview:
      "Las Vegas Casino este potrivit pentru jucătorii care caută un pachet de bun venit consistent și o varietate mare de jocuri.",
    editorScore: 7.9,
    minDeposit: "20 RON",
    withdrawalTime: "3–8 ore",
    kyc: "Standard",
    support: "Chat, email",
    mobile: "Web mobil",
    paymentMethods: ["Visa", "Mastercard", "Neteller", "Paysafecard"],
  },
  "maxbet-casino": {
    intro:
      "MaxBet Casino vine cu un bonus fără depunere pentru începători și cu branding puternic în zona de agenții.",
    pros: ["Bonus fără depunere", "Brand recunoscut", "Sloturi populare"],
    cons: ["Catalog live mai mic", "Retrageri de viteză medie"],
    editorReview:
      "MaxBet este o opțiune bună pentru începători datorită bonusului fără depunere și a interfeței accesibile.",
    editorScore: 7.7,
    minDeposit: "20 RON",
    withdrawalTime: "2–5 ore",
    kyc: "Standard",
    support: "Chat",
    mobile: "Aplicație & web mobil",
    paymentMethods: ["Visa", "Mastercard", "Skrill"],
  },
};

export function getCasinoDetail(slug: string): CasinoDetail | null {
  const base = allCasinos.find((c) => c.slug === slug);
  const extra = extras[slug];
  if (!base || !extra) return null;
  return { ...base, ...extra };
}

export function getAllCasinoSlugs(): string[] {
  return allCasinos.filter((c) => extras[c.slug]).map((c) => c.slug);
}
