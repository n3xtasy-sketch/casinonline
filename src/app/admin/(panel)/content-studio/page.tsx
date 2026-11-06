import { listSeoProjects } from "@/lib/db/admin-seo-research";
import { ContentStudio } from "@/components/admin/ContentStudio";

export const metadata = { title: "AI Content Studio — Admin" };

export default async function ContentStudioPage() {
  const projects = await listSeoProjects();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ink">AI Content Studio</h1>
        <p className="max-w-[72ch] text-sm text-ink-secondary">
          Generează o secțiune SEO dintr-un brief real, pe baza datelor verificate din CMS. Conținutul este
          editabil și NU se salvează automat — integrarea cu CMS (draft) + istoricul vin ulterior.
        </p>
      </div>
      <ContentStudio projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
    </div>
  );
}
