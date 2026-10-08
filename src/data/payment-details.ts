import { allPaymentMethods } from "./payments";
import type { PaymentMethodDetail, PaymentMethodDetailExtra } from "@/types/payment";

/** Mock payment method detail (replaced by real data later). */
const extras: Record<string, PaymentMethodDetailExtra> = {
  visa: {
    intro:
      "Visa este cea mai folosită metodă de plată în cazinourile online din România, acceptată practic în toate cazinourile licențiate ONJN.",
    deposits:
      "Depunerile cu Visa sunt instantanee: introduci datele cardului, confirmi plata prin 3D Secure și fondurile apar imediat în cont.",
    withdrawals:
      "Retragerile pe Visa sunt disponibile la majoritatea cazinourilor, însă procesarea bancară poate dura între 1 și 3 zile lucrătoare.",
    depositSpeed: "Instant",
    withdrawalSpeed: "1 – 3 zile",
    fees: "Fără comisioane",
    minLimit: "20 RON",
    maxLimit: "50.000 RON",
    pros: ["Acceptată aproape peste tot", "Depuneri instantanee", "Securitate 3D Secure"],
    cons: ["Retrageri mai lente decât e-wallet", "Unele bănci pot bloca tranzacțiile"],
    faq: [
      { question: "Pot retrage bani pe cardul Visa?", answer: "Da, majoritatea cazinourilor permit retrageri pe Visa, dar procesarea bancară durează 1 – 3 zile lucrătoare." },
    ],
  },
  mastercard: {
    intro:
      "Mastercard este, alături de Visa, una dintre cele mai răspândite metode de plată prin card în cazinourile online.",
    deposits:
      "Depunerile cu Mastercard sunt instantanee și confirmate prin 3D Secure, la fel ca în cazul Visa.",
    withdrawals:
      "Retragerile sunt acceptate la multe cazinouri, cu procesare bancară standard de 1 – 3 zile lucrătoare.",
    depositSpeed: "Instant",
    withdrawalSpeed: "1 – 3 zile",
    fees: "Fără comisioane",
    minLimit: "20 RON",
    maxLimit: "50.000 RON",
    pros: ["Acceptare foarte largă", "Depuneri instantanee", "Securitate ridicată"],
    cons: ["Retrageri mai lente", "Posibile restricții bancare"],
  },
  skrill: {
    intro:
      "Skrill este un portofel electronic popular pentru cazinouri, apreciat pentru retrageri rapide și un nivel bun de confidențialitate.",
    deposits:
      "Depunerile cu Skrill sunt instantanee. Îți alimentezi contul Skrill, apoi transferi către cazinou fără a expune datele cardului.",
    withdrawals:
      "Retragerile pe Skrill sunt printre cele mai rapide, de obicei procesate în câteva ore până la 24 de ore.",
    depositSpeed: "Instant",
    withdrawalSpeed: "Câteva ore – 24h",
    fees: "Posibile comisioane mici",
    minLimit: "20 RON",
    maxLimit: "40.000 RON",
    pros: ["Retrageri foarte rapide", "Confidențialitate ridicată", "Nu expui datele cardului"],
    cons: ["Nu toate cazinourile îl acceptă", "Comisioane mici la unele operațiuni"],
    faq: [
      { question: "Cât durează o retragere pe Skrill?", answer: "De regulă între câteva ore și 24 de ore, mult mai rapid decât retragerile pe card." },
    ],
  },
  neteller: {
    intro:
      "Neteller este un portofel electronic similar cu Skrill, folosit frecvent pentru tranzacții rapide la cazinourile online.",
    deposits:
      "Depunerile cu Neteller sunt instantanee și nu necesită partajarea datelor bancare cu cazinoul.",
    withdrawals:
      "Retragerile sunt procesate rapid, de obicei în aceeași zi sau în maximum 24 de ore.",
    depositSpeed: "Instant",
    withdrawalSpeed: "Câteva ore – 24h",
    fees: "Posibile comisioane mici",
    minLimit: "20 RON",
    maxLimit: "40.000 RON",
    pros: ["Retrageri rapide", "Securitate bună", "Ideal pentru tranzacții frecvente"],
    cons: ["Disponibilitate mai redusă decât cardurile", "Posibile comisioane"],
  },
  "apple-pay": {
    intro:
      "Apple Pay permite depuneri rapide și sigure direct de pe dispozitivele Apple, folosind autentificarea biometrică.",
    deposits:
      "Depunerile se fac instantaneu, cu confirmare prin Face ID sau Touch ID, fără a introduce manual datele cardului.",
    withdrawals:
      "Apple Pay este în principal o metodă de depunere; pentru retrageri se folosește de obicei cardul asociat.",
    depositSpeed: "Instant",
    withdrawalSpeed: "Prin cardul asociat (1 – 3 zile)",
    fees: "Fără comisioane",
    minLimit: "20 RON",
    maxLimit: "50.000 RON",
    pros: ["Depuneri foarte rapide", "Securitate biometrică", "Comod pe iPhone"],
    cons: ["Doar pe dispozitive Apple", "Retragerile se fac pe card"],
  },
  paysafecard: {
    intro:
      "Paysafecard este o metodă preplătită care îți permite să depui fără cont bancar sau card, folosind un cod cumpărat în numerar.",
    deposits:
      "Cumperi un voucher Paysafecard, introduci codul PIN la cazinou și fondurile sunt disponibile instant.",
    withdrawals:
      "Paysafecard este o metodă exclusiv de depunere; retragerile se fac printr-o metodă alternativă (card sau e-wallet).",
    depositSpeed: "Instant",
    withdrawalSpeed: "Indisponibil (doar depunere)",
    fees: "Fără comisioane la depunere",
    minLimit: "10 RON",
    maxLimit: "5.000 RON",
    pros: ["Nu necesită cont bancar", "Control bun al bugetului", "Depuneri instantanee"],
    cons: ["Nu se pot face retrageri", "Limite de depunere mai mici"],
    faq: [
      { question: "Pot retrage bani cu Paysafecard?", answer: "Nu, Paysafecard este doar pentru depuneri. Retragerile se fac printr-o altă metodă, precum cardul sau un portofel electronic." },
    ],
  },
};

export function getPaymentMethodDetail(slug: string): PaymentMethodDetail | null {
  const base = allPaymentMethods.find((m) => m.slug === slug);
  const extra = extras[slug];
  if (!base || !extra) return null;
  return { ...base, ...extra };
}

export function getAllPaymentSlugs(): string[] {
  return allPaymentMethods.filter((m) => extras[m.slug]).map((m) => m.slug);
}
