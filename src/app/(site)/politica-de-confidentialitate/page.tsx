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
    heading: "Ce date prelucram, pe scurt",
    level: 2,
    body: [
      "Aplicatia CasinOnline.ro nu stocheaza date personale ale vizitatorilor publici: nu exista conturi de utilizator public (inregistrarile publice sunt dezactivate), formulare de inregistrare, newsletter sau instrumente proprii de analiza a traficului.",
      "Acest lucru nu inseamna ca nu se prelucreaza deloc date. Anumite date tehnice (de exemplu adresa IP si tipul de browser) pot fi procesate de furnizorii de infrastructura pentru functionarea si securitatea serviciului. Mai jos detaliem fiecare activitate de prelucrare.",
    ],
  },
  {
    id: "activitati",
    heading: "Activitatile de prelucrare",
    level: 2,
    body: [
      "Pentru fiecare activitate indicam ce date sunt implicate, scopul, cine le poate procesa si cat timp sunt pastrate. Perioadele exacte si temeiurile juridice detaliate sunt in curs de definitivare si vor fi completate dupa finalizarea verificarilor; nu publicam aici informatii neconfirmate.",
    ],
  },
  {
    id: "autentificare",
    heading: "Autentificarea administratorilor",
    level: 3,
    body: [
      "Date: adresa de email si datele de autentificare ale membrilor echipei, token de sesiune.",
      "Scop: acces securizat la administrarea continutului. Nu exista inregistrare publica de conturi.",
      "Destinatari: Supabase, ca furnizor de autentificare. Pastrare: pe durata relatiei cu administratorul si conform obligatiilor legale aplicabile.",
    ],
  },
  {
    id: "jurnal",
    heading: "Jurnalul de activitate administrativa",
    level: 3,
    body: [
      "Date: identificatorul si adresa de email ale administratorului, actiunea efectuata si data.",
      "Scop: securitate, audit intern si responsabilitate editoriala. Pastrare: pe durata necesara acestor scopuri de securitate si audit.",
      "Destinatari: Supabase, ca furnizor al bazei de date.",
    ],
  },
  {
    id: "email",
    heading: "Emailuri de contact",
    level: 3,
    body: [
      "Date: adresa ta de email si continutul mesajului trimis.",
      "Scop: a raspunde solicitarilor tale. Pastrare: pe durata necesara solutionarii solicitarii si conform obligatiilor legale aplicabile.",
      "Destinatari: furnizorul serviciului de email folosit pentru adresa de contact.",
    ],
  },
  {
    id: "hosting",
    heading: "Gazduire (Vercel)",
    level: 3,
    body: [
      "Date tehnice: adresa IP, user-agent, loguri de acces generate la livrarea site-ului.",
      "Scop: livrarea, functionarea si securitatea site-ului. Destinatar: Vercel, in calitate de furnizor de gazduire.",
      "Pastrare: conform politicilor Vercel. Transfer: anumite operatiuni pot avea loc in afara UE, conform politicilor furnizorului.",
    ],
  },
  {
    id: "supabase",
    heading: "Baza de date, autentificare si imagini (Supabase)",
    level: 3,
    body: [
      "Date: datele administrative de mai sus, precum si adresa IP si user-agent trimise la incarcarea imaginilor din CDN.",
      `Scop: baza de date, autentificare si livrarea imaginilor. Localizare: proiectul de productie este gazduit in regiunea ${infrastructure.supabase.region}.`,
      "Destinatar: Supabase, in calitate de furnizor. Transfer: vezi sectiunea despre localizare si transferuri.",
    ],
  },
  {
    id: "demo",
    heading: "Continut extern pentru jocuri demo",
    level: 3,
    body: [
      "In prezent nu este activat niciun furnizor de continut demo extern, asa ca nu se incarca astfel de continut.",
      "Daca un furnizor va fi activat in viitor, continutul demo se va incarca doar dupa o actiune explicita a ta (apasarea butonului de redare), iar furnizorul respectiv va actiona ca operator separat, cu propriile tehnologii.",
    ],
  },
  {
    id: "afiliere",
    heading: "Redirecturi de afiliere",
    level: 3,
    body: [
      "Cand accesezi un link catre un operator, folosim o ruta interna de redirectionare. Nu transmitem date personale si nici identificatori catre operator prin aceasta redirectionare.",
      "Dupa redirectionare, ajungi pe site-ul operatorului, care devine operator de date separat si isi prelucreaza datele conform propriilor politici.",
    ],
  },
  {
    id: "temeiuri",
    heading: "Scopuri, temeiuri si decizii automate",
    level: 2,
    body: [
      "Prelucram datele in scopul functionarii si securitatii site-ului, al administrarii continutului si al raspunderii la solicitari. Temeiurile juridice detaliate sunt in curs de finalizare; prelucrarea se realizeaza in limitele cadrului legal aplicabil privind protectia datelor.",
      "Nu luam decizii automate cu efect semnificativ asupra ta si nu realizam profilare.",
    ],
  },
  {
    id: "furnizori",
    heading: "Furnizori si relatia de prelucrare",
    level: 2,
    body: [
      `${infrastructure.vercel.name} si ${infrastructure.supabase.name} actioneaza ca furnizori care proceseaza date in numele nostru, conform termenilor de prelucrare a datelor publicati de fiecare dintre ei. Pot exista subimputerniciti ai acestor furnizori.`,
      `${infrastructure.fonts.name}: ${infrastructure.fonts.role} ${infrastructure.fonts.note}`,
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
