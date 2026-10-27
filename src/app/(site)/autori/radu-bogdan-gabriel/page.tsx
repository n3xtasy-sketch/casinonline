import type { Metadata } from "next";
import { AuthorProfile } from "@/components/layout/AuthorProfile";

export const metadata: Metadata = {
  title: "Radu Bogdan Gabriel — autor CasinOnline.ro",
  description:
    "Autor specializat in cazinouri online, bonusuri si afiliere iGaming, cu studii de marketing la ASE Bucuresti si experienta internationala.",
  alternates: { canonical: "/autori/radu-bogdan-gabriel" },
  openGraph: {
    type: "profile",
    title: "Radu Bogdan Gabriel — autor CasinOnline.ro",
    description: "Autor specializat in cazinouri online, bonusuri si afiliere iGaming.",
    url: "/autori/radu-bogdan-gabriel",
  },
};

export default function Page() {
  return <AuthorProfile slug="radu-bogdan-gabriel" />;
}
