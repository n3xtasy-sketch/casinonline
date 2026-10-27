import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalPage } from "@/components/layout/InstitutionalPage";
import { institutionalMetadata } from "@/lib/institutional";
import { pageSchema } from "@/lib/schema";
import { company } from "@/lib/company";
import type { GuideSection } from "@/types/guide";

// ready:false in the registry → 404 until legal review confirms the liability,
// governing-law and dispute-resolution clauses. Copy below uses confirmed facts +
// lawful general phrasing only; no fabricated legal specifics.
export const metadata: Metadata = institutionalMetadata({
  slug: "termeni-si-conditii",
  title: "Termeni si conditii — CasinOnline.ro",
  description:
    "Termenii de utilizare a CasinOnline.ro: rolul de platforma de informare si afiliere, continut informativ, linkuri catre terti si limitarea raspunderii.",
});

const sections: GuideSection[] = [
  {
    id: "despre-termeni",
    heading: "Despre acesti termeni",
    level: 2,
    body: [
      "Acesti termeni reglementeaza utilizarea site-ului CasinOnline.ro. Prin accesarea si folosirea site-ului, esti de acord cu ei. Daca nu esti de acord, te rugam sa nu folosesti site-ul.",
    ],
  },
  {
    id: "ce-este",
    heading: "Ce este CasinOnline.ro",
    level: 2,
    body: [
      `CasinOnline.ro este o platforma de informare si afiliere, operata de ${company.legalName}. Prezentam informatii despre cazinouri online, bonusuri, jocuri, furnizori si metode de plata.`,
      "Nu suntem operator de jocuri de noroc. Nu organizam jocuri sau pariuri si nu acceptam depuneri sau mize.",
    ],
  },
  {
    id: "utilizare",
    heading: "Utilizarea site-ului",
    level: 2,
    body: [
      "Site-ul este destinat persoanelor de peste 18 ani. Te angajezi sa folosesti site-ul legal si sa nu incerci sa ii perturbi functionarea sau securitatea.",
    ],
  },
  {
    id: "continut-informativ",
    heading: "Continut informativ, nu sfat",
    level: 2,
    body: [
      "Informatiile de pe site au caracter informativ si editorial. Ele nu constituie sfat juridic, financiar sau de alta natura. Deciziile de joc iti apartin.",
      "Depunem eforturi pentru acuratete si actualizare, insa termenii si ofertele operatorilor se pot schimba. Verifica intotdeauna informatiile direct la operator inainte de a juca.",
    ],
  },
  {
    id: "linkuri-afiliere",
    heading: "Linkuri de afiliere si catre terti",
    level: 2,
    body: [
      "Site-ul contine linkuri catre operatori terti, unele dintre ele fiind linkuri de afiliere care ne pot aduce un comision, fara cost suplimentar pentru tine. Detalii gasesti in Disclaimerul de afiliere.",
      "Nu raspundem pentru continutul, ofertele sau practicile site-urilor terte catre care facem trimitere.",
    ],
  },
  {
    id: "raspundere",
    heading: "Limitarea raspunderii",
    level: 2,
    body: [
      "Oferim informatiile ca atare, fara garantii privind caracterul complet sau neintrerupt al serviciului. In limitele permise de lege, nu raspundem pentru pierderi rezultate din participarea la jocuri de noroc sau din utilizarea informatiilor de pe site.",
    ],
  },
  {
    id: "proprietate",
    heading: "Proprietate intelectuala",
    level: 2,
    body: [
      "Continutul editorial al CasinOnline.ro (texte, structura, elemente grafice proprii) este protejat si nu poate fi reprodus fara acord. Marcile si logourile operatorilor apartin detinatorilor lor.",
    ],
  },
  {
    id: "responsabil",
    heading: "Joc responsabil si 18+",
    level: 2,
    body: [
      "Jocurile de noroc sunt permise doar persoanelor de peste 18 ani si pot crea dependenta. Joaca responsabil. Resurse de ajutor gasesti pe pagina Joc responsabil.",
    ],
  },
  {
    // NECESITA CONFIRMARE JURIDICA: legea aplicabila + mecanismul de solutionare a litigiilor.
    id: "modificari-lege",
    heading: "Modificari si lege aplicabila",
    level: 2,
    body: [
      "Putem actualiza acesti termeni, iar versiunea publicata pe aceasta pagina este cea in vigoare. Raporturile legate de utilizarea site-ului sunt guvernate de legislatia aplicabila din Romania.",
    ],
  },
  {
    id: "contact",
    heading: "Contact",
    level: 2,
    body: [`Pentru intrebari legate de acesti termeni, scrie-ne la ${company.email}.`],
  },
];

export default function Page() {
  return (
    <InstitutionalPage
      slug="termeni-si-conditii"
      title="Termeni si conditii"
      intro="Regulile de utilizare a site-ului CasinOnline.ro."
      sections={sections}
      schema={pageSchema("WebPage", {
        name: "Termeni si conditii",
        description: "Termenii de utilizare a platformei CasinOnline.ro.",
        path: "/termeni-si-conditii",
      })}
    >
      <nav aria-label="Pagini utile" className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm text-link">
        <Link href="/disclaimer-afiliere" className="hover:text-link-hover">Disclaimer afiliere</Link>
        <Link href="/politica-de-confidentialitate" className="hover:text-link-hover">Confidentialitate</Link>
        <Link href="/licente-si-reglementare" className="hover:text-link-hover">Licente si reglementare</Link>
      </nav>
    </InstitutionalPage>
  );
}
