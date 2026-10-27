import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalPage } from "@/components/layout/InstitutionalPage";
import { institutionalMetadata } from "@/lib/institutional";
import { pageSchema } from "@/lib/schema";
import { company, infrastructure } from "@/lib/company";
import type { GuideSection } from "@/types/guide";

// ready:true (FAZA 4.2C): owner confirmed the data controller, Supabase region
// (Frankfurt/eu-central-1), Vercel hosting, public signups OFF, and a functional
// contact email. Copy uses ONLY confirmed facts + lawful general phrasing — no
// invented retention periods or legal bases. A detailed legal review of bases +
// exact retention remains recommended (non-blocking; nothing speculative is asserted).
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
      "Aplicatia CasinOnline.ro nu stocheaza date personale ale vizitatorilor publici: nu exista conturi de utilizator public (inregistrarile publice sunt dezactivate), formulare de inregistrare, newsletter sau instrumente proprii de analiza a traficului.",
      "Acest lucru nu inseamna ca nu se prelucreaza deloc date. Ca la orice site, anumite date tehnice (de exemplu adresa IP si tipul de browser) pot fi procesate de furnizorii de infrastructura pentru functionarea si securitatea serviciului, asa cum este descris mai jos.",
      "Pentru utilizatorii administrativi (echipa care gestioneaza continutul) prelucram adresa de email si datele de autentificare, precum si un jurnal al actiunilor administrative. Nu exista inregistrare publica de conturi.",
      "Daca ne scrii pe email, prelucram datele din mesaj (adresa de email si continutul) pentru a-ti raspunde.",
    ],
  },
  {
    id: "furnizori",
    heading: "Furnizori si date tehnice procesate",
    level: 2,
    body: [
      `${infrastructure.vercel.name}: ${infrastructure.vercel.role} ${infrastructure.vercel.note}`,
      `${infrastructure.supabase.name}: ${infrastructure.supabase.role} Proiectul de productie este gazduit in regiunea ${infrastructure.supabase.region}. ${infrastructure.supabase.note}`,
      `${infrastructure.fonts.name}: ${infrastructure.fonts.role} ${infrastructure.fonts.note}`,
      infrastructure.euCaveat,
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
    id: "transferuri",
    heading: "Localizarea si transferurile de date",
    level: 2,
    body: [
      `Baza de date de productie este gazduita in ${infrastructure.supabase.region}. Datele tehnice pot fi procesate de furnizorii de infrastructura mentionati, in conformitate cu politicile si masurile de protectie ale acestora.`,
      infrastructure.euCaveat,
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
