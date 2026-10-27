import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalPage } from "@/components/layout/InstitutionalPage";
import { institutionalMetadata } from "@/lib/institutional";
import { pageSchema } from "@/lib/schema";
import { company, infrastructure } from "@/lib/company";
import type { GuideSection } from "@/types/guide";

// ready:false in the registry → this route 404s until legal review confirms the
// retention periods, legal bases and hosting regions (see report). Visible copy below
// uses only confirmed facts + lawful general phrasing; no fabricated specifics.
export const metadata: Metadata = institutionalMetadata({
  slug: "politica-de-confidentialitate",
  title: "Politica de confidentialitate — CasinOnline.ro",
  description:
    "Cum sunt prelucrate datele pe CasinOnline.ro: ce stocheaza aplicatia, ce date tehnice proceseaza furnizorii de infrastructura si drepturile tale GDPR.",
});

const sections: GuideSection[] = [
  {
    id: "operatorul",
    heading: "Operatorul de date",
    level: 2,
    body: [
      `Site-ul CasinOnline.ro este operat de ${company.legalName}, CUI ${company.cui}, inregistrata la Registrul Comertului cu numarul ${company.regCom}, cu sediul in ${company.address}.`,
      `Pentru orice intrebare legata de date personale, ne poti scrie la ${company.email}.`,
    ],
  },
  {
    id: "ce-date",
    heading: "Ce date prelucram",
    level: 2,
    body: [
      "Aplicatia CasinOnline.ro nu stocheaza date personale ale vizitatorilor publici: nu exista conturi de utilizator public, formulare de inregistrare, newsletter sau instrumente proprii de analiza a traficului.",
      "Acest lucru nu inseamna ca nu se prelucreaza deloc date tehnice. Ca la orice site, anumite date tehnice (de exemplu adresa IP si tipul de browser) pot fi procesate de furnizorii de infrastructura pentru functionarea si securitatea serviciului, asa cum este descris mai jos.",
      "Pentru utilizatorii administrativi (echipa care gestioneaza continutul) prelucram adresa de email si datele de autentificare, precum si un jurnal al actiunilor administrative.",
    ],
  },
  {
    id: "furnizori",
    heading: "Furnizori si date tehnice procesate",
    level: 2,
    body: [
      `${infrastructure.vercel.name}: ${infrastructure.vercel.role} ${infrastructure.vercel.note}`,
      `${infrastructure.supabase.name}: ${infrastructure.supabase.role} ${infrastructure.supabase.note}`,
      `${infrastructure.fonts.name}: ${infrastructure.fonts.role} ${infrastructure.fonts.note}`,
    ],
  },
  {
    id: "linkuri-externe",
    heading: "Linkuri catre operatori si continut incorporat",
    level: 2,
    body: [
      "Cand accesezi un link catre un operator, parasesti CasinOnline.ro si intri pe site-ul operatorului, care isi prelucreaza datele conform propriilor politici. Noi nu transmitem date personale catre operatori prin redirectionare.",
      "Unele pagini pot incorpora continut de la furnizori externi (de exemplu versiuni demo de jocuri), care se incarca doar dupa o actiune explicita a ta si pot folosi propriile tehnologii.",
    ],
  },
  {
    id: "temeiuri",
    heading: "Scopuri si temeiuri",
    level: 2,
    body: [
      "Prelucram date in scopul functionarii si securitatii site-ului, al administrarii continutului si al raspunderii la solicitarile primite prin email. Prelucrarea se realizeaza in limitele cadrului legal aplicabil privind protectia datelor.",
    ],
  },
  {
    // NECESITA CONFIRMARE: perioade exacte de retentie (app + loguri Vercel/Supabase).
    id: "retentie",
    heading: "Pastrarea datelor",
    level: 2,
    body: [
      "Pastram datele doar pe durata necesara scopurilor pentru care au fost colectate si in conformitate cu obligatiile legale aplicabile. Logurile tehnice ale furnizorilor de infrastructura sunt pastrate conform politicilor acestora.",
    ],
  },
  {
    // NECESITA CONFIRMARE: regiunea de gazduire (Supabase/Vercel) pentru transferuri.
    id: "transferuri",
    heading: "Transferuri de date",
    level: 2,
    body: [
      "Datele tehnice pot fi procesate de furnizorii de infrastructura mentionati, in conformitate cu politicile si masurile de protectie ale acestora. Detaliile despre localizarea prelucrarii sunt cele comunicate de acesti furnizori.",
    ],
  },
  {
    id: "drepturi",
    heading: "Drepturile tale",
    level: 2,
    body: [
      "Conform legislatiei privind protectia datelor, ai dreptul de acces, rectificare, stergere, restrictionare, portabilitate si opozitie, in conditiile prevazute de lege.",
      `Pentru a-ti exercita aceste drepturi, scrie-ne la ${company.email}. De asemenea, te poti adresa Autoritatii Nationale de Supraveghere a Prelucrarii Datelor cu Caracter Personal (ANSPDCP).`,
    ],
  },
  {
    id: "cookies",
    heading: "Cookies",
    level: 2,
    body: [
      "Informatii despre modulele cookie folosite gasesti pe pagina Politica de cookies.",
    ],
  },
];

export default function Page() {
  return (
    <InstitutionalPage
      slug="politica-de-confidentialitate"
      title="Politica de confidentialitate"
      intro="Explicam ce date prelucram, cine le proceseaza si ce drepturi ai."
      sections={sections}
      schema={pageSchema("WebPage", {
        name: "Politica de confidentialitate",
        description: "Prelucrarea datelor pe CasinOnline.ro si drepturile utilizatorilor.",
        path: "/politica-de-confidentialitate",
      })}
    >
      <nav aria-label="Pagini utile" className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm text-link">
        <Link href="/politica-de-cookies" className="hover:text-link-hover">Politica de cookies</Link>
        <Link href="/termeni-si-conditii" className="hover:text-link-hover">Termeni si conditii</Link>
        <Link href="/contact" className="hover:text-link-hover">Contact</Link>
      </nav>
    </InstitutionalPage>
  );
}
