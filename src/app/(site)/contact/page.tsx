import type { Metadata } from "next";
import { InstitutionalPage } from "@/components/layout/InstitutionalPage";
import { institutionalMetadata } from "@/lib/institutional";
import { pageSchema } from "@/lib/schema";
import { company } from "@/lib/company";
import type { GuideSection } from "@/types/guide";

export const metadata: Metadata = institutionalMetadata({
  slug: "contact",
  title: "Contact CasinOnline.ro",
  description:
    "Contacteaza echipa CasinOnline.ro pentru sesizari de continut, solicitari editoriale, parteneriate sau cereri privind datele personale.",
});

const sections: GuideSection[] = [
  {
    id: "cum-ne-contactezi",
    heading: "Cum ne poti contacta",
    level: 2,
    body: [
      `Ne poti scrie oricand la adresa ${company.email}. Este canalul principal de comunicare pentru orice solicitare legata de CasinOnline.ro.`,
    ],
  },
  {
    id: "sesizari-continut",
    heading: "Sesizarea informatiilor incorecte",
    level: 2,
    body: [
      "Daca ai observat o informatie inexacta sau neactualizata intr-o recenzie, intr-un bonus sau intr-un ghid, trimite-ne un mesaj cu pagina si detaliul respectiv. Corectam informatiile confirmate cat mai repede posibil.",
    ],
  },
  {
    id: "solicitari-editoriale",
    heading: "Solicitari editoriale",
    level: 2,
    body: [
      "Pentru intrebari despre modul in care redactam continutul, despre metodologia de evaluare sau despre echipa editoriala, foloseste aceeasi adresa de email.",
    ],
  },
  {
    id: "parteneriate",
    heading: "Parteneriate comerciale",
    level: 2,
    body: [
      "Pentru propuneri de colaborare sau parteneriate, scrie-ne cu detaliile propunerii. Relatiile comerciale nu influenteaza continutul editorial.",
    ],
  },
  {
    id: "date-personale",
    heading: "Solicitari privind datele personale",
    level: 2,
    body: [
      "Pentru cereri legate de datele personale (acces, rectificare, stergere), trimite solicitarea la adresa de contact. Vei primi raspuns in conformitate cu legislatia aplicabila privind protectia datelor.",
    ],
  },
  {
    id: "date-companie",
    heading: "Datele companiei",
    level: 2,
    body: [
      `CasinOnline.ro este operat de ${company.legalName}.`,
      `CUI: ${company.cui}. Numar Registrul Comertului: ${company.regCom}.`,
      `Sediul social: ${company.address}.`,
    ],
  },
];

export default function Page() {
  return (
    <InstitutionalPage
      slug="contact"
      title="Contact CasinOnline.ro"
      intro="Pentru orice intrebare, sesizare sau propunere, suntem la un email distanta."
      sections={sections}
      schema={pageSchema("ContactPage", {
        name: "Contact CasinOnline.ro",
        description: "Date de contact si tipurile de solicitari pe care le poti trimite echipei CasinOnline.ro.",
        path: "/contact",
      })}
    >
      <p className="border-t border-border pt-6 text-sm">
        <span className="font-semibold text-ink">Email: </span>
        <a href={`mailto:${company.email}`} className="text-link hover:text-link-hover">
          {company.email}
        </a>
      </p>
    </InstitutionalPage>
  );
}
