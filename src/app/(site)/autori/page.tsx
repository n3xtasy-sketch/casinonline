import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalPage } from "@/components/layout/InstitutionalPage";
import { institutionalMetadata } from "@/lib/institutional";
import { pageSchema } from "@/lib/schema";
import { readyAuthors } from "@/lib/authors";

export const metadata: Metadata = institutionalMetadata({
  slug: "autori",
  title: "Echipa editoriala CasinOnline.ro",
  description:
    "Cine scrie si cine verifica continutul CasinOnline.ro: autor cu experienta in iGaming si verificator cu experienta in marketing digital.",
});

export default function Page() {
  const authors = readyAuthors();

  return (
    <InstitutionalPage
      slug="autori"
      title="Echipa editoriala"
      intro="Continutul CasinOnline.ro este redactat de un autor si verificat de un editor inainte de publicare. Asa ne asiguram ca informatiile sunt corecte, clare si actualizate."
      schema={pageSchema("WebPage", {
        name: "Echipa editoriala CasinOnline.ro",
        description: "Autorii si verificatorii care redacteaza si valideaza continutul CasinOnline.ro.",
        path: "/autori",
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {authors.map((a) => (
          <Link
            key={a.slug}
            href={`/autori/${a.slug}`}
            className="flex flex-col gap-1.5 rounded-md border border-border bg-surface p-4 transition-colors hover:border-border-strong"
          >
            <span className="text-base font-semibold text-ink">{a.name}</span>
            <span className="text-[13px] font-medium text-ink-secondary">{a.role}</span>
            <span className="mt-1 text-sm leading-relaxed text-ink-muted">{a.tagline}</span>
            <span className="mt-1 text-[13px] text-link">Vezi profilul →</span>
          </Link>
        ))}
      </div>
    </InstitutionalPage>
  );
}
