import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalPage } from "@/components/layout/InstitutionalPage";
import { institutionalMetadata } from "@/lib/institutional";
import { pageSchema } from "@/lib/schema";
import { company } from "@/lib/company";
import type { GuideSection } from "@/types/guide";

const lic = company.onjnAffiliateLicense;

export const metadata: Metadata = institutionalMetadata({
  slug: "disclaimer-afiliere",
  title: "Disclaimer afiliere — CasinOnline.ro",
  description:
    "Cum functioneaza afilierea pe CasinOnline.ro: unele linkuri pot genera comisioane, fara cost suplimentar pentru tine, si nu influenteaza evaluarile.",
});

const sections: GuideSection[] = [
  {
    id: "ce-inseamna-afiliere",
    heading: "Ce inseamna afiliere",
    level: 2,
    body: [
      "CasinOnline.ro este o platforma de informare si afiliere. Afilierea inseamna ca prezentam operatori de jocuri de noroc licentiati si includem linkuri catre acestia. Nu suntem operator de jocuri de noroc si nu organizam jocuri sau pariuri.",
    ],
  },
  {
    id: "cum-castigam-comisioane",
    heading: "Cum castigam comisioane",
    level: 2,
    body: [
      "Unele dintre linkurile catre operatori sunt linkuri de afiliere. Daca accesezi un astfel de link si iti creezi un cont sau faci o depunere, putem primi un comision din partea operatorului.",
      "Acest comision nu presupune niciun cost suplimentar pentru tine. Pretul si conditiile ofertelor sunt aceleasi ca atunci cand accesezi operatorul direct.",
    ],
  },
  {
    id: "independenta",
    heading: "Comisioanele nu influenteaza evaluarile",
    level: 2,
    body: [
      "Relatiile de afiliere nu schimba modul in care evaluam operatorii. Nu acceptam plata pentru recenzii pozitive si nu modificam evaluarile la cererea operatorilor. Cand este cazul, prezentam si aspecte negative.",
    ],
  },
  {
    id: "operatori-licentiati",
    heading: "Promovam doar operatori licentiati ONJN",
    level: 2,
    body: [
      "Includem exclusiv operatori despre care intelegem ca detin o licenta ONJN valabila. Modul in care verificam licentele este descris pe pagina Licente si reglementare.",
    ],
  },
  {
    id: "licenta-afiliat",
    heading: "Licenta de afiliat a companiei",
    level: 2,
    body: [
      `CasinOnline.ro este operat de ${company.legalName}, care detine licenta ONJN de afiliat ${lic.label}, ${lic.source}. Este o licenta pentru activitatea de afiliere si informare, nu o licenta de organizare a jocurilor de noroc.`,
    ],
  },
  {
    id: "marcarea-linkurilor",
    heading: "Cum sunt marcate linkurile de afiliere",
    level: 2,
    body: [
      "Linkurile comerciale catre operatori sunt marcate tehnic ca linkuri sponsorizate (atributele sponsored si nofollow) si trec printr-o ruta interna de redirectionare. Nu transmitem date personale catre operatori prin aceasta redirectionare.",
    ],
  },
  {
    id: "responsabil",
    heading: "Joc responsabil si 18+",
    level: 2,
    body: [
      "Jocurile de noroc sunt destinate exclusiv persoanelor de peste 18 ani si pot crea dependenta. Joaca responsabil. Resurse de ajutor gasesti pe pagina Joc responsabil.",
    ],
  },
];

export default function Page() {
  return (
    <InstitutionalPage
      slug="disclaimer-afiliere"
      title="Disclaimer afiliere"
      intro="Suntem transparenti cu privire la modul in care functioneaza afilierea pe CasinOnline.ro."
      sections={sections}
      schema={pageSchema("WebPage", {
        name: "Disclaimer afiliere",
        description: "Cum functioneaza afilierea si comisioanele pe CasinOnline.ro.",
        path: "/disclaimer-afiliere",
      })}
    >
      <nav aria-label="Pagini utile" className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm text-link">
        <Link href="/licente-si-reglementare" className="hover:text-link-hover">Licente si reglementare</Link>
        <Link href="/politica-editoriala" className="hover:text-link-hover">Politica editoriala</Link>
        <Link href="/joc-responsabil" className="hover:text-link-hover">Joc responsabil</Link>
      </nav>
    </InstitutionalPage>
  );
}
