import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalPage } from "@/components/layout/InstitutionalPage";
import { institutionalMetadata } from "@/lib/institutional";
import { pageSchema } from "@/lib/schema";

export const metadata: Metadata = institutionalMetadata({
  slug: "cum-evaluam-cazinourile",
  title: "Cum evaluam cazinourile, bonusurile si jocurile",
  description:
    "Metodologia CasinOnline.ro pe categorii: cazinouri, bonusuri, jocuri, furnizori si metode de plata. Criterii clare, licenta ONJN si termeni verificati.",
});

const CATEGORIES: { id: string; heading: string; intro: string; criteria: string[] }[] = [
  {
    id: "cazinouri",
    heading: "Cazinouri online",
    intro: "Pentru fiecare cazino urmarim aceleasi aspecte, ca sa poata fi comparate corect:",
    criteria: [
      "Licenta ONJN si valabilitatea ei",
      "Siguranta si transparenta operatorului",
      "Bonusuri si conditiile aferente",
      "Oferta de jocuri si furnizorii disponibili",
      "Metode de plata acceptate",
      "Retrageri, limite si timpi de procesare",
      "Suport clienti (canale si disponibilitate)",
      "Experienta pe desktop si pe mobil",
      "Reputatie si informatii publice disponibile",
    ],
  },
  {
    id: "bonusuri",
    heading: "Bonusuri casino",
    intro: "La bonusuri ne uitam dincolo de titlu, la termenii care conteaza cu adevarat:",
    criteria: [
      "Tipul bonusului",
      "Valoarea promotionala reala",
      "Cerintele de rulaj",
      "Valabilitatea ofertei",
      "Jocurile eligibile",
      "Conditiile de verificare a identitatii (KYC)",
      "Limitele de castig",
      "Alte restrictii relevante",
    ],
  },
  {
    id: "jocuri",
    heading: "Jocuri casino",
    intro: "Prezentam jocurile pe baza informatiilor oficiale disponibile:",
    criteria: [
      "Furnizorul jocului",
      "RTP, atunci cand exista informatii oficiale",
      "Volatilitatea, atunci cand este documentata",
      "Mecanica jocului",
      "Functiile speciale",
      "Disponibilitatea la operatori licentiati",
    ],
  },
  {
    id: "furnizori",
    heading: "Furnizori",
    intro: "Pentru furnizori analizam produsul si prezenta pe piata:",
    criteria: [
      "Portofoliul de jocuri",
      "Caracteristicile produselor",
      "Certificarile verificabile",
      "Disponibilitatea in Romania",
      "Informatiile tehnice relevante",
    ],
  },
  {
    id: "metode-de-plata",
    heading: "Metode de plata",
    intro: "La metodele de plata conteaza accesul, costul si viteza:",
    criteria: [
      "Disponibilitatea la operatorii licentiati",
      "Depuneri si retrageri",
      "Limite minime si maxime",
      "Comisioane",
      "Timpi de procesare",
      "Securitate",
      "Restrictii relevante",
    ],
  },
];

function Category({ heading, intro, criteria }: { heading: string; intro: string; criteria: string[] }) {
  return (
    <section className="flex flex-col gap-2 scroll-mt-24">
      <h2 className="text-xl font-bold text-ink md:text-2xl">{heading}</h2>
      <p className="max-w-[72ch] leading-relaxed text-ink-secondary">{intro}</p>
      <ul className="flex max-w-[72ch] flex-col gap-1.5">
        {criteria.map((c) => (
          <li key={c} className="flex gap-2 leading-relaxed text-ink-secondary">
            <span className="text-ink-muted">·</span>
            <span>{c}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Page() {
  return (
    <InstitutionalPage
      slug="cum-evaluam-cazinourile"
      title="Cum evaluam cazinourile, bonusurile si jocurile"
      intro="Analizam cazinouri, bonusuri, jocuri, furnizori si metode de plata dupa criterii clare si constante, ca sa poti compara usor."
      schema={pageSchema("WebPage", {
        name: "Metodologia de evaluare CasinOnline.ro",
        description: "Criteriile dupa care analizam cazinouri, bonusuri, jocuri, furnizori si metode de plata.",
        path: "/cum-evaluam-cazinourile",
      })}
    >
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-bold text-ink md:text-2xl">Principii de evaluare</h2>
          <p className="max-w-[72ch] leading-relaxed text-ink-secondary">
            Evaluam fiecare categorie dupa aceleasi criterii, folosind informatii oficiale si verificabile.
            Prezentam atat punctele forte, cat si limitele. Prioritatea noastra este utilitatea reala pentru jucator.
          </p>
        </section>

        {CATEGORIES.map((c) => (
          <Category key={c.id} heading={c.heading} intro={c.intro} criteria={c.criteria} />
        ))}

        <section className="flex flex-col gap-2 scroll-mt-24">
          <h2 className="text-xl font-bold text-ink md:text-2xl">Scorul editorial</h2>
          <p className="max-w-[72ch] leading-relaxed text-ink-secondary">
            Scorurile afisate in recenzii sunt evaluari editoriale ale echipei, acordate pe baza criteriilor de mai
            sus. Nu sunt rezultatul unei formule automate cu ponderi numerice fixe. Afisam un scor doar dupa ce analiza
            respectiva a fost realizata si verificata; nu publicam scoruri fara o evaluare efectiva in spate.
          </p>
        </section>

        <nav aria-label="Pagini utile" className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm text-link">
          <Link href="/politica-editoriala" className="hover:text-link-hover">Politica editoriala</Link>
          <Link href="/licente-si-reglementare" className="hover:text-link-hover">Licente si reglementare</Link>
          <Link href="/autori" className="hover:text-link-hover">Echipa editoriala</Link>
        </nav>
      </div>
    </InstitutionalPage>
  );
}
