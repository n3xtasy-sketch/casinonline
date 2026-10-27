import type { Metadata } from "next";
import { InstitutionalPage } from "@/components/layout/InstitutionalPage";
import { institutionalMetadata } from "@/lib/institutional";
import { pageSchema } from "@/lib/schema";
import type { GuideSection } from "@/types/guide";

export const metadata: Metadata = institutionalMetadata({
  slug: "joc-responsabil",
  title: "Joc responsabil — ajutor si autoexcludere",
  description:
    "Joaca responsabil: semne de alarma, optiuni de autoexcludere la operatorii ONJN si resurse de ajutor gratuite. Jocurile de noroc sunt doar pentru 18+.",
});

const sections: GuideSection[] = [
  {
    id: "doar-18-plus",
    heading: "Doar pentru persoane de peste 18 ani",
    level: 2,
    body: [
      "Jocurile de noroc sunt destinate exclusiv persoanelor cu varsta de minimum 18 ani. Ele trebuie privite ca o forma de divertisment, nu ca o sursa de venit.",
    ],
  },
  {
    id: "riscuri",
    heading: "Riscurile jocurilor de noroc",
    level: 2,
    body: [
      "Jocurile de noroc pot crea dependenta si pot duce la pierderi financiare. Jocul pe bani implica intotdeauna un risc, iar casa are un avantaj matematic pe termen lung.",
    ],
  },
  {
    id: "semne",
    heading: "Semne ca jocul devine o problema",
    level: 2,
    body: [
      "Joci cu bani destinati cheltuielilor esentiale.",
      "Petreci din ce in ce mai mult timp jucand.",
      "Te simti anxios sau iritat cand nu joci.",
      "Incerci sa recuperezi pierderile jucand si mai mult.",
      "Ascunzi activitatea de joc fata de cei apropiati.",
      "Imprumuti bani sau vinzi lucruri ca sa poti juca.",
    ],
  },
  {
    id: "limite",
    heading: "Stabileste-ti limite",
    level: 2,
    body: [
      "Stabileste un buget si un timp maxim inainte de a juca si respecta-le. Operatorii licentiati ONJN ofera, in contul de jucator, optiuni pentru limite de depunere, de pierdere si de timp.",
    ],
  },
  {
    id: "autoexcludere",
    heading: "Autoexcludere",
    level: 2,
    body: [
      "Toti operatorii licentiati ONJN sunt obligati sa ofere optiuni de autoexcludere. La nivel national exista si Registrul National al Jucatorilor Exclusi, prin care poti cere excluderea de la operatorii licentiati.",
    ],
  },
  {
    id: "ajutor",
    heading: "Unde poti cere ajutor",
    level: 2,
    body: [
      "Joc Responsabil Romania: linie de ajutor gratuita 0800 800 020, disponibila non-stop (jocresponsabil.ro).",
      "Oficiul National pentru Jocuri de Noroc (ONJN): onjn.gov.ro.",
      "Gamblers Anonymous: comunitate internationala de sprijin (gamblersanonymous.org).",
    ],
  },
];

export default function Page() {
  return (
    <InstitutionalPage
      slug="joc-responsabil"
      title="Joc responsabil"
      intro="Jocurile de noroc trebuie sa ramana o forma de divertisment. Daca simti ca jocul devine o problema, exista ajutor."
      sections={sections}
      schema={pageSchema("WebPage", {
        name: "Joc responsabil",
        description: "Informatii despre jocul responsabil, autoexcludere si resurse de ajutor din Romania.",
        path: "/joc-responsabil",
      })}
    />
  );
}
