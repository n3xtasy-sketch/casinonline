import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalPage } from "@/components/layout/InstitutionalPage";
import { institutionalMetadata } from "@/lib/institutional";
import { pageSchema } from "@/lib/schema";
import { company } from "@/lib/company";
import type { GuideSection } from "@/types/guide";

export const metadata: Metadata = institutionalMetadata({
  slug: "despre-noi",
  title: "Despre CasinOnline.ro — cine suntem si ce facem",
  description:
    "Platforma independenta de informare despre cazinourile online licentiate din Romania, operata de SC Betting PRO Advertising SRL.",
});

const sections: GuideSection[] = [
  {
    id: "cine-suntem",
    heading: "Cine suntem",
    level: 2,
    body: [
      "CasinOnline.ro este un proiect editorial dedicat jucatorilor din Romania care cauta informatii clare despre cazinouri online, bonusuri, jocuri, furnizori si metode de plata.",
      `Platforma este operata de ${company.legalName}, aceeasi companie care opereaza si proiectul ${company.sisterSite.name}. Impartim aceeasi experienta in industria de gambling online din Romania.`,
    ],
  },
  {
    id: "ce-facem",
    heading: "Ce facem pe CasinOnline.ro",
    level: 2,
    body: [
      "Publicam recenzii de cazinouri, analize de bonusuri, prezentari de jocuri si furnizori, precum si informatii despre metodele de plata. Prezentam atat avantajele, cat si dezavantajele fiecarei oferte.",
      "CasinOnline.ro nu este operator de jocuri de noroc si nu organizeaza pariuri sau jocuri. Suntem o platforma de informare care prezinta exclusiv operatori licentiati de Oficiul National pentru Jocuri de Noroc (ONJN).",
    ],
  },
  {
    id: "misiunea-noastra",
    heading: "Misiunea noastra",
    level: 2,
    body: [
      "Ne propunem sa oferim informatii verificabile, actualizate si usor de inteles, astfel incat fiecare utilizator sa poata lua decizii informate. Punem accent pe claritate si pe utilitatea reala pentru jucator, nu pe promovare agresiva.",
    ],
  },
  {
    id: "echipa-editoriala",
    heading: "Echipa editoriala",
    level: 2,
    body: [
      "Aplicam un proces editorial in care continutul este redactat de un autor si trece printr-o verificare inainte de publicare. Poti afla cine scrie si cine verifica pe pagina dedicata echipei.",
    ],
  },
  {
    id: "independenta-editoriala",
    heading: "Independenta editoriala",
    level: 2,
    body: [
      "Recenziile si evaluarile noastre nu sunt influentate de operatori. Publicam si aspecte negative, chiar si pentru partenerii cu care avem relatii comerciale active, si nu modificam evaluarile la cererea operatorilor.",
    ],
  },
  {
    id: "cum-ne-finantam",
    heading: "Cum ne finantam",
    level: 2,
    body: [
      "Unele linkuri catre operatori sunt linkuri de afiliere. Daca accesezi un astfel de link si iti creezi un cont sau faci o depunere, putem primi un comision, fara costuri suplimentare pentru tine.",
      "Aceste comisioane sustin activitatea platformei, dar nu influenteaza in niciun fel evaluarile sau recomandarile editoriale.",
    ],
  },
  {
    id: "compania",
    heading: "Compania care opereaza CasinOnline.ro",
    level: 2,
    body: [
      `Platforma este operata de ${company.legalName}.`,
      `Cod unic de inregistrare (CUI): ${company.cui}.`,
      `Numar Registrul Comertului: ${company.regCom}.`,
      `Sediul social: ${company.address}.`,
      `Ne poti contacta la adresa ${company.email}.`,
    ],
  },
  {
    id: "transparenta-responsabilitate",
    heading: "Transparenta si responsabilitate",
    level: 2,
    body: [
      "Jocurile de noroc sunt destinate exclusiv persoanelor de peste 18 ani si pot crea dependenta. Incurajam jocul responsabil si oferim resurse de ajutor pentru cine are nevoie.",
    ],
  },
];

export default function Page() {
  return (
    <InstitutionalPage
      slug="despre-noi"
      title="Despre CasinOnline.ro"
      intro="CasinOnline.ro este o platforma independenta de informare despre cazinourile online licentiate din Romania."
      sections={sections}
      schema={pageSchema("AboutPage", {
        name: "Despre CasinOnline.ro",
        description: "Cine opereaza CasinOnline.ro, ce publicam si cum ne finantam.",
        path: "/despre-noi",
      })}
    >
      <nav aria-label="Pagini utile" className="flex flex-col gap-2 border-t border-border pt-6 text-sm">
        <span className="font-semibold text-ink">Afla mai multe</span>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-link">
          <li><Link href="/autori" className="hover:text-link-hover">Echipa editoriala</Link></li>
          <li><Link href="/politica-editoriala" className="hover:text-link-hover">Politica editoriala</Link></li>
          <li><Link href="/cum-evaluam-cazinourile" className="hover:text-link-hover">Cum evaluam cazinourile</Link></li>
          <li><Link href="/licente-si-reglementare" className="hover:text-link-hover">Licente si reglementare</Link></li>
          <li><Link href="/contact" className="hover:text-link-hover">Contact</Link></li>
        </ul>
      </nav>
    </InstitutionalPage>
  );
}
