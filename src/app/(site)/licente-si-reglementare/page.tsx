import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalPage } from "@/components/layout/InstitutionalPage";
import { institutionalMetadata } from "@/lib/institutional";
import { pageSchema } from "@/lib/schema";
import { company } from "@/lib/company";
import type { GuideSection } from "@/types/guide";

const lic = company.onjnAffiliateLicense;

export const metadata: Metadata = institutionalMetadata({
  slug: "licente-si-reglementare",
  title: "Licente si reglementare ONJN — CasinOnline.ro",
  description:
    "Cum verificam licentele ONJN ale operatorilor pe care ii prezentam si ce inseamna reglementarea jocurilor de noroc in Romania.",
});

const sections: GuideSection[] = [
  {
    id: "rolul-onjn",
    heading: "Rolul ONJN in Romania",
    level: 2,
    body: [
      "Oficiul National pentru Jocuri de Noroc (ONJN) este autoritatea care reglementeaza si supravegheaza piata jocurilor de noroc din Romania. Operatorii care ofera legal servicii jucatorilor din Romania trebuie sa detina o licenta ONJN valabila.",
    ],
  },
  {
    id: "licenta-afiliat-companie",
    heading: "Licenta ONJN de afiliat a companiei",
    level: 2,
    body: [
      `CasinOnline.ro este operat de ${company.legalName}. Compania detine licenta ONJN de afiliat ${lic.label}, ${lic.source}.`,
      "O licenta de afiliat este o autorizatie pentru activitatea de promovare si informare legata de operatori de jocuri de noroc licentiati. Nu este o licenta de organizare a jocurilor de noroc.",
      "Sub aceasta licenta de afiliat, compania opereaza proiectele sale de informare, inclusiv CasinOnline.ro. Este o licenta la nivel de companie, nu o autorizare individuala separata a domeniului.",
    ],
  },
  {
    id: "verificarea-licentelor",
    heading: "Cum pot fi verificate licentele operatorilor",
    level: 2,
    body: [
      "Licentele operatorilor pot fi verificate pe site-ul oficial ONJN, onjn.gov.ro, unde sunt publicate listele operatorilor autorizati. Recomandam jucatorilor sa verifice intotdeauna statutul unui operator inainte de a-si crea cont.",
    ],
  },
  {
    id: "operator-vs-afiliat",
    heading: "Doua tipuri diferite de licenta ONJN",
    level: 2,
    body: [
      "Este important sa nu confunzi cele doua tipuri de licenta ONJN. Licenta de afiliat (precum cea a companiei noastre) acopera activitatea de promovare si informare despre operatori. Licenta de operator (pe care o detin cazinourile) acopera organizarea efectiva a jocurilor de noroc.",
      "Un operator de jocuri de noroc organizeaza jocurile si detine licenta ONJN de operare. Un site afiliat, cum este CasinOnline.ro, prezinta operatori si poate primi comisioane din linkuri de afiliere, pe baza licentei de afiliat.",
    ],
  },
  {
    id: "de-ce-conteaza",
    heading: "De ce este importanta verificarea licentei",
    level: 2,
    body: [
      "Un operator licentiat este supus regulilor ONJN privind protectia jucatorilor, inclusiv obligatiilor legate de joc responsabil si autoexcludere. Jocul la operatori nelicentiati nu ofera aceste protectii.",
    ],
  },
  {
    id: "ce-prezentam",
    heading: "Ce informatii despre licente prezentam in recenzii",
    level: 2,
    body: [
      "In recenzii indicam cadrul de licentiere al operatorului, pe baza informatiilor publice disponibile. Prezentam exclusiv operatori despre care intelegem ca sunt licentiati ONJN si retragem operatorii care isi pierd licenta.",
    ],
  },
  {
    id: "statutul-casinonline",
    heading: "Statutul CasinOnline.ro",
    level: 2,
    body: [
      `CasinOnline.ro este o platforma de informare si afiliere, operata de ${company.legalName} sub licenta ONJN de afiliat ${lic.label}. Nu suntem operator de jocuri de noroc si nu organizam jocuri sau pariuri.`,
      "Rolul nostru este sa informam jucatorii si sa ii directionam catre operatori licentiati ONJN, nu sa gazduim jocuri de noroc. Deciziile de joc apartin fiecarui utilizator.",
    ],
  },
  {
    id: "responsabilitatile-utilizatorilor",
    heading: "Responsabilitatile utilizatorilor",
    level: 2,
    body: [
      "Inainte de a juca, verifica licenta operatorului, citeste termenii ofertelor si joaca responsabil. Jocurile de noroc sunt permise doar persoanelor de peste 18 ani.",
    ],
  },
];

export default function Page() {
  return (
    <InstitutionalPage
      slug="licente-si-reglementare"
      title="Licente si reglementare"
      intro="Prezentam exclusiv operatori licentiati ONJN si explicam cum poti verifica singur statutul unui operator."
      sections={sections}
      schema={pageSchema("WebPage", {
        name: "Licente si reglementare",
        description: "Cadrul ONJN, verificarea licentelor si statutul CasinOnline.ro ca platforma de informare.",
        path: "/licente-si-reglementare",
      })}
    >
      <nav aria-label="Pagini utile" className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm text-link">
        <Link href="/joc-responsabil" className="hover:text-link-hover">Joc responsabil</Link>
        <Link href="/cum-evaluam-cazinourile" className="hover:text-link-hover">Cum evaluam cazinourile</Link>
        <Link href="/despre-noi" className="hover:text-link-hover">Despre noi</Link>
      </nav>
    </InstitutionalPage>
  );
}
