import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { listSeoProjects } from "@/lib/db/admin-seo-research";
import { SeoProjectForm } from "@/components/admin/SeoProjectForm";

export const metadata = { title: "SEO Research — Admin" };

export default async function SeoResearchPage() {
  const projects = await listSeoProjects();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">SEO Research</h1>
        <p className="mt-1 max-w-[70ch] text-sm text-ink-secondary">
          Cercetare de keyworduri pentru conținut editorial. Importă date Ahrefs, grupează în clustere și
          pregătește brief-uri — totul cu verificare umană, fără publicare automată. (Importul CSV și
          clustering-ul sosesc în etapele următoare.)
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">Proiect nou</h2>
        <SeoProjectForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-ink">Proiecte de research</h2>
        {projects.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface p-8 text-center text-sm text-ink-muted">
            Niciun proiect încă. Creează primul proiect de research mai sus pentru a începe.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/seo-research/${p.id}`}
                  className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface px-4 py-3 transition-colors hover:border-border-strong"
                >
                  <span className="flex flex-col">
                    <span className="font-medium text-ink">{p.name}</span>
                    <span className="text-xs text-ink-muted">Țară: {p.defaultCountry.toUpperCase()}</span>
                  </span>
                  <ChevronRight size={16} className="text-ink-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
