import type { Metadata } from "next";
import { AuthorProfile } from "@/components/layout/AuthorProfile";

export const metadata: Metadata = {
  title: "Radu Teodora Bianca — verificator editorial CasinOnline.ro",
  description:
    "Verificator de continut cu experienta in marketing digital si afiliere iGaming. Revizuieste materialele inainte de publicare.",
  alternates: { canonical: "/autori/radu-teodora-bianca" },
  openGraph: {
    type: "profile",
    title: "Radu Teodora Bianca — verificator editorial CasinOnline.ro",
    description: "Verificator de continut cu experienta in marketing digital si afiliere iGaming.",
    url: "/autori/radu-teodora-bianca",
  },
};

export default function Page() {
  return <AuthorProfile slug="radu-teodora-bianca" />;
}
