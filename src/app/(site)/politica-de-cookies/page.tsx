import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalPage } from "@/components/layout/InstitutionalPage";
import { institutionalMetadata } from "@/lib/institutional";
import { pageSchema } from "@/lib/schema";
import type { GuideSection } from "@/types/guide";

// ready:true (FAZA 4.2C): owner confirmed Vercel Web Analytics OFF + Speed Insights
// unconfigured, and the audit confirmed no GA/GTM/Meta Pixel in code. So no
// non-essential/consent-requiring technology runs for public visitors — only
// essential admin-auth cookies. No speculative claim; no cookie banner required.
export const metadata: Metadata = institutionalMetadata({
  slug: "politica-de-cookies",
  title: "Politica de cookies — CasinOnline.ro",
  description:
    "Ce module cookie foloseste CasinOnline.ro: doar cookie-uri esentiale de autentificare in zona administrativa. Vizitatorii publici nu primesc cookie-uri de la aplicatie.",
});

const sections: GuideSection[] = [
  {
    id: "ce-sunt",
    heading: "Ce sunt cookie-urile",
    level: 2,
    body: [
      "Cookie-urile sunt fisiere mici pe care un site le poate salva in browserul tau. Ele pot fi esentiale (necesare functionarii) sau neesentiale (de exemplu analiza sau marketing, care necesita consimtamant).",
    ],
  },
  {
    id: "ce-folosim",
    heading: "Ce folosim pe CasinOnline.ro",
    level: 2,
    body: [
      "Aplicatia foloseste doar cookie-uri esentiale de autentificare, si doar in zona administrativa a site-ului. Acestea sunt create dupa ce un membru al echipei se autentifica, pentru a mentine sesiunea.",
      "Vizitatorii publici, care nu se autentifica, nu primesc cookie-uri de la aplicatie si nu folosim stocare locala (localStorage/sessionStorage) pentru ei.",
    ],
  },
  {
    id: "fara-analytics",
    heading: "Fara cookie-uri de analiza sau marketing",
    level: 2,
    body: [
      "Nu folosim Google Analytics, Google Tag Manager, Meta Pixel sau alte instrumente proprii de analiza a traficului, si nici cookie-uri de marketing sau de publicitate.",
      "Serviciile de analiza ale platformei de gazduire (Vercel Web Analytics si Speed Insights) sunt dezactivate, respectiv neconfigurate. Prin urmare, pentru vizitatorii publici nu exista tehnologii neesentiale care sa necesite consimtamant, iar site-ul nu afiseaza un banner de cookies.",
    ],
  },
  {
    id: "fonturi",
    heading: "Fonturi",
    level: 2,
    body: [
      "Fonturile sunt servite din domeniul propriu (self-hosted). Nu se incarca fonturi de la servere externe si nu se seteaza cookie-uri pentru fonturi.",
    ],
  },
  {
    id: "continut-extern",
    heading: "Continut incorporat de la terti",
    level: 2,
    body: [
      "Unele pagini pot incorpora continut de la furnizori externi, de exemplu versiuni demo de jocuri. Acest continut se incarca doar dupa ce apesi explicit butonul de redare, iar furnizorul respectiv poate folosi propriile tehnologii, inclusiv cookie-uri, in cadrul acelui continut.",
    ],
  },
  {
    id: "control",
    heading: "Cum controlezi cookie-urile",
    level: 2,
    body: [
      "Poti gestiona sau sterge cookie-urile din setarile browserului tau. Majoritatea browserelor permit blocarea cookie-urilor sau stergerea celor existente. Blocarea cookie-urilor esentiale poate afecta functionarea zonei administrative, dar nu afecteaza navigarea publica.",
    ],
  },
];

export default function Page() {
  return (
    <InstitutionalPage
      slug="politica-de-cookies"
      title="Politica de cookies"
      intro="Folosim cat mai putine cookie-uri posibil. Iata exact ce foloseste site-ul."
      sections={sections}
      schema={pageSchema("WebPage", {
        name: "Politica de cookies",
        description: "Modulele cookie folosite de CasinOnline.ro si cum le poti controla.",
        path: "/politica-de-cookies",
      })}
    >
      <nav aria-label="Pagini utile" className="flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm text-link">
        <Link href="/politica-de-confidentialitate" className="hover:text-link-hover">Politica de confidentialitate</Link>
        <Link href="/contact" className="hover:text-link-hover">Contact</Link>
      </nav>
    </InstitutionalPage>
  );
}
