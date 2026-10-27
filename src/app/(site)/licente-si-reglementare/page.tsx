import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalPage } from "@/components/layout/InstitutionalPage";
import { institutionalMetadata } from "@/lib/institutional";
import { pageSchema } from "@/lib/schema";
import type { GuideSection } from "@/types/guide";

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
    id: "verificarea-licentelor",
    heading: "Cum pot fi verificate licentele operatorilor",
    level: 2,
    body: [
      "Licentele operatorilor pot fi verificate pe site-ul oficial ONJN, onjn.gov.ro, unde sunt publicate listele operatorilor autorizati. Recomandam jucatorilor sa verifice intotdeauna statutul unui operator inainte de a-si crea cont.",
    ],
  },
  {
    id: "operator-vs-afiliat",
    heading: "Diferenta dintre operator si site afiliat",
    level: 2,
    body: [
      "Un operator de jocuri de noroc organizeaza efectiv jocurile si detine licenta ONJN pentru aceasta activitate. Un site afiliat, cum este CasinOnline.ro, este o platforma de informare care prezinta operatori si poate primi comisioane din linkuri de afiliere.",
      "CasinOnline.ro nu este operator de jocuri de noroc si nu organizeaza jocuri sau pariuri.",
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
      "CasinOnline.ro este o platforma de informare despre cazinouri online, nu un operator de jocuri de noroc. Nu detinem si nu revendicam o licenta de organizare a jocurilor de noroc.",
      "Nu transferam catre acest domeniu documente de autorizare emise pentru alte proiecte. Orice aspect legat de autorizarea proprie va fi comunicat doar dupa confirmarea aplicabilitatii pentru domeniul CasinOnline.ro.",
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
