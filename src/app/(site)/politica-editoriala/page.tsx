import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalPage } from "@/components/layout/InstitutionalPage";
import { institutionalMetadata } from "@/lib/institutional";
import { pageSchema } from "@/lib/schema";
import { company } from "@/lib/company";
import type { GuideSection } from "@/types/guide";

export const metadata: Metadata = institutionalMetadata({
  slug: "politica-editoriala",
  title: "Politica editoriala CasinOnline.ro",
  description:
    "Principiile si procesul prin care cream, verificam si actualizam continutul CasinOnline.ro, independent de operatori.",
});

const sections: GuideSection[] = [
  {
    id: "principii",
    heading: "Principiile noastre editoriale",
    level: 2,
    body: [
      "Lucram dupa cateva principii simple: onestitate, transparenta si informatii verificabile. Prezentam atat avantajele, cat si dezavantajele, si separam clar continutul editorial de relatiile comerciale.",
    ],
  },
  {
    id: "documentare",
    heading: "Cum documentam informatiile",
    level: 2,
    body: [
      "Ne bazam pe surse oficiale: termenii si conditiile operatorilor, informatiile publice despre licente si datele furnizorilor de jocuri. Verificam licentele pe site-ul ONJN inainte de a prezenta un operator.",
    ],
  },
  {
    id: "redactare",
    heading: "Cum redactam recenziile",
    level: 2,
    body: [
      "Fiecare recenzie urmeaza metodologia noastra de evaluare si acopera aceleasi categorii de informatii, pentru a fi usor de comparat. Scriem clar, fara exagerari si fara promisiuni nerealiste.",
    ],
  },
  {
    id: "autori-verificatori",
    heading: "Autorii si verificatorii",
    level: 2,
    body: [
      "Continutul este redactat de un autor si revizuit de un verificator inainte de publicare. Rolul verificatorului este sa confirme acuratetea informatiilor si respectarea standardelor editoriale.",
    ],
  },
  {
    id: "verificare-oferte",
    heading: "Cum verificam ofertele si bonusurile",
    level: 2,
    body: [
      "Verificam termenii bonusurilor direct la sursa: valoarea, cerintele de rulaj, valabilitatea, jocurile eligibile si eventualele restrictii. Cand un operator schimba o oferta, actualizam informatia.",
    ],
  },
  {
    id: "actualizare",
    heading: "Cum actualizam continutul",
    level: 2,
    body: [
      "Afisam data ultimei actualizari pe materialele relevante. Revizuim periodic informatiile si le actualizam cand apar modificari importante. Retragem imediat operatorii care isi pierd licenta ONJN.",
    ],
  },
  {
    id: "corectii",
    heading: "Cum corectam informatiile gresite",
    level: 2,
    body: [
      `Daca o informatie este inexacta, o poti semnala la ${company.email}. Analizam sesizarea si corectam informatiile confirmate cat mai repede posibil.`,
    ],
  },
  {
    id: "independenta",
    heading: "Independenta fata de operatori",
    level: 2,
    body: [
      "Nu acceptam plata pentru recenzii pozitive si nu modificam evaluarile la cererea operatorilor. Publicam si observatii negative atunci cand sunt justificate.",
    ],
  },
  {
    id: "afiliere",
    heading: "Transparenta afilierii",
    level: 2,
    body: [
      "Unele linkuri catre operatori sunt linkuri de afiliere si pot genera un comision, fara cost suplimentar pentru utilizator. Aceste comisioane nu influenteaza evaluarile editoriale.",
    ],
  },
];

export default function Page() {
  return (
    <InstitutionalPage
      slug="politica-editoriala"
      title="Politica editoriala CasinOnline.ro"
      intro="Asa cream, verificam si actualizam continutul, independent de operatorii pe care ii prezentam."
      sections={sections}
      schema={pageSchema("WebPage", {
        name: "Politica editoriala CasinOnline.ro",
        description: "Principiile, procesul editorial si regulile de independenta ale CasinOnline.ro.",
        path: "/politica-editoriala",
      })}
    >
      <nav aria-label="Pagini utile" className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm text-link">
        <Link href="/cum-evaluam-cazinourile" className="hover:text-link-hover">Cum evaluam cazinourile</Link>
        <Link href="/autori" className="hover:text-link-hover">Echipa editoriala</Link>
        <Link href="/licente-si-reglementare" className="hover:text-link-hover">Licente si reglementare</Link>
      </nav>
    </InstitutionalPage>
  );
}
